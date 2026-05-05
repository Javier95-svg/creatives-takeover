import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeRequest {
  email: string;
  fullName?: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { email, fullName }: WelcomeRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing 'email' in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const name = fullName && fullName.trim().length > 0 ? fullName.trim() : "there";

    // Sender configuration via Supabase Edge Function secrets
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
    const replyTo = Deno.env.get("REPLY_TO_EMAIL");

    const appUrl = (Deno.env.get("APP_URL") || "https://www.creativestakeover.com").replace(/\/$/, "");
    const safeName = escapeHtml(name);
    const safeOnboardingUrl = escapeHtml(`${appUrl}/onboarding`);

    const html = `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji; line-height: 1.6; color: #0f172a; max-width: 560px;">
        <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Welcome to Creatives Takeover, ${safeName}</h1>
        <p style="margin: 0 0 12px; color: #334155;">You’re not being dropped into a generic dashboard. Your first job is to complete onboarding and choose the one meaningful action to take first.</p>
        <ul style="margin: 0 0 16px; padding-left: 20px; color: #334155;">
          <li>Save one mentor worth reaching out to.</li>
          <li>Or start one conversation that can generate a real reply.</li>
          <li>Or book one discovery call with genuine intent.</li>
        </ul>
        <p style="margin: 0 0 16px; color: #334155;">The goal is to leave your first session with a real thread, mentor, or next step — something concrete to come back to.</p>
        <div style="margin: 24px 0;">
          <a href="${safeOnboardingUrl}" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
            Complete onboarding →
          </a>
        </div>
        <p style="margin: 0 0 12px; color: #64748b; font-size: 13px;">If you did not create this account, you can safely ignore this email.</p>
        <p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">— The Creatives Takeover Team</p>
      </div>
    `;

    const subject = "Welcome — here's your first step inside Creatives Takeover";

    const sendPayload: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject,
      html,
    };

    if (replyTo && replyTo.trim().length > 0) {
      (sendPayload as any).reply_to = replyTo;
    }

    const sendResult = await resend.emails.send(sendPayload as any);

    console.log("send-welcome-email: sent", { to: email, id: sendResult?.data?.id });

    return new Response(
      JSON.stringify({ ok: true, id: sendResult?.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("send-welcome-email: error", error);
    return new Response(
      JSON.stringify({ ok: false, error: error?.message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
