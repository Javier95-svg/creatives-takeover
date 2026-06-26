import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";
import { getUserFromAuth } from "../_shared/credit-deduction.ts";

// Public endpoint: the public launch page (a logged-out visitor) submits a signup.
// verify_jwt stays true — supabase-js attaches the anon JWT for anonymous callers,
// same as demo-studio-generator's /try path. Routing (owner email + webhook) runs
// server-side so the webhook URL is never exposed to the browser.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEAD_RATE_LIMIT_PER_MIN = 10;
const WEBHOOK_TIMEOUT_MS = 5000;

interface LeadRequest {
  projectId?: string;
  email?: string;
  referrer?: string | null;
  vslVariationSeen?: string | null;
  /** Owner-only: dispatch a sample payload to validate a webhook URL. */
  test?: boolean;
  webhookUrl?: string;
}

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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** POST a JSON payload to a user-configured webhook. Never throws. */
async function dispatchWebhook(url: string, payload: unknown): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!url || !isValidHttpUrl(url)) return { ok: false, error: "invalid_url" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}

async function notifyOwner(
  admin: ReturnType<typeof createClient>,
  ownerId: string,
  projectName: string,
  lead: { email: string; referrer: string | null; vslVariationSeen: string | null },
): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;
  // Resolve the founder's email without assuming the profiles schema.
  const { data: userData } = await admin.auth.admin.getUserById(ownerId);
  const ownerEmail = userData?.user?.email;
  if (!ownerEmail) return;

  const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
  const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
  const resend = new Resend(resendKey);
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #764ba2 100%); padding: 28px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 22px;">🎯 New signup on ${projectName}</h1>
      </div>
      <div style="background: white; padding: 28px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
        <p style="margin: 8px 0;"><strong>📧 Email:</strong> ${lead.email}</p>
        ${lead.vslVariationSeen ? `<p style="margin: 8px 0;"><strong>🎬 VSL variation:</strong> ${lead.vslVariationSeen}</p>` : ""}
        ${lead.referrer ? `<p style="margin: 8px 0;"><strong>🔗 Referrer:</strong> ${lead.referrer}</p>` : ""}
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e1e5e9;">
          <a href="https://creatives-takeover.com/demo-studio/projects" style="color: #6366f1; text-decoration: none;">👉 View your Demo Studio leads</a>
        </div>
      </div>
    </div>`;
  await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [ownerEmail],
    subject: `New signup on ${projectName}: ${lead.email}`,
    html,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: LeadRequest = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("demo-studio-lead: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
      return json({ success: false, error: "Signups are temporarily unavailable." }, 503);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const projectId = (body.projectId || "").trim();
    if (!projectId) return json({ success: false, error: "projectId is required." }, 400);

    // ─── Owner-only webhook test path ──────────────────────────────────────────
    if (body.test === true) {
      const user = await getUserFromAuth(req);
      if (!user) return json({ success: false, error: "Authentication required." }, 401);
      const { data: project } = await admin
        .from("demo_studio_projects")
        .select("id, owner_id, name")
        .eq("id", projectId)
        .maybeSingle();
      if (!project || project.owner_id !== user.id) {
        return json({ success: false, error: "Not authorized for this project." }, 403);
      }
      const url = (body.webhookUrl || "").trim();
      if (!isValidHttpUrl(url)) return json({ success: false, error: "Enter a valid https webhook URL." }, 400);
      const result = await dispatchWebhook(url, {
        test: true,
        projectId,
        projectName: project.name,
        email: "test@creatives-takeover.com",
        message: "Demo Studio webhook test — your lead routing is connected.",
        createdAt: new Date().toISOString(),
      });
      return json({ success: result.ok, status: result.status, error: result.ok ? undefined : (result.error || "Webhook did not accept the request.") }, result.ok ? 200 : 502);
    }

    // ─── Public signup path ────────────────────────────────────────────────────
    const email = (body.email || "").trim().toLowerCase();
    if (!isValidEmail(email)) return json({ success: false, error: "A valid email is required." }, 400);

    const { error: rlError } = await admin.rpc("assert_rate_limit", {
      p_key: `demo_studio_lead:${getClientIp(req)}`,
      p_user_id: null,
      p_max_per_minute: LEAD_RATE_LIMIT_PER_MIN,
    });
    if (rlError) {
      // Only block on a genuine rate-limit breach. Any other RPC error (e.g. infra
      // hiccup) must not cost the founder a real lead — log and continue.
      if (/rate_limit_exceeded/i.test(rlError.message || "")) {
        return json({ success: false, error: "Too many signups right now. Try again in a moment." }, 429);
      }
      console.error("demo-studio-lead: rate-limit check failed (continuing):", rlError.message);
    }

    const { data: project, error: projectError } = await admin
      .from("demo_studio_projects")
      .select("id, name, owner_id, launch_published")
      .eq("id", projectId)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project || project.launch_published !== true) {
      return json({ success: false, error: "This launch page is not accepting signups." }, 404);
    }

    const { data: signup, error: signupError } = await admin
      .from("demo_studio_signups")
      .insert({
        project_id: projectId,
        email,
        referrer: body.referrer ?? null,
        vsl_variation_seen: body.vslVariationSeen ?? null,
      })
      .select("id")
      .maybeSingle();
    if (signupError && !/duplicate key|unique/i.test(signupError.message || "")) {
      throw signupError;
    }

    // Analytics event + routing run best-effort and never block the response.
    await admin.from("demo_studio_events").insert({
      project_id: projectId,
      type: "signup",
      meta: { vsl_variation_seen: body.vslVariationSeen ?? null, referrer: body.referrer ?? null, source: "edge" },
    });

    const { data: launchPage } = await admin
      .from("demo_studio_launch_pages")
      .select("lead_webhook_url, lead_notify_enabled")
      .eq("project_id", projectId)
      .maybeSingle();

    const lead = { email, referrer: body.referrer ?? null, vslVariationSeen: body.vslVariationSeen ?? null };
    await Promise.allSettled([
      launchPage?.lead_notify_enabled !== false
        ? notifyOwner(admin, project.owner_id, project.name, lead)
        : Promise.resolve(),
      launchPage?.lead_webhook_url
        ? dispatchWebhook(launchPage.lead_webhook_url, {
            projectId,
            projectName: project.name,
            email,
            referrer: lead.referrer,
            vslVariationSeen: lead.vslVariationSeen,
            signupId: signup?.id ?? null,
            createdAt: new Date().toISOString(),
          })
        : Promise.resolve(),
    ]);

    return json({ success: true }, 200);
  } catch (error) {
    console.error("demo-studio-lead error:", error);
    return json({ success: false, error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
