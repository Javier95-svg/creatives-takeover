import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SequenceType = "activation_nudge" | "progress_nudge" | "reengagement" | "celebration";

interface RetentionEmailRequest {
  userId: string;
  email: string;
  fullName?: string;
  niche?: string;
  sequence: SequenceType;
}

function buildActivationNudgeEmail(name: string, niche: string) {
  const nicheText = niche ? ` for your ${niche} startup` : "";
  return {
    subject: `Your startup idea is waiting${nicheText}`,
    html: `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
        <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700;">Hey ${name} 👋</h1>
        <p style="margin: 0 0 12px; color: #334155;">You signed up for Creatives Takeover but haven't built your BizMap yet.</p>
        <p style="margin: 0 0 16px; color: #334155;">It takes <strong>under 5 minutes</strong>. Answer 7 questions and walk away with a full 30-day launch roadmap${nicheText} — market analysis, go-to-market strategy, and a validation plan built specifically for your idea.</p>
        <div style="margin: 24px 0;">
          <a href="https://creatives-takeover.com/bizmap-ai/chat" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
            Build My BizMap Plan →
          </a>
        </div>
        <p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">— The Creatives Takeover Team</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #94a3b8;">You're receiving this because you signed up at creatives-takeover.com. <a href="https://creatives-takeover.com/account" style="color: #94a3b8;">Manage email preferences</a></p>
      </div>
    `,
  };
}

function buildProgressNudgeEmail(name: string, niche: string) {
  const nicheText = niche ? ` for your ${niche} startup` : "";
  return {
    subject: `Your BizMap draft is saved — finish it in 3 minutes`,
    html: `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
        <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700;">You were close, ${name} 🎯</h1>
        <p style="margin: 0 0 12px; color: #334155;">You started building your BizMap plan${nicheText} but didn't finish.</p>
        <p style="margin: 0 0 16px; color: #334155;">Your progress is saved. Pick up where you left off and get your full 30-day launch roadmap — it'll take 3 minutes from here.</p>
        <div style="margin: 24px 0;">
          <a href="https://creatives-takeover.com/bizmap-ai/chat" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
            Finish My BizMap Plan →
          </a>
        </div>
        <p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">— The Creatives Takeover Team</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #94a3b8;">You're receiving this because you signed up at creatives-takeover.com. <a href="https://creatives-takeover.com/account" style="color: #94a3b8;">Manage email preferences</a></p>
      </div>
    `,
  };
}

function buildCelebrationEmail(name: string, niche: string) {
  const nicheText = niche ? ` for your ${niche} startup` : "";
  return {
    subject: `Your 30-day launch plan is ready, ${name} 🚀`,
    html: `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
        <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700;">You just built something real, ${name} 🎉</h1>
        <p style="margin: 0 0 12px; color: #334155;">Your BizMap AI plan${nicheText} is saved and ready.</p>
        <p style="margin: 0 0 8px; color: #334155;">Here's what you now have:</p>
        <ul style="margin: 0 0 16px; padding-left: 20px; color: #334155;">
          <li style="margin-bottom: 6px;">A personalized <strong>30-day launch roadmap</strong></li>
          <li style="margin-bottom: 6px;">Market analysis and go-to-market strategy</li>
          <li style="margin-bottom: 6px;">A validation plan built around your idea</li>
        </ul>
        <p style="margin: 0 0 16px; color: #334155;">Your next step is to validate it with real people. Use the <strong>ICP Builder</strong> or <strong>Waitlist Maker</strong> to turn this plan into demand signals.</p>
        <div style="margin: 24px 0; display: flex; gap: 12px; flex-wrap: wrap;">
          <a href="https://www.creativestakeover.com/bizmap-ai/chat" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; margin-right: 12px; margin-bottom: 8px;">
            View My Plan →
          </a>
          <a href="https://www.creativestakeover.com/dashboard" style="background: transparent; color: #32b8c6; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; border: 2px solid #32b8c6; margin-bottom: 8px;">
            Go to Dashboard
          </a>
        </div>
        <p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">— The Creatives Takeover Team</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #94a3b8;">You're receiving this because you saved a BizMap plan at creativestakeover.com. <a href="https://www.creativestakeover.com/account" style="color: #94a3b8;">Manage email preferences</a></p>
      </div>
    `,
  };
}

function buildReengagementEmail(name: string, niche: string) {
  const nicheText = niche ? ` in ${niche}` : "";
  return {
    subject: `Founders${nicheText} are shipping this week — here's what's new`,
    html: `
      <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
        <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700;">We miss you, ${name} 👀</h1>
        <p style="margin: 0 0 12px; color: #334155;">It's been a week since you visited Creatives Takeover.</p>
        <p style="margin: 0 0 16px; color: #334155;">This week, founders${nicheText} on the platform built their ICPs, launched waitlists, and validated demand with real signals. Your dashboard is ready when you are.</p>
        <div style="margin: 24px 0; display: flex; gap: 12px; flex-wrap: wrap;">
          <a href="https://creatives-takeover.com/bizmap-ai/chat" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; margin-right: 12px; margin-bottom: 8px;">
            Build My Plan →
          </a>
          <a href="https://creatives-takeover.com/dashboard" style="background: transparent; color: #32b8c6; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block; border: 2px solid #32b8c6; margin-bottom: 8px;">
            Go to Dashboard
          </a>
        </div>
        <p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">— The Creatives Takeover Team</p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #94a3b8;">You're receiving this because you signed up at creatives-takeover.com. <a href="https://creatives-takeover.com/account" style="color: #94a3b8;">Manage email preferences</a></p>
      </div>
    `,
  };
}

serve(async (req: Request): Promise<Response> => {
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
    const body: RetentionEmailRequest = await req.json();
    const { userId, email, fullName, niche = "", sequence } = body;

    if (!email || !sequence || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields: userId, email, sequence" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const name = fullName?.trim() || "Founder";
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";

    let emailContent: { subject: string; html: string };
    switch (sequence) {
      case "activation_nudge":
        emailContent = buildActivationNudgeEmail(name, niche);
        break;
      case "progress_nudge":
        emailContent = buildProgressNudgeEmail(name, niche);
        break;
      case "reengagement":
        emailContent = buildReengagementEmail(name, niche);
        break;
      case "celebration":
        emailContent = buildCelebrationEmail(name, niche);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown sequence: ${sequence}` }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    // Log the send to Supabase so we don't send duplicates
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for recent send of same sequence to this user (dedup within 6 days)
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingSend } = await supabase
      .from("retention_email_log")
      .select("id")
      .eq("user_id", userId)
      .eq("sequence", sequence)
      .gte("sent_at", sixDaysAgo)
      .maybeSingle();

    if (existingSend) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "already_sent_recently" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const sendResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: emailContent.subject,
      html: emailContent.html,
    } as any);

    // Log the send
    await supabase.from("retention_email_log").insert({
      user_id: userId,
      email,
      sequence,
      sent_at: new Date().toISOString(),
      resend_id: sendResult?.data?.id ?? null,
    });

    console.log("send-retention-email: sent", { userId, sequence, to: email, id: sendResult?.data?.id });

    return new Response(
      JSON.stringify({ ok: true, id: sendResult?.data?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("send-retention-email: error", error);
    return new Response(
      JSON.stringify({ ok: false, error: error?.message ?? "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
