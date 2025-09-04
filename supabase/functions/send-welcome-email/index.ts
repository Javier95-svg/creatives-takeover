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

    const html = `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji; line-height: 1.6; color: #0f172a;">
        <h1 style="margin: 0 0 16px; font-size: 24px;">Welcome to Creatives Takeover, ${name} 🎉</h1>
        <p style="margin: 0 0 12px;">Thanks for creating an account! You're all set to explore tools, resources, and a community built for creators and builders.</p>
        <p style="margin: 0 0 12px;">Here are a few things you can try next:</p>
        <ul style="margin: 0 0 16px; padding-left: 20px;">
          <li>Start with Dream2Plan to turn ideas into a strategy.</li>
          <li>Join the Community to learn from other builders.</li>
          <li>Explore Resources for templates and guides.</li>
        </ul>
        <p style="margin: 0 0 16px;">If you didn't create this account, you can safely ignore this email.</p>
        <p style="margin: 0 0 4px;">— The Creatives Takeover Team</p>
      </div>
    `;

    const subject = "Welcome to Creatives Takeover";

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