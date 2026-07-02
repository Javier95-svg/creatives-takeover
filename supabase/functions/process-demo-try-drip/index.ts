/**
 * process-demo-try-drip
 *
 * Sends drip follow-up emails to visitors who generated a demo on
 * /demo-studio/try, left an email for a resume link, but haven't come back.
 *
 * Schedule: daily via pg_cron (20260702090100_schedule_demo_try_drip.sql).
 *
 * Sequence:
 *   Email 1 (immediate) — sent by demo-try-resume-email, sets next_followup_at = +24h
 *   Email 2 (24h later) — "Your interactive demo is still waiting"
 *   Email 3 (48h later) — "Last call: your demo link expires soon"
 *   After email 3 — next_followup_at = NULL, sequence complete
 *
 * Unlike the ICP guest drip this respects unsubscribed_at, and every email
 * carries an unsubscribe link (handled by demo-try-resume-email GET).
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

async function signUnsubscribeToken(leadId: string): Promise<string> {
  const secret = Deno.env.get("EMAIL_SEQUENCE_UNSUBSCRIBE_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(leadId));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function footerHtml(unsubscribeUrl: string) {
  return `
      <p style="margin: 24px 0 0; color: #94a3b8; font-size: 12px;">
        Don't want these emails? <a href="${escapeHtml(unsubscribeUrl)}" style="color: #94a3b8;">Unsubscribe</a>.
      </p>
  `;
}

function buildFollowup1Html(args: {
  appUrl: string;
  resumeToken: string;
  unsubscribeUrl: string;
  productName: string;
  stepCount: number;
}) {
  const resumeUrl = `${args.appUrl}/demo-studio/try?resume=${encodeURIComponent(args.resumeToken)}`;
  const productName = escapeHtml(args.productName);

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700;">Your interactive demo for ${productName} is still waiting.</h1>
      <p style="margin: 0 0 16px; color: #334155;">
        You built a ${args.stepCount}-step walkthrough yesterday but haven't saved it yet. It's still here — one click restores it exactly as you left it.
      </p>
      <p style="margin: 0 0 16px; color: #334155; font-size: 14px;">
        Save it to a free account to publish it, embed it on your site, and add a pitch video on top.
      </p>
      <div style="margin: 24px 0;">
        <a href="${escapeHtml(resumeUrl)}" style="background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Finish my demo
        </a>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 13px;">Free account. No credit card. The link restores your exact demo.</p>
      ${footerHtml(args.unsubscribeUrl)}
    </div>
  `;
}

function buildFollowup2Html(args: {
  appUrl: string;
  resumeToken: string;
  unsubscribeUrl: string;
  productName: string;
}) {
  const resumeUrl = `${args.appUrl}/demo-studio/try?resume=${encodeURIComponent(args.resumeToken)}`;
  const productName = escapeHtml(args.productName);

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700;">Last call: your demo link expires soon.</h1>
      <p style="margin: 0 0 16px; color: #334155;">
        This is the last reminder for your <strong>${productName}</strong> demo. After the link expires, the draft is gone.
      </p>
      <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 16px; padding: 16px; margin: 0 0 20px;">
        <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">⏰ Your demo draft expires soon — save it to keep it.</p>
      </div>
      <div style="margin: 24px 0;">
        <a href="${escapeHtml(resumeUrl)}" style="background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Save my demo before it expires
        </a>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 13px;">Free account. No credit card. Takes 10 seconds.</p>
      ${footerHtml(args.unsubscribeUrl)}
    </div>
  `;
}

interface GuestDraftRow {
  id: string;
  email: string;
  resume_token: string;
  artifact: { productName?: string; steps?: unknown[] } | null;
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

  const { data: pendingRows, error: fetchError } = await serviceClient
    .from("demo_try_guest_drafts")
    .select("id, email, resume_token, artifact, followup_count")
    .lte("next_followup_at", new Date().toISOString())
    .lt("followup_count", 2)
    .is("converted_at", null)
    .is("unsubscribed_at", null)
    .not("delivered_at", "is", null)
    .gt("expires_at", new Date().toISOString());

  if (fetchError) {
    console.error("process-demo-try-drip: fetch failed", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const row of (pendingRows ?? []) as GuestDraftRow[]) {
    try {
      const productName = row.artifact?.productName?.trim() || "your product";
      const stepCount = Array.isArray(row.artifact?.steps) ? row.artifact.steps.length : 3;
      const isLastEmail = row.followup_count === 1;
      const unsubscribeToken = await signUnsubscribeToken(row.id);
      const unsubscribeUrl = `${supabaseUrl}/functions/v1/demo-try-resume-email?unsubscribe=1&lead=${encodeURIComponent(row.id)}&token=${unsubscribeToken}`;

      const subject = isLastEmail
        ? "Last call: your demo link expires soon"
        : `Your interactive demo for ${productName} is still waiting`;

      const html = isLastEmail
        ? buildFollowup2Html({ appUrl, resumeToken: row.resume_token, unsubscribeUrl, productName })
        : buildFollowup1Html({ appUrl, resumeToken: row.resume_token, unsubscribeUrl, productName, stepCount });

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
        .from("demo_try_guest_drafts")
        .update({
          followup_count: row.followup_count + 1,
          next_followup_at: nextFollowupAt,
        })
        .eq("id", row.id);

      results.sent++;
    } catch (err) {
      console.error("process-demo-try-drip: failed for row", row.id, err);
      results.errors++;
    }
  }

  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
