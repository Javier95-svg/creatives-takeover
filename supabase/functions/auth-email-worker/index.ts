// Sends Supabase Auth emails from auth_email_outbox through Resend's API
// (2026-11-16). The Send Email hook (public.queue_auth_email) only stores
// each email, so signup never waits on, or fails because of, email. This
// worker is woken by a trigger on insert and by auth-email-sweeper every
// minute, and retries with backoff (complete_auth_email) for about an hour.
//
// Logs carry the row id, type and outcome only: never tokens or addresses.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isWorkerRequest } from "../_shared/guards.ts";
import { authEmailMessages, renderAuthEmail, type AuthEmailEvent } from "../_shared/auth-email-templates.ts";

const RUN_BUDGET_MS = 40_000;
const SEND_TIMEOUT_MS = 10_000;

interface OutboxRow {
  id: string;
  email_action_type: string;
  attempt_count: number;
  payload: AuthEmailEvent;
}

class SendError extends Error {
  constructor(message: string, readonly permanent: boolean, readonly sentIds: string[]) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function sendOne(row: OutboxRow): Promise<string[]> {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!apiKey) throw new SendError("RESEND_API_KEY is not set", false, []);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const from = Deno.env.get("AUTH_EMAIL_FROM")?.trim()
    || Deno.env.get("FROM_EMAIL")?.trim()
    || "Creatives Takeover <no-reply@creatives-takeover.com>";
  const sender = from.includes("<") ? from : `Creatives Takeover <${from}>`;

  const event = row.payload;
  const redirectTo = event.email_data.redirect_to || event.email_data.site_url || "https://creatives-takeover.com/";
  const messages = authEmailMessages(event);
  if (!messages.length) throw new SendError("No recipient in the auth event", true, []);

  const sentIds: string[] = [];
  for (const [index, message] of messages.entries()) {
    const rendered = renderAuthEmail({
      message,
      supabaseUrl,
      redirectTo,
      isCurrentAddressOfChange: message.type === "email_change" && messages.length === 2 && index === 0,
    });
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // Same key on every retry: Resend sends each email at most once.
          "Idempotency-Key": `auth-email-${row.id}-${index}`,
        },
        body: JSON.stringify({ from: sender, to: [message.to], subject: rendered.subject, html: rendered.html, text: rendered.text }),
      });
    } catch (error) {
      throw new SendError(`Resend request failed: ${error instanceof Error ? error.message : String(error)}`, false, sentIds);
    }
    const body = await response.text();
    if (!response.ok) {
      // 422 means Resend rejected this email itself (bad address, etc.):
      // retrying cannot help. Keys, limits and outages are retried.
      throw new SendError(`Resend ${response.status}: ${body.slice(0, 300)}`, response.status === 422, sentIds);
    }
    try {
      const id = JSON.parse(body)?.id;
      if (typeof id === "string") sentIds.push(id);
    } catch {
      // Sent; the id is only for the record.
    }
  }
  return sentIds;
}

serve(async (req) => {
  if (!(await isWorkerRequest(req))) return json({ error: "Forbidden" }, 403);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const started = Date.now();
  const tally = { sent: 0, retrying: 0, failed: 0 };

  while (Date.now() - started < RUN_BUDGET_MS) {
    const { data: rows, error } = await db.rpc("claim_auth_emails", { p_limit: 20 });
    if (error) {
      console.error("auth-email-worker: claim failed:", error.message);
      return json({ ok: false, error: error.message, ...tally }, 500);
    }
    if (!rows?.length) break;

    for (const row of rows as OutboxRow[]) {
      try {
        const ids = await sendOne(row);
        await db.rpc("complete_auth_email", { p_id: row.id, p_ok: true, p_resend_ids: ids });
        tally.sent++;
        console.log(`auth-email-worker: sent ${row.id} (${row.email_action_type}, attempt ${row.attempt_count})`);
      } catch (error) {
        const failure = error instanceof SendError ? error : new SendError(String(error), false, []);
        await db.rpc("complete_auth_email", {
          p_id: row.id, p_ok: false, p_resend_ids: failure.sentIds.length ? failure.sentIds : null,
          p_error: failure.message, p_permanent: failure.permanent,
        });
        if (failure.permanent) tally.failed++; else tally.retrying++;
        console.error(`auth-email-worker: ${failure.permanent ? "failed" : "will retry"} ${row.id} (${row.email_action_type}, attempt ${row.attempt_count}): ${failure.message.slice(0, 200)}`);
      }
    }
  }

  return json({ ok: true, ...tally });
});
