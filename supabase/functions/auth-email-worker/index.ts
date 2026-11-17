// Sends Supabase Auth emails from auth_email_outbox through Resend's API
// (2026-11-16). The Send Email hook (public.queue_auth_email) only stores
// each email, so signup never waits on, or fails because of, email. This
// worker is woken by a trigger on insert and by auth-email-sweeper every
// minute, and retries with backoff (complete_auth_email) for about an hour.
//
// Since 2026-11-17 it also sends the admins' new-signup notice (type
// admin_new_signup), queued by a trigger on auth.users for every new account.
//
// Logs carry the row id, type and outcome only: never tokens or addresses.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isWorkerRequest } from "../_shared/guards.ts";
import { authEmailMessages, renderAuthEmail, type AuthEmailEvent } from "../_shared/auth-email-templates.ts";
import { adminRecipients } from "../_shared/admin-recipients.ts";
import {
  ADMIN_SIGNUP_NOTICE_TYPE,
  nameFromMetadata,
  renderAdminSignupNotice,
  type AdminSignupPayload,
} from "../_shared/admin-signup-notice.ts";

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

interface Rendered {
  subject: string;
  html: string;
  text: string;
}

function resendSetup() {
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!apiKey) throw new SendError("RESEND_API_KEY is not set", false, []);
  const from = Deno.env.get("AUTH_EMAIL_FROM")?.trim()
    || Deno.env.get("FROM_EMAIL")?.trim()
    || "Creatives Takeover <no-reply@creatives-takeover.com>";
  const sender = from.includes("<") ? from : `Creatives Takeover <${from}>`;
  return { apiKey, sender };
}

/** One Resend send; returns its id (or null) and throws SendError on failure. */
async function postToResend(rowId: string, index: number, to: string[], rendered: Rendered, sentSoFar: string[]): Promise<string | null> {
  const { apiKey, sender } = resendSetup();
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Same key on every retry: Resend sends each email at most once.
        "Idempotency-Key": `auth-email-${rowId}-${index}`,
      },
      body: JSON.stringify({ from: sender, to, subject: rendered.subject, html: rendered.html, text: rendered.text }),
    });
  } catch (error) {
    throw new SendError(`Resend request failed: ${error instanceof Error ? error.message : String(error)}`, false, sentSoFar);
  }
  const body = await response.text();
  if (!response.ok) {
    // 422 means Resend rejected this email itself (bad address, etc.):
    // retrying cannot help. Keys, limits and outages are retried.
    throw new SendError(`Resend ${response.status}: ${body.slice(0, 300)}`, response.status === 422, sentSoFar);
  }
  try {
    const id = JSON.parse(body)?.id;
    return typeof id === "string" ? id : null;
  } catch {
    return null; // Sent; the id is only for the record.
  }
}

async function sendAuthEmail(row: OutboxRow): Promise<string[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
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
    const id = await postToResend(row.id, index, [message.to], rendered, sentIds);
    if (id) sentIds.push(id);
  }
  return sentIds;
}

/** The admins' new-signup notice, rendered with the account as it is now. */
async function sendAdminSignupNotice(row: OutboxRow, db: SupabaseClient): Promise<string[]> {
  const stored = row.payload as unknown as AdminSignupPayload;
  if (!stored?.user_id) throw new SendError("No user id in the signup notice", true, []);
  const { data, error } = await db.auth.admin.getUserById(stored.user_id);
  const missing = Boolean(error) && (error as { status?: number }).status === 404;
  if (error && !missing) throw new SendError(`Could not read the new account: ${error.message}`, false, []);
  const user = missing ? null : data?.user ?? null;

  const rendered = renderAdminSignupNotice({
    email: user?.email ?? stored.email ?? "",
    name: nameFromMetadata(user?.user_metadata) ?? stored.full_name ?? null,
    provider: (user?.app_metadata?.provider as string | undefined) ?? stored.provider ?? null,
    confirmed: Boolean(user?.email_confirmed_at),
    createdAt: user?.created_at ?? stored.created_at ?? null,
    exists: Boolean(user),
  });
  const to = adminRecipients(Deno.env.get("ADMIN_NOTIFICATION_EMAILS"), "auth-email-worker");
  const id = await postToResend(row.id, 0, to, rendered, []);
  return id ? [id] : [];
}

function sendOne(row: OutboxRow, db: SupabaseClient): Promise<string[]> {
  return row.email_action_type === ADMIN_SIGNUP_NOTICE_TYPE ? sendAdminSignupNotice(row, db) : sendAuthEmail(row);
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
        const ids = await sendOne(row, db);
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
