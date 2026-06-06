import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EventName = "signup_completed" | "onboarding_complete" | "credit_warning" | "credit_exhausted";
type ModeBody =
  | { mode: "cron" }
  | { mode: "event"; event: EventName; user_id: string };

type SequenceSlug =
  | "activation_day0"
  | "activation_day1"
  | "value_day3"
  | "checkin_day7"
  | "reengagement_day14"
  | "upgrade_day21"
  | "winback_day30"
  | "onboarding_complete"
  | "credit_warning"
  | "credit_exhausted";

interface ProfileRow {
  id: string;
  full_name: string | null;
  subscription_tier: string | null;
  credit_balance: number | null;
  onboarding_completed: boolean | null;
  last_activity_at: string | null;
  created_at: string | null;
  creative_niche?: string | null;
  business_stage?: string | null;
}

interface CreditRow {
  balance: number | null;
  monthly_quota: number | null;
  subscription_tier: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

interface UserContext {
  userId: string;
  email: string;
  firstName: string;
  profile: ProfileRow;
  credits: CreditRow;
  appUrl: string;
  starterLink: string;
}

interface BuiltEmail {
  subject: string;
  text: string;
  ctaLabel: string;
  ctaUrl: string;
}

const getEnv = (name: string) => (Deno.env.get(name) ?? "").trim();
const normalizeUrl = (value: string) => value.replace(/\/$/, "");

const supabaseUrl = getEnv("SUPABASE_URL");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFirstName(email: string, metadataName?: string | null, profileName?: string | null) {
  const rawName = metadataName?.trim() || profileName?.trim();
  if (rawName) return rawName.split(/\s+/)[0] || "there";
  return email.split("@")[0] || "there";
}

function getDaysSince(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function formatResetDate(value?: string | null) {
  if (!value) return "your next reset";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "your next reset";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

async function signUnsubscribeToken(userId: string) {
  const secret = getEnv("EMAIL_SEQUENCE_UNSUBSCRIBE_SECRET") || serviceRoleKey;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyUnsubscribeToken(userId: string, token: string) {
  const expected = await signUnsubscribeToken(userId);
  return expected === token;
}

async function authorize(req: Request, body?: ModeBody) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (token && token === serviceRoleKey) {
    return { ok: true, serviceRole: true, userId: null as string | null };
  }

  if (body?.mode === "event" && token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data.user?.id && data.user.id === body.user_id) {
      return { ok: true, serviceRole: false, userId: data.user.id };
    }
  }

  return { ok: false, serviceRole: false, userId: null as string | null };
}

async function isUnsubscribed(userId: string) {
  const { data } = await supabase
    .from("retention_email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("unsubscribed", true)
    .limit(1);

  return Boolean(data?.length);
}

async function alreadySent(userId: string, sequence: SequenceSlug, since?: string | null) {
  let query = supabase
    .from("retention_email_log")
    .select("id")
    .eq("user_id", userId)
    .eq("sequence", sequence)
    .limit(1);

  if (since) {
    query = query.gte("sent_at", since);
  }

  const { data } = await query;
  return Boolean(data?.length);
}

async function getUserContext(userId: string): Promise<UserContext | null> {
  const [{ data: profile }, { data: credits }, { data: starterTier }, authResult, { data: mentorRow }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, subscription_tier, credit_balance, onboarding_completed, last_activity_at, created_at, creative_niche, business_stage")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_credits")
        .select("balance, monthly_quota, subscription_tier, current_period_start, current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("subscription_tiers")
        .select("stripe_payment_link, stripe_payment_link_monthly")
        .eq("tier_name", "starter")
        .maybeSingle(),
      supabase.auth.admin.getUserById(userId),
      supabase
        .from("mentors")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const email = authResult.data?.user?.email?.trim();
  if (!profile || !email) return null;
  // Mentors are service providers, not active users — never send them lifecycle email.
  if (mentorRow) return null;

  const metadata = authResult.data?.user?.user_metadata as Record<string, unknown> | null;
  const metadataName = typeof metadata?.full_name === "string" ? metadata.full_name : null;
  const appUrl = normalizeUrl(getEnv("APP_URL") || getEnv("NEXT_PUBLIC_APP_URL") || "https://creatives-takeover.com");

  return {
    userId,
    email,
    firstName: getFirstName(email, metadataName, profile.full_name),
    profile: profile as ProfileRow,
    credits: (credits || {
      balance: 0,
      monthly_quota: 0,
      subscription_tier: profile.subscription_tier || "rookie",
      current_period_start: null,
      current_period_end: null,
    }) as CreditRow,
    appUrl,
    starterLink: starterTier?.stripe_payment_link_monthly || starterTier?.stripe_payment_link || `${appUrl}/pricing`,
  };
}

function buildEmail(ctx: UserContext, sequence: SequenceSlug): BuiltEmail {
  const creditsRemaining = (ctx.credits.balance || 0) + (ctx.credits.monthly_quota || 0);
  const resetDate = formatResetDate(ctx.credits.current_period_end);
  const icpUrl = `${ctx.appUrl}/icp-builder`;
  const dashboardUrl = `${ctx.appUrl}/dashboard`;
  const waitlistUrl = `${ctx.appUrl}/waitlist`;

  switch (sequence) {
    case "activation_day0":
      return {
        subject: `Your ICP takes 60 seconds, ${ctx.firstName}`,
        ctaLabel: "Build My ICP Free",
        ctaUrl: `${ctx.appUrl}/icp-builder?mode=fast&ref=email_d0`,
        text: `Hey ${ctx.firstName},

You are in. One move unlocks everything else: build your ICP.

It takes 60 seconds in fast mode, it is free, and it gives you a clear picture of exactly who you are building for.

Most founders skip this and wonder why nothing sticks. Do not skip it.

- Javier
Founder, Creatives Takeover`,
      };

    case "activation_day1": {
      const hasUsedCredits = creditsRemaining < (ctx.credits.monthly_quota || 0);
      return hasUsedCredits
        ? {
            subject: "Nice - you actually tried it",
            ctaLabel: "Keep building",
            ctaUrl: dashboardUrl,
            text: `Hey ${ctx.firstName},

You used Creatives Takeover on your first day. That puts you in rare company; most people sign up and wait.

You have ${creditsRemaining} credits left this month. The next best step is to turn that early progress into validation.

Open your dashboard and pick the next move while the momentum is still fresh.

Keep building,
Javier`,
          }
        : {
            subject: "Did something break?",
            ctaLabel: "Open ICP Builder",
            ctaUrl: icpUrl,
            text: `Hey ${ctx.firstName},

You signed up for Creatives Takeover yesterday but have not tried anything yet, so I wanted to check in.

Did something not work? Was the signup confusing? Not sure where to start?

If you are ready to jump in, start with the ICP Builder. It is free, fast, and gives you your ideal customer profile.

If something felt off, just hit reply. I will fix it.

- Javier`,
          };
    }

    case "value_day3":
      return {
        subject: "What founders are building with Rookie credits",
        ctaLabel: "Start with ICP Builder",
        ctaUrl: icpUrl,
        text: `Hey ${ctx.firstName},

Three days in, I wanted to show you what your Rookie credits are meant to unlock.

Founders use Creatives Takeover to clarify their ICP, build a waitlist, validate demand, and turn rough startup ideas into real next steps.

You do not need a cohort or an application to start. Your ICP Builder is still waiting.

- Javier`,
      };

    case "checkin_day7":
      return {
        subject: "One week in - honest question",
        ctaLabel: "Open Dashboard",
        ctaUrl: dashboardUrl,
        text: `Hey ${ctx.firstName},

You have been on Creatives Takeover for a week. Honest question: did it actually help you move forward on anything?

If yes, keep going. Most founders tackle validation next: ICP, waitlist, then PMF evidence.

If no, I want to know why. What were you hoping to do that did not happen? Hit reply. I read these.

You have ${creditsRemaining} credits left this month. Do not let them sit unused.

- Javier`,
      };

    case "reengagement_day14":
      return {
        subject: "Your account is going cold",
        ctaLabel: "Pick up where you left off",
        ctaUrl: dashboardUrl,
        text: `Hey ${ctx.firstName},

You signed up two weeks ago and have not been back since. I get it; life moves fast.

But Creatives Takeover was built for exactly this moment: when you know you need to make progress but cannot seem to start.

Pick one thing:
- Build your ICP: ${icpUrl}
- Build a waitlist: ${waitlistUrl}
- Open your dashboard: ${dashboardUrl}

One tool, one session. See if it changes anything.

- Javier`,
      };

    case "upgrade_day21":
      return {
        subject: "You've outgrown Rookie",
        ctaLabel: "Upgrade to Starter",
        ctaUrl: ctx.starterLink,
        text: `Hey ${ctx.firstName},

You have been using Creatives Takeover for three weeks, which means you are one of the rare people who actually shows up.

Rookie is enough to get started. Starter is the next step when you want validation tools, 30 credits/month, PMF Lab, Email Templates, and deeper research access.

Upgrade to Starter for $9/month and keep the validation work moving without waiting for reset.

- Javier`,
      };

    case "winback_day30":
      return {
        subject: "Before I stop emailing you...",
        ctaLabel: "Return to Creatives Takeover",
        ctaUrl: dashboardUrl,
        text: `Hey ${ctx.firstName},

I am going to stop this lifecycle sequence after this; I do not want to be noise in your inbox.

But before I do: your Creatives Takeover account is still active, your credits reset monthly, and the founder workflow is better than it was when you signed up.

If the timing was off when you joined, come back whenever it is right.

If you want me to stop emails, use the unsubscribe link below.

- Javier`,
      };

    case "onboarding_complete":
      return {
        subject: "You finished setup - here's what's next",
        ctaLabel: "Open your next step",
        ctaUrl: icpUrl,
        text: `Hey ${ctx.firstName},

You just completed onboarding. Most people do not make it that far.

Now the real work starts. Your best next move is to create or refine your ICP, then use that as the foundation for validation.

You have ${creditsRemaining} credits. Use them this week while the momentum is fresh.

- Javier`,
      };

    case "credit_warning":
      return {
        subject: "You're almost out of credits",
        ctaLabel: "Upgrade to Starter",
        ctaUrl: ctx.starterLink,
        text: `Hey ${ctx.firstName},

Quick heads up: you are down to ${creditsRemaining} credits for the month.

At this rate, you may hit zero before your reset date. When that happens, credit-metered tools pause until your next reset.

Two options:
1. Use your remaining credits on something high-leverage today: ${icpUrl}
2. Upgrade to Starter for 30 credits/month and unlock the validation layer: ${ctx.starterLink}

Your call. I just did not want you to get cut off mid-session without warning.

- Javier`,
      };

    case "credit_exhausted":
      return {
        subject: "You've hit your credit limit",
        ctaLabel: "Upgrade to Starter",
        ctaUrl: ctx.starterLink,
        text: `Hey ${ctx.firstName},

You have used all your Rookie credits for this month. That is actually a good sign; it means you are using the product.

The bad news: credit-metered tools pause until your credits reset on ${resetDate}.

The easy fix is Starter: 30 credits/month, PMF Lab, Email Templates, and deeper research access for $9/month.

If you want to keep the momentum going without waiting, this is how.

- Javier`,
      };
  }
}

function buildHtml(email: BuiltEmail, unsubscribeUrl: string) {
  const paragraphs = email.text
    .split("\n\n")
    .map((paragraph) => `<p style="margin:0 0 14px;color:#334155;">${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");

  return `
    <div style="font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6;color:#0f172a;max-width:580px;">
      ${paragraphs}
      <div style="margin:24px 0;">
        <a href="${escapeHtml(email.ctaUrl)}" style="background:#0f172a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">
          ${escapeHtml(email.ctaLabel)}
        </a>
      </div>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" />
      <p style="font-size:12px;color:#94a3b8;margin:0;">
        You are receiving this because you created an account at Creatives Takeover.
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b;">Unsubscribe</a>.
      </p>
    </div>
  `;
}

async function sendEmail(ctx: UserContext, sequence: SequenceSlug) {
  if (await isUnsubscribed(ctx.userId)) {
    return { sent: false, skipped: true, reason: "unsubscribed" };
  }

  const dedupeSince =
    sequence === "credit_warning" || sequence === "credit_exhausted"
      ? ctx.credits.current_period_start
      : null;

  if (await alreadySent(ctx.userId, sequence, dedupeSince)) {
    return { sent: false, skipped: true, reason: "already_sent" };
  }

  const resendApiKey = getEnv("RESEND_API_KEY");
  if (!resendApiKey) {
    return { sent: false, skipped: false, reason: "missing_resend_api_key" };
  }

  const built = buildEmail(ctx, sequence);
  const token = await signUnsubscribeToken(ctx.userId);
  const unsubscribeUrl = `${ctx.appUrl}/unsubscribe?user_id=${encodeURIComponent(ctx.userId)}&token=${encodeURIComponent(token)}`;
  const fromEmail = getEnv("FROM_EMAIL") || "onboarding@resend.dev";
  const fromName = getEnv("FROM_NAME") || "Creatives Takeover";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [ctx.email],
      subject: built.subject,
      html: buildHtml(built, unsubscribeUrl),
      text: `${built.text}\n\n${built.ctaLabel}: ${built.ctaUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { sent: false, skipped: false, reason: result?.message || "resend_failed" };
  }

  const resendId = result?.id || result?.data?.id || null;
  const { error } = await supabase.from("retention_email_log").insert({
    user_id: ctx.userId,
    email: ctx.email,
    sequence,
    sent_at: new Date().toISOString(),
    resend_id: resendId,
    unsubscribed: false,
  });

  if (error) {
    return { sent: false, skipped: false, reason: error.message };
  }

  return { sent: true, skipped: false, reason: null, resendId };
}

async function runEvent(event: EventName, userId: string) {
  const sequenceByEvent: Record<EventName, SequenceSlug> = {
    signup_completed: "activation_day0",
    onboarding_complete: "onboarding_complete",
    credit_warning: "credit_warning",
    credit_exhausted: "credit_exhausted",
  };

  const ctx = await getUserContext(userId);
  if (!ctx) return { processed: 0, sent: 0, skipped: 1, errors: [{ user_id: userId, error: "missing_user_context" }] };

  const result = await sendEmail(ctx, sequenceByEvent[event]);
  return {
    processed: 1,
    sent: result.sent ? 1 : 0,
    skipped: result.skipped ? 1 : 0,
    errors: !result.sent && !result.skipped ? [{ user_id: userId, error: result.reason }] : [],
  };
}

function windowForDay(day: number) {
  const target = Date.now() - day * 86_400_000;
  return {
    start: new Date(target - 6 * 60 * 60 * 1000).toISOString(),
    end: new Date(target + 6 * 60 * 60 * 1000).toISOString(),
  };
}

async function fetchProfilesSignedUpAround(day: number) {
  const { start, end } = windowForDay(day);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, subscription_tier, credit_balance, onboarding_completed, last_activity_at, created_at, creative_niche, business_stage")
    .gte("created_at", start)
    .lte("created_at", end)
    .limit(1000);

  if (error) throw error;
  return (data || []) as ProfileRow[];
}

function isInactiveSinceSignup(profile: ProfileRow) {
  const created = profile.created_at ? new Date(profile.created_at).getTime() : 0;
  const last = profile.last_activity_at ? new Date(profile.last_activity_at).getTime() : created;
  if (!created || Number.isNaN(created) || Number.isNaN(last)) return true;
  return last <= created + 24 * 60 * 60 * 1000;
}

function inactiveForAtLeast(profile: ProfileRow, days: number) {
  const last = profile.last_activity_at || profile.created_at;
  return getDaysSince(last) >= days;
}

async function runCron() {
  const jobs: Array<{ day: number; sequence: SequenceSlug; filter: (profile: ProfileRow, ctx: UserContext) => boolean }> = [
    { day: 1, sequence: "activation_day1", filter: () => true },
    { day: 3, sequence: "value_day3", filter: (profile) => profile.onboarding_completed !== true },
    { day: 7, sequence: "checkin_day7", filter: () => true },
    { day: 14, sequence: "reengagement_day14", filter: (profile) => isInactiveSinceSignup(profile) },
    {
      day: 21,
      sequence: "upgrade_day21",
      filter: (_profile, ctx) => {
        const tier = (ctx.credits.subscription_tier || ctx.profile.subscription_tier || "rookie").toLowerCase();
        const total = (ctx.credits.balance || 0) + (ctx.credits.monthly_quota || 0);
        return tier === "rookie" && total < (ctx.credits.monthly_quota || 0);
      },
    },
    { day: 30, sequence: "winback_day30", filter: (profile) => inactiveForAtLeast(profile, 20) },
  ];

  const summary = {
    processed: 0,
    sent: 0,
    skipped: 0,
    errors: [] as Array<{ user_id: string; sequence: string; error: string | null }>,
  };

  for (const job of jobs) {
    const profiles = await fetchProfilesSignedUpAround(job.day);
    for (const profile of profiles) {
      summary.processed += 1;
      const ctx = await getUserContext(profile.id);
      if (!ctx || !job.filter(profile, ctx)) {
        summary.skipped += 1;
        continue;
      }

      const result = await sendEmail(ctx, job.sequence);
      if (result.sent) summary.sent += 1;
      else summary.skipped += 1;
      if (!result.sent && !result.skipped) {
        summary.errors.push({ user_id: profile.id, sequence: job.sequence, error: result.reason });
      }
    }
  }

  return summary;
}

async function handleUnsubscribe(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id") || "";
  const token = url.searchParams.get("token") || "";

  if (!userId || !token || !(await verifyUnsubscribeToken(userId, token))) {
    return new Response("Invalid unsubscribe link.", { status: 401, headers: { "Content-Type": "text/plain" } });
  }

  await supabase
    .from("retention_email_log")
    .update({ unsubscribed: true })
    .eq("user_id", userId);

  return new Response("You have been unsubscribed from Creatives Takeover lifecycle emails.", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("unsubscribe") === "1") return handleUnsubscribe(req);
    return json({ ok: false, error: "Not found" }, 404);
  }

  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: "Supabase env vars missing" }, 500);

  try {
    const body = await req.json() as ModeBody;
    const auth = await authorize(req, body);
    if (!auth.ok) return json({ ok: false, error: "Unauthorized" }, 401);

    if (body.mode === "cron") {
      if (!auth.serviceRole) return json({ ok: false, error: "Cron requires service role authorization" }, 401);
      const summary = await runCron();
      return json({ ok: true, mode: "cron", ...summary });
    }

    if (body.mode === "event") {
      const summary = await runEvent(body.event, body.user_id);
      return json({ ok: true, mode: "event", event: body.event, user_id: body.user_id, ...summary });
    }

    return json({ ok: false, error: "Invalid mode" }, 400);
  } catch (error) {
    console.error("[email-sequences] Unhandled error", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
