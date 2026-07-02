/**
 * demo-try-resume-email
 *
 * Recovery loop for anonymous /demo-studio/try visitors. The browser posts the
 * visitor's email plus the generated demo draft (the same TryDraft JSON the
 * client keeps in sessionStorage). We store it in demo_try_guest_drafts, email
 * a resume link that restores the demo on any device, and seed a short drip
 * (process-demo-try-drip sends follow-ups at +24h and +48h).
 *
 * Mirrors request-icp-draft-email with two hardening fixes that template lacks:
 *   - per-IP rate limiting via the shared assert_rate_limit RPC
 *   - an unsubscribe link (HMAC-signed) handled by GET ?unsubscribe=1 here
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_PER_MIN = 5;
const MAX_BODY_BYTES = 1_000_000; // drafts are ~120-400KB; anything bigger is abuse
const MAX_STEPS = 3;

interface TryDraftStep {
  dataUrl: string;
  title: string;
  caption: string;
  speaker_notes: string;
  hotspot_label: string;
}

interface TryDraft {
  v: 1;
  productName: string;
  contextUrl: string;
  steps: TryDraftStep[];
}

interface ResumeEmailRequest {
  email?: string;
  draft?: TryDraft;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || "unknown";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function validateDraft(draft: TryDraft | undefined): string[] {
  const issues: string[] = [];
  if (!draft || typeof draft !== "object") {
    issues.push("draft is required");
    return issues;
  }
  if (draft.v !== 1) issues.push("draft.v must be 1");
  if (!Array.isArray(draft.steps) || draft.steps.length === 0 || draft.steps.length > MAX_STEPS) {
    issues.push(`draft.steps must contain 1-${MAX_STEPS} steps`);
    return issues;
  }
  for (const step of draft.steps) {
    if (typeof step?.dataUrl !== "string" || !step.dataUrl.startsWith("data:image/")) {
      issues.push("every draft step needs an image data URL");
      break;
    }
  }
  return issues;
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

async function buildUnsubscribeUrl(supabaseUrl: string, leadId: string): Promise<string> {
  const token = await signUnsubscribeToken(leadId);
  return `${supabaseUrl}/functions/v1/demo-try-resume-email?unsubscribe=1&lead=${encodeURIComponent(leadId)}&token=${token}`;
}

function buildEmailHtml(args: {
  appUrl: string;
  resumeToken: string;
  unsubscribeUrl: string;
  draft: TryDraft;
}) {
  const resumeUrl = `${args.appUrl}/demo-studio/try?resume=${encodeURIComponent(args.resumeToken)}`;
  const productName = escapeHtml(args.draft.productName || "Your product");
  const stepCount = args.draft.steps.length;
  const firstTitle = escapeHtml(args.draft.steps[0]?.title || "");

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Your interactive demo is ready to finish.</h1>
      <p style="margin: 0 0 16px; color: #334155;">
        You built a ${stepCount}-step interactive demo for <strong>${productName}</strong>. It's saved — open it on any device and pick up exactly where you left off.
      </p>
      <div style="border: 1px solid #e2e8f0; border-radius: 20px; background: #f8fafc; padding: 20px; margin: 0 0 20px;">
        <p style="margin: 0; font-size: 18px; font-weight: 700;">${productName}</p>
        <p style="margin: 8px 0 0; color: #475569;">${stepCount}-step walkthrough${firstTitle ? ` — starts with "${firstTitle}"` : ""}</p>
      </div>
      <div style="margin: 24px 0;">
        <a href="${escapeHtml(resumeUrl)}" style="background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Finish my demo
        </a>
      </div>
      <p style="margin: 0 0 24px; color: #64748b; font-size: 13px;">This link restores your exact demo. Save it to a free account to publish it and share it anywhere.</p>
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">
        Don't want these emails? <a href="${escapeHtml(args.unsubscribeUrl)}" style="color: #94a3b8;">Unsubscribe</a>.
      </p>
    </div>
  `;
}

async function processResumeEmailRequest(args: {
  email: string;
  draft: TryDraft;
  supabaseUrl: string;
  supabaseKey: string;
}) {
  const appUrl = (Deno.env.get("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "");
  const serviceClient = createClient(args.supabaseUrl, args.supabaseKey);

  const resumeToken = crypto.randomUUID();
  const { data: inserted, error: insertError } = await serviceClient
    .from("demo_try_guest_drafts")
    .insert({
      email: args.email,
      resume_token: resumeToken,
      artifact: args.draft,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to store demo try draft: ${insertError?.message ?? "no row"}`);
  }

  const unsubscribeUrl = await buildUnsubscribeUrl(args.supabaseUrl, inserted.id);
  await resend.emails.send({
    from: "Creatives Takeover <noreply@updates.creativestakeover.com>",
    to: [args.email],
    subject: "Your interactive demo is ready to finish",
    html: buildEmailHtml({ appUrl, resumeToken, unsubscribeUrl, draft: args.draft }),
  });

  const now = new Date();
  await serviceClient
    .from("demo_try_guest_drafts")
    .update({
      delivered_at: now.toISOString(),
      next_followup_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      followup_count: 0,
    })
    .eq("id", inserted.id);
}

async function handleUnsubscribe(req: Request, supabaseUrl: string, supabaseKey: string): Promise<Response> {
  const url = new URL(req.url);
  const leadId = url.searchParams.get("lead") || "";
  const token = url.searchParams.get("token") || "";

  if (!leadId || !token || (await signUnsubscribeToken(leadId)) !== token) {
    return new Response("Invalid unsubscribe link.", { status: 401, headers: { "Content-Type": "text/plain" } });
  }

  const serviceClient = createClient(supabaseUrl, supabaseKey);
  await serviceClient
    .from("demo_try_guest_drafts")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", leadId)
    .is("unsubscribed_at", null);

  return new Response("You have been unsubscribed. You won't receive further emails about this demo.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    return json({ success: false, error: "Missing environment configuration" }, 500);
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("unsubscribe") === "1") {
      return handleUnsubscribe(req, supabaseUrl, supabaseKey);
    }
    return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  try {
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return json({ success: false, error: "Draft too large." }, 413);
    }
    const payload = JSON.parse(rawBody) as ResumeEmailRequest;

    const email = (payload.email || "").trim().toLowerCase();
    if (!emailRegex.test(email)) {
      return json({ success: false, error: "A valid email is required." }, 422);
    }
    const draftIssues = validateDraft(payload.draft);
    if (draftIssues.length > 0) {
      return json({ success: false, error: "Validation failed", validationIssues: draftIssues }, 422);
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey);
    const { error: rlError } = await serviceClient.rpc("assert_rate_limit", {
      p_key: `demo_try_resume:${getClientIp(req)}`,
      p_user_id: null,
      p_max_per_minute: RATE_LIMIT_PER_MIN,
    });
    if (rlError) {
      // Only block on a genuine rate-limit breach; an infra error must not cost a lead.
      if (/rate_limit_exceeded/i.test(rlError.message || "")) {
        return json({ success: false, error: "Too many requests right now. Try again in a minute." }, 429);
      }
      console.error("demo-try-resume-email: rate-limit check failed (continuing):", rlError.message);
    }

    EdgeRuntime.waitUntil(
      processResumeEmailRequest({ email, draft: payload.draft as TryDraft, supabaseUrl, supabaseKey }).catch(
        (error) => {
          console.error("demo-try-resume-email background task failed", error);
        },
      ),
    );

    return json({ success: true, queued: true });
  } catch (error) {
    console.error("demo-try-resume-email failed", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }, 500);
  }
});
