import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Custom password-reset sender.
//
// Why this exists: Supabase Auth's built-in recovery email goes through the
// project's custom SMTP. When those SMTP credentials break (e.g. a stale Resend
// key -> "535 Authentication credentials invalid"), every /recover request fails
// with "Error sending recovery email" and users are locked out.
//
// This function decouples password reset from that SMTP config: it mints a
// recovery link with the Admin API and delivers it over the Resend HTTP API
// (the same transport the contact form already uses), so resets keep working
// even if Auth SMTP is misconfigured.

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The recovery link's redirect target must point back to our app. Only allow
// known origins so a forged `redirectTo` can't turn this into an open redirect.
const DEFAULT_APP_URL = "https://creatives-takeover.com";
const ALLOWED_ORIGINS = [
  "https://creatives-takeover.com",
  "https://www.creatives-takeover.com",
];

// Rolling 1-hour rate limits to prevent inbox-bombing a victim or enumeration.
const MAX_PER_EMAIL_PER_HOUR = 3;
const MAX_PER_IP_PER_HOUR = 15;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveAppOrigin(redirectTo?: string): string {
  if (!redirectTo) return DEFAULT_APP_URL;
  try {
    const url = new URL(redirectTo);
    if (ALLOWED_ORIGINS.includes(url.origin)) return url.origin;
    // Allow localhost during development.
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return url.origin;
    return DEFAULT_APP_URL;
  } catch {
    return DEFAULT_APP_URL;
  }
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

function buildEmailHtml(resetUrl: string): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 28px; border-radius: 10px 10px 0 0;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Reset your password</h1>
    </div>
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e5e9; border-radius: 0 0 10px 10px;">
      <p style="color: #555; line-height: 1.6; margin-top: 0;">
        We received a request to reset the password for your Creatives Takeover account.
        Click the button below to choose a new password.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${resetUrl}"
           style="display: inline-block; background: #667eea; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p style="color: #777; font-size: 13px; line-height: 1.6;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely
        ignore this email &mdash; your password won't change.
      </p>
      <p style="color: #777; font-size: 13px; line-height: 1.6;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
    <div style="text-align: center; padding: 18px; color: #999; font-size: 12px;">
      <p style="margin: 0;">Creatives Takeover</p>
    </div>
  </div>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[RESET] RESEND_API_KEY is not configured");
      return json(500, { success: false, error: "Email service is not configured." });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const redirectTo = typeof body?.redirectTo === "string" ? body.redirectTo : undefined;

    if (!email || !emailRegex.test(email)) {
      return json(400, { success: false, error: "A valid email address is required." });
    }

    const appOrigin = resolveAppOrigin(redirectTo);

    const recordAttempt = async (succeeded: boolean, note: string | null) => {
      const { error } = await supabaseAdmin
        .from("password_reset_requests")
        .insert({ email, ip, succeeded, note });
      if (error) console.error("[RESET] Failed to record attempt:", error.message);
    };

    // ---- Rate limiting (rolling 1h window) ----
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const emailCountQuery = await supabaseAdmin
      .from("password_reset_requests")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", since);
    const ipCountQuery = ip
      ? await supabaseAdmin
          .from("password_reset_requests")
          .select("*", { count: "exact", head: true })
          .eq("ip", ip)
          .gte("created_at", since)
      : { count: 0 };

    const emailCount = emailCountQuery.count ?? 0;
    const ipCount = ipCountQuery.count ?? 0;

    if (emailCount >= MAX_PER_EMAIL_PER_HOUR || ipCount >= MAX_PER_IP_PER_HOUR) {
      console.warn("[RESET] Rate limit hit", { emailCount, ipCount });
      await recordAttempt(false, "rate_limited");
      // Generic success: never reveal throttling or whether the account exists.
      return json(200, { success: true });
    }

    // ---- Mint a recovery link via the Admin API (no SMTP involved) ----
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${appOrigin}/reset-password` },
    });

    const actionLink = data?.properties?.action_link;

    if (error || !actionLink) {
      const msg = error?.message || "no action_link returned";
      // "User not found" is treated as success to avoid account enumeration.
      const isMissingUser =
        // deno-lint-ignore no-explicit-any
        /user not found|no user|not exist/i.test(msg) || (error as any)?.status === 404;
      console.warn("[RESET] generateLink produced no link", { msg, isMissingUser });
      await recordAttempt(false, isMissingUser ? "no_user" : `generatelink_error:${msg}`);
      if (isMissingUser) return json(200, { success: true });
      // Genuine infra failure -> surface it so the user retries (no silent failure).
      return json(500, {
        success: false,
        error: "Could not start the password reset. Please try again.",
      });
    }

    // ---- Deliver via the Resend HTTP API (the path that already works) ----
    const fromEmail = Deno.env.get("FROM_EMAIL") || "no-reply@creatives-takeover.com";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
    const resend = new Resend(resendApiKey);

    const sendResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: "Reset your Creatives Takeover password",
      html: buildEmailHtml(actionLink),
    });

    if (sendResult.error || !sendResult.data?.id) {
      console.error("[RESET] Resend send failed:", JSON.stringify(sendResult.error));
      await recordAttempt(false, `resend_error:${JSON.stringify(sendResult.error)}`);
      return json(500, {
        success: false,
        error: "Could not send the reset email. Please try again.",
      });
    }

    await recordAttempt(true, sendResult.data.id);
    console.log("[RESET] Recovery email sent", { emailId: sendResult.data.id });
    return json(200, { success: true });
  } catch (err) {
    console.error("[RESET] Unexpected error:", err instanceof Error ? err.message : String(err));
    return json(500, { success: false, error: "Unexpected error. Please try again." });
  }
};

serve(handler);
