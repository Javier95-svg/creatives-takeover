import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActivationIntent = "save_mentor" | "send_message" | "book_call";
type SequenceType =
  | "activation_day0"
  | "activation_day2"
  | "activation_day7"
  | "weekly_digest"
  | "activation_nudge"
  | "progress_nudge"
  | "reengagement"
  | "celebration";

interface RetentionEmailRequest {
  userId: string;
  email: string;
  fullName?: string | null;
  niche?: string | null;
  sequence: SequenceType;
  activationIntent?: ActivationIntent;
  mentorId?: string;
  mentorName?: string;
  ctaUrl?: string;
  contextHeadline?: string;
  contextBody?: string;
  savedMentorCount?: number;
  unreadMessageCount?: number;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeAppUrl(value: string) {
  return value.replace(/\/$/, "");
}

function getDefaultCta(intent: ActivationIntent | undefined, appUrl: string) {
  switch (intent) {
    case "save_mentor":
      return `${appUrl}/community?mentorSource=retention-saved`;
    case "send_message":
      return `${appUrl}/messages`;
    case "book_call":
      return `${appUrl}/community?mentorSource=retention-call`;
    default:
      return `${appUrl}/dashboard`;
  }
}

function getDefaultCtaLabel(intent: ActivationIntent | undefined) {
  switch (intent) {
    case "save_mentor":
      return "Open Saved Mentors";
    case "send_message":
      return "Open Messages";
    case "book_call":
      return "Review Mentor Options";
    default:
      return "Open Dashboard";
  }
}

function buildEmailShell({
  title,
  intro,
  bulletPoints,
  body,
  ctaLabel,
  ctaUrl,
  footer,
}: {
  title: string;
  intro: string;
  bulletPoints?: string[];
  body?: string;
  ctaLabel: string;
  ctaUrl: string;
  footer?: string;
}) {
  const safeTitle = escapeHtml(title);
  const safeIntro = escapeHtml(intro);
  const safeBody = body ? escapeHtml(body) : "";
  const safeFooter = footer ? escapeHtml(footer) : "The Creatives Takeover team";
  const safeCtaLabel = escapeHtml(ctaLabel);
  const safeCtaUrl = escapeHtml(ctaUrl);

  const bullets = (bulletPoints ?? [])
    .map((point) => `<li style="margin-bottom: 6px;">${escapeHtml(point)}</li>`)
    .join("");

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">${safeTitle}</h1>
      <p style="margin: 0 0 12px; color: #334155;">${safeIntro}</p>
      ${bullets ? `<ul style="margin: 0 0 16px; padding-left: 20px; color: #334155;">${bullets}</ul>` : ""}
      ${safeBody ? `<p style="margin: 0 0 16px; color: #334155;">${safeBody}</p>` : ""}
      <div style="margin: 24px 0;">
        <a href="${safeCtaUrl}" style="background: #32b8c6; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          ${safeCtaLabel} →
        </a>
      </div>
      <p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">— ${safeFooter}</p>
      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 12px; color: #94a3b8;">You are receiving this because you created an account at creatives-takeover.com. Manage preferences from your account.</p>
    </div>
  `;
}

function buildSequenceEmail(args: {
  name: string;
  sequence: SequenceType;
  intent?: ActivationIntent;
  mentorName?: string;
  headline?: string;
  body?: string;
  ctaUrl: string;
  ctaLabel: string;
  unreadMessageCount?: number;
  savedMentorCount?: number;
  niche?: string | null;
}) {
  const nicheText = args.niche ? ` in ${args.niche}` : "";
  const mentorLabel = args.mentorName ? args.mentorName : "your mentor shortlist";
  const unreadText = args.unreadMessageCount && args.unreadMessageCount > 0
    ? `${args.unreadMessageCount} reply${args.unreadMessageCount === 1 ? "" : "ies"}`
    : "your messages";
  const savedCountText = args.savedMentorCount && args.savedMentorCount > 0
    ? `${args.savedMentorCount} saved mentor${args.savedMentorCount === 1 ? "" : "s"}`
    : "your saved mentors";

  switch (args.sequence) {
    case "activation_day0":
      return {
        subject: args.intent === "save_mentor"
          ? `You saved ${mentorLabel} - now keep the thread alive`
          : args.intent === "send_message"
            ? `Your conversation is open - come back for the reply`
            : `Your discovery call path is active`,
        html: buildEmailShell({
          title: `Nice move, ${args.name}`,
          intro: args.headline || "You just created the kind of asset that can actually pull you back into the product.",
          bulletPoints: args.intent === "save_mentor"
            ? [
                `${mentorLabel} is now part of your retained path.`,
                "We will use saved mentors and fresh activity to bring you back at the right time.",
              ]
            : args.intent === "send_message"
              ? [
                  "Messages are the strongest retained-user signal in the current product data.",
                  "One live thread gives you a concrete reason to return tomorrow.",
                ]
              : [
                  "Discovery calls are the highest-intent action in the current funnel.",
                  "The strongest follow-up usually happens right after the booking.",
                ],
          body: args.body || "Your next best move is not to browse more. It is to continue the exact action you just started.",
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
        }),
      };

    case "activation_day2":
      return {
        subject: args.intent === "send_message"
          ? `${unreadText} are still waiting`
          : args.intent === "save_mentor"
            ? `You still have ${savedCountText} to act on`
            : `Do not let this discovery call go cold`,
        html: buildEmailShell({
          title: `${args.name}, your first win is still open`,
          intro: args.headline || (
            args.intent === "send_message"
              ? `You have ${unreadText} waiting in Messages.`
              : args.intent === "save_mentor"
                ? `You saved ${mentorLabel} but have not turned that intent into follow-up yet.`
                : `You booked a discovery path and now need one focused follow-up move.`
          ),
          body: args.body || "The goal is not more exploration. The goal is to move one existing thread, mentor relationship, or booking forward before it loses momentum.",
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
        }),
      };

    case "activation_day7":
      return {
        subject: args.intent === "send_message"
          ? `Your conversations${nicheText} are waiting`
          : args.intent === "save_mentor"
            ? `Your saved mentors${nicheText} are still your best next move`
            : `Come back with one clear question for your next call`,
        html: buildEmailShell({
          title: `${args.name}, pick the thread back up`,
          intro: args.headline || "Week 2 is where most users disappear. The best recovery is one concrete return action tied to something you already started.",
          bulletPoints: [
            args.intent === "send_message"
              ? `Open Messages and move one conversation forward.`
              : args.intent === "save_mentor"
                ? `Revisit ${mentorLabel} and decide who deserves a real follow-up.`
                : "Use the next call to pressure-test one decision instead of ten.",
            "You do not need a full reset. One focused session is enough to restart momentum.",
          ],
          body: args.body || "The product works best when it brings you back to a real thread, a real mentor, or a real next step.",
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
        }),
      };

    case "weekly_digest":
      return {
        subject: `Your weekly founder prompt${nicheText}`,
        html: buildEmailShell({
          title: `${args.name}, here is your weekly return prompt`,
          intro: args.headline || `You still have ${savedCountText} and ${unreadText} tied to your account.`,
          bulletPoints: [
            "Open one mentor relationship worth moving forward.",
            "Check whether any messages need a reply.",
            "Use the dashboard only after you complete one concrete action.",
          ],
          body: args.body || "Generic reminders do not work. This digest only exists to point you back to the assets already connected to your account.",
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
        }),
      };

    case "activation_nudge":
      return {
        subject: `Your first founder action is still waiting`,
        html: buildEmailShell({
          title: `Start with one real action, ${args.name}`,
          intro: "Create one return trigger in your first session: save a mentor, send a message, or book a discovery call.",
          body: "The product should give you something unfinished to come back to. Start there instead of browsing cold.",
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
        }),
      };

    case "progress_nudge":
      return {
        subject: `Pick up where you left off`,
        html: buildEmailShell({
          title: `${args.name}, your progress is still warm`,
          intro: "You started moving, but you did not create a strong enough reason to return yet.",
          body: "Finish one value-bearing action and the rest of the retention system can start working for you.",
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
        }),
      };

    case "reengagement":
      return {
        subject: `Founders${nicheText} are still shipping this week`,
        html: buildEmailShell({
          title: `Come back to one concrete move, ${args.name}`,
          intro: "The fastest way back into momentum is not a fresh start. It is reopening the strongest thread already connected to your account.",
          body: "Use the dashboard after you move one real conversation, saved mentor, or discovery action forward.",
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
        }),
      };

    case "celebration":
      return {
        subject: `You created a real return trigger`,
        html: buildEmailShell({
          title: `That was a high-signal move, ${args.name}`,
          intro: "The product is at its best when it creates a thread worth returning to.",
          body: "Keep stacking actions that create a reply, a saved asset, or a booked conversation.",
          ctaLabel: args.ctaLabel,
          ctaUrl: args.ctaUrl,
        }),
      };
  }
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
    const {
      userId,
      email,
      fullName,
      niche = "",
      sequence,
      activationIntent,
      mentorName,
      ctaUrl,
      contextHeadline,
      contextBody,
      savedMentorCount,
      unreadMessageCount,
    } = body;

    if (!email || !sequence || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields: userId, email, sequence" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const appUrl = normalizeAppUrl(Deno.env.get("APP_URL") || "https://www.creativestakeover.com");
    const name = fullName?.trim() || "Founder";
    const finalCtaUrl = ctaUrl || getDefaultCta(activationIntent, appUrl);
    const finalCtaLabel = getDefaultCtaLabel(activationIntent);
    const emailContent = buildSequenceEmail({
      name,
      sequence,
      intent: activationIntent,
      mentorName,
      headline: contextHeadline,
      body: contextBody,
      ctaUrl: finalCtaUrl,
      ctaLabel: finalCtaLabel,
      unreadMessageCount,
      savedMentorCount,
      niche,
    });

    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    } as never);

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
  } catch (error: unknown) {
    console.error("send-retention-email: error", error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
