/**
 * process-icp-guest-drip
 *
 * Sends drip follow-up emails to guest users who captured their ICP Draft via
 * the fallback email form but haven't yet created an account.
 *
 * Schedule: run daily via pg_cron or Supabase scheduler:
 *   POST /functions/v1/process-icp-guest-drip  (service-role auth)
 *
 * Sequence:
 *   Email 1 (immediate) — sent by request-icp-draft-email, sets next_followup_at = +24h
 *   Email 2 (24h later) — "Your draft for [persona] is still waiting"
 *   Email 3 (48h later) — "Last call: unlock your ICP Draft before it expires"
 *   After email 3 — next_followup_at = NULL, sequence complete
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildFollowup1Html(args: {
  appUrl: string;
  resumeToken: string;
  personaName: string;
  roleLine: string;
  painLine: string;
}) {
  const { appUrl, resumeToken, personaName, roleLine, painLine } = args;
  const resumeUrl = `${appUrl}/icp-builder?resume=${encodeURIComponent(resumeToken)}`;

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700;">Your ICP Draft for ${escapeHtml(personaName)} is still waiting.</h1>
      <p style="margin: 0 0 16px; color: #334155;">
        You built a draft yesterday but didn't unlock it yet. It's still saved — one click and it's yours.
      </p>
      <div style="border: 1px solid #e2e8f0; border-radius: 20px; background: #f8fafc; padding: 20px; margin: 0 0 20px;">
        <p style="margin: 0; font-size: 17px; font-weight: 700;">${escapeHtml(personaName)}</p>
        <p style="margin: 6px 0 0; color: #475569; font-size: 14px;">${escapeHtml(roleLine)}</p>
        <p style="margin: 14px 0 0; color: #0f172a; font-size: 14px;"><strong>Core pain:</strong> "${escapeHtml(painLine)}"</p>
      </div>
      <p style="margin: 0 0 16px; color: #334155; font-size: 14px;">
        Create a free account to unlock the full report — competitor analysis, positioning, core features, and next actions.
      </p>
      <div style="margin: 24px 0;">
        <a href="${escapeHtml(resumeUrl)}" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Unlock my ICP Draft
        </a>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 13px;">Free forever. No credit card. The link restores the exact draft we built for you.</p>
    </div>
  `;
}

function buildFollowup2Html(args: {
  appUrl: string;
  resumeToken: string;
  personaName: string;
}) {
  const { appUrl, resumeToken, personaName } = args;
  const resumeUrl = `${appUrl}/icp-builder?resume=${encodeURIComponent(resumeToken)}`;

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700;">Last call: your ICP Draft expires soon.</h1>
      <p style="margin: 0 0 16px; color: #334155;">
        This is the last reminder for your <strong>${escapeHtml(personaName)}</strong> draft. After this, the link stops working.
      </p>
      <p style="margin: 0 0 16px; color: #334155;">
        3,200+ founders have used this to get clarity on exactly who they're building for — before writing a line of code or spending on ads.
      </p>
      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 16px; padding: 16px; margin: 0 0 20px;">
        <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">⏰ Your draft expires in under 24 hours.</p>
      </div>
      <div style="margin: 24px 0;">
        <a href="${escapeHtml(resumeUrl)}" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Unlock before it expires
        </a>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 13px;">Free account. No credit card. Takes 10 seconds.</p>
    </div>
  `;
}

interface GuestDraftRow {
  id: string;
  email: string;
  resume_token: string;
  artifact: Record<string, unknown>;
  followup_count: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appUrl = (Deno.env.get("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Missing environment config" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceClient = createClient(supabaseUrl, supabaseKey);
  const results = { sent: 0, skipped: 0, errors: 0 };

  // Fetch all rows where a follow-up is due and hasn't converted yet
  const { data: pendingRows, error: fetchError } = await serviceClient
    .from("icp_guest_drafts")
    .select("id, email, resume_token, artifact, followup_count")
    .lte("next_followup_at", new Date().toISOString())
    .lt("followup_count", 2)
    .is("converted_at", null)
    .not("delivered_at", "is", null)
    .gt("expires_at", new Date().toISOString());

  if (fetchError) {
    console.error("process-icp-guest-drip: fetch failed", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const row of (pendingRows ?? []) as GuestDraftRow[]) {
    try {
      const draft = (row.artifact as Record<string, unknown>)?.draftDocument as Record<string, unknown> | undefined;
      const customer = draft?.customer as Record<string, unknown> | undefined;
      const pain = draft?.pain as Record<string, unknown> | undefined;
      const personaName = (customer?.personaName as string | undefined) ?? "your customer";
      const roleLine = (customer?.roleLine as string | undefined) ?? "";
      const painLine = (pain?.quote as string | undefined) ?? "";

      const isLastEmail = row.followup_count === 1;

      const subject = isLastEmail
        ? `Last call: your ICP Draft expires soon`
        : `Your ICP Draft for ${personaName} is still waiting`;

      const html = isLastEmail
        ? buildFollowup2Html({ appUrl, resumeToken: row.resume_token, personaName })
        : buildFollowup1Html({ appUrl, resumeToken: row.resume_token, personaName, roleLine, painLine });

      await resend.emails.send({
        from: "Creatives Takeover <noreply@updates.creativestakeover.com>",
        to: [row.email],
        subject,
        html,
      });

      const nextFollowupAt = isLastEmail
        ? null
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await serviceClient
        .from("icp_guest_drafts")
        .update({
          followup_count: row.followup_count + 1,
          next_followup_at: nextFollowupAt,
        })
        .eq("id", row.id);

      results.sent++;
    } catch (err) {
      console.error("process-icp-guest-drip: failed for row", row.id, err);
      results.errors++;
    }
  }

  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
