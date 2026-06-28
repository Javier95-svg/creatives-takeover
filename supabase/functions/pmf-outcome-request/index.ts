import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

// Sends the "what happened with your idea?" outcome follow-up for PMF Lab and logs
// it to retention_email_log (open/click are tracked by the existing resend-webhook).
// Invoked server-side by the process_pmf_outcome_followups cron via pg_net.
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OutcomeRequest {
  userId: string;
  email: string;
  fullName?: string | null;
  analysisId: string;
  pmfScore?: number | null;
  verdict?: string | null;
  sequence?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: OutcomeRequest = await req.json();
    const { userId, email, analysisId } = body;
    const sequence = body.sequence === "pmf_outcome_60d" ? "pmf_outcome_60d" : "pmf_outcome_30d";

    if (!userId || !email || !analysisId) {
      return json({ ok: false, error: "userId, email and analysisId are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Mentors are excluded from lifecycle email (same policy as send-retention-email).
    const { data: mentorRow } = await supabase.from("mentors").select("id").eq("user_id", userId).maybeSingle();
    if (mentorRow) return json({ ok: true, skipped: true, reason: "mentor_excluded" });

    // Belt-and-braces dedup (the cron already enforces a 30-day cadence).
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingSend } = await supabase
      .from("retention_email_log")
      .select("id")
      .eq("user_id", userId)
      .eq("sequence", sequence)
      .gte("sent_at", sixDaysAgo)
      .maybeSingle();
    if (existingSend) return json({ ok: true, skipped: true, reason: "already_sent_recently" });

    const appUrl = (Deno.env.get("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "");
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "hello@creatives-takeover.com";
    const replyTo = Deno.env.get("REPLY_TO_EMAIL");

    const ctaUrl = `${appUrl}/pmf-lab?outcome=${encodeURIComponent(analysisId)}`;
    const firstName = (body.fullName || "").trim().split(" ")[0] || "there";
    const scoreLine = typeof body.pmfScore === "number"
      ? `Your PMF Lab score was <strong>${Math.round(body.pmfScore)}/100</strong>. `
      : "";

    const subject = "What happened with your idea?";
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;color:#0f172a;">
        <h1 style="font-size:20px;margin:0 0 16px;">Hey ${escapeHtml(firstName)}, what happened with your idea?</h1>
        <p style="font-size:14px;line-height:1.6;color:#334155;">
          ${scoreLine}It's been a few weeks since you ran PMF Lab. Telling us the real outcome — launched, pivoted,
          funded, or shelved — takes 20 seconds and is how PMF Lab learns whether its scores were right.
        </p>
        <p style="margin:24px 0;">
          <a href="${ctaUrl}" style="background:#6d28d9;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:600;display:inline-block;">
            Update my outcome
          </a>
        </p>
        <p style="font-size:12px;color:#94a3b8;line-height:1.5;">
          You're receiving this because you ran a PMF analysis on Creatives Takeover.
        </p>
      </div>`;

    const payload: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject,
      html,
    };
    if (replyTo) payload.reply_to = replyTo;

    const sendResult = await resend.emails.send(payload as never);

    await supabase.from("retention_email_log").insert({
      user_id: userId,
      email,
      sequence,
      sent_at: new Date().toISOString(),
      resend_id: sendResult?.data?.id ?? null,
    });

    console.warn("pmf-outcome-request: sent", { userId, sequence, to: email, id: sendResult?.data?.id });
    return json({ ok: true, id: sendResult?.data?.id ?? null });
  } catch (error) {
    console.error("pmf-outcome-request error:", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
