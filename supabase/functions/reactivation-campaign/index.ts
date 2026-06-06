import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const CAMPAIGN_ID = "reactivation_may_2026";
const GIFT_AMOUNT = 15;
const INACTIVITY_DAYS = 7;
const EMAIL_DELAY_MS = 100;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type CreditRow = {
  user_id: string;
  balance: number;
  current_period_end: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  last_activity_at: string | null;
};

type EligibleUser = {
  id: string;
  full_name: string | null;
  last_activity_at: string | null;
  current_balance: number;
  current_period_end: string | null;
  days_since_last_activity: number | null;
  email?: string | null;
};

type CampaignError = {
  user_id: string;
  error: string;
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function isAuthorized(req: Request) {
  const expectedSecret = Deno.env.get("REACTIVATION_CAMPAIGN_SECRET")?.trim();
  if (!expectedSecret) {
    return { ok: false, status: 500, error: "Campaign secret is not configured" };
  }

  const authHeader = req.headers.get("Authorization")?.trim() ?? "";
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true, status: 200, error: null };
}

function daysSince(timestamp: string | null) {
  if (!timestamp) return null;
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.floor((Date.now() - value) / (24 * 60 * 60 * 1000)));
}

function getFirstName(fullName: string | null | undefined) {
  const first = fullName?.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : "there";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) {
    throw new Error(error.message);
  }

  const email = data.user?.email?.trim();
  return email && email.includes("@") ? email : null;
}

async function fetchEligibleUsers(options: { includeEmail: boolean }): Promise<EligibleUser[]> {
  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const { data: creditRows, error: creditError } = await supabase
    .from("user_credits")
    .select("user_id, balance, current_period_end")
    .eq("balance", 0)
    .eq("subscription_tier", "rookie");

  if (creditError) {
    throw new Error(`Unable to fetch zero-balance Rookie users: ${creditError.message}`);
  }

  const credits = (creditRows ?? []) as CreditRow[];
  if (credits.length === 0) {
    return [];
  }

  const userIds = credits.map((row) => row.user_id);

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, last_activity_at")
    .in("id", userIds);

  if (profileError) {
    throw new Error(`Unable to fetch profiles: ${profileError.message}`);
  }

  const profilesById = new Map<string, ProfileRow>();
  for (const profile of (profileRows ?? []) as ProfileRow[]) {
    profilesById.set(profile.id, profile);
  }

  const inactiveCredits = credits.filter((credit) => {
    const profile = profilesById.get(credit.user_id);
    if (!profile) return false;
    if (!profile.last_activity_at) return true;
    return new Date(profile.last_activity_at).getTime() < cutoff.getTime();
  });

  if (inactiveCredits.length === 0) {
    return [];
  }

  const inactiveIds = inactiveCredits.map((row) => row.user_id);
  const { data: campaignRows, error: campaignError } = await supabase
    .from("credit_transactions")
    .select("user_id")
    .in("user_id", inactiveIds)
    .eq("metadata->>campaign", CAMPAIGN_ID);

  if (campaignError) {
    throw new Error(`Unable to check campaign idempotency: ${campaignError.message}`);
  }

  const alreadyGrantedIds = new Set(
    ((campaignRows ?? []) as Array<{ user_id: string }>).map((row) => row.user_id),
  );

  // Mentors are service providers, not active users — exclude from reactivation.
  const { data: mentorRows } = await supabase
    .from("mentors")
    .select("user_id")
    .in("user_id", inactiveIds);
  const mentorIds = new Set(
    ((mentorRows ?? []) as Array<{ user_id: string | null }>)
      .map((row) => row.user_id)
      .filter((id): id is string => Boolean(id)),
  );

  const eligible: EligibleUser[] = inactiveCredits
    .filter((credit) => !alreadyGrantedIds.has(credit.user_id) && !mentorIds.has(credit.user_id))
    .map((credit) => {
      const profile = profilesById.get(credit.user_id)!;
      return {
        id: credit.user_id,
        full_name: profile.full_name,
        last_activity_at: profile.last_activity_at,
        current_balance: credit.balance,
        current_period_end: credit.current_period_end,
        days_since_last_activity: daysSince(profile.last_activity_at),
      };
    });

  if (!options.includeEmail) {
    return eligible;
  }

  const usersWithEmails: EligibleUser[] = [];
  for (const user of eligible) {
    try {
      usersWithEmails.push({ ...user, email: await getUserEmail(user.id) });
    } catch (error) {
      console.error("reactivation-campaign: unable to fetch dry-run email", {
        userId: user.id,
        error: String(error),
      });
      usersWithEmails.push({ ...user, email: null });
    }
  }

  return usersWithEmails;
}

function buildEmail(args: { firstName: string; dashboardUrl: string }) {
  const safeFirstName = escapeHtml(args.firstName);
  const safeDashboardUrl = escapeHtml(args.dashboardUrl);

  const text = `Hey ${args.firstName},

You started building on Creatives Takeover - and we haven't forgotten.

We just added 15 credits to your account. That's enough to run a full ICP analysis or generate your Launch Report today.

Your ideas deserve a proper look. Pick up where you left off:

Continue building: ${args.dashboardUrl}

- The Creatives Takeover team`;

  const html = `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px;">
      <p style="margin: 0 0 16px;">Hey ${safeFirstName},</p>
      <p style="margin: 0 0 16px;">You started building on Creatives Takeover - and we haven't forgotten.</p>
      <p style="margin: 0 0 16px;">We just added <strong>15 credits</strong> to your account. That's enough to run a full ICP analysis or generate your Launch Report today.</p>
      <p style="margin: 0 0 20px;">Your ideas deserve a proper look. Pick up where you left off:</p>
      <div style="margin: 24px 0;">
        <a href="${safeDashboardUrl}" style="background: #32b8c6; color: #ffffff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
          Continue building &rarr;
        </a>
      </div>
      <p style="margin: 24px 0 0; color: #64748b; font-size: 13px;">- The Creatives Takeover team</p>
    </div>
  `;

  return { text, html };
}

async function sendReactivationEmail(args: {
  to: string;
  firstName: string;
}) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY is not configured" };
  }

  const appUrl = (
    Deno.env.get("APP_URL") ??
    Deno.env.get("NEXT_PUBLIC_APP_URL") ??
    "https://creatives-takeover.com"
  ).replace(/\/$/, "");
  const dashboardUrl = `${appUrl}/dashboard`;
  const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
  const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
  const replyTo = Deno.env.get("REPLY_TO_EMAIL");
  const { text, html } = buildEmail({ firstName: args.firstName, dashboardUrl });

  const payload: Record<string, unknown> = {
    from: `${fromName} <${fromEmail}>`,
    to: [args.to],
    subject: `We saved 15 credits for you, ${args.firstName}`,
    text,
    html,
  };

  if (replyTo && replyTo.trim().length > 0) {
    payload.reply_to = replyTo.trim();
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: await response.text() };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function grantBonus(user: EligibleUser) {
  const grantedAt = new Date().toISOString();
  const { data, error } = await supabase.rpc("grant_reactivation_campaign_bonus", {
    p_user_id: user.id,
    p_campaign: CAMPAIGN_ID,
    p_amount: GIFT_AMOUNT,
    p_granted_at: grantedAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data as { granted?: boolean; reason?: string; amount?: number } | null;
  if (!result?.granted) {
    return { granted: false, reason: result?.reason ?? "unknown_skip_reason" };
  }

  return { granted: true, reason: null };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authorization = isAuthorized(req);
  if (!authorization.ok) {
    return jsonResponse({ error: authorization.error }, authorization.status);
  }

  try {
    const url = new URL(req.url);

    if (req.method === "GET") {
      if (url.searchParams.get("dry_run") !== "true") {
        return jsonResponse({ error: "Use dry_run=true for GET verification" }, 400);
      }

      const eligibleUsers = await fetchEligibleUsers({ includeEmail: true });
      return jsonResponse({
        mode: "dry_run",
        eligible_count: eligibleUsers.length,
        users: eligibleUsers.map((user) => ({
          id: user.id,
          email: user.email ?? null,
          current_balance: user.current_balance,
          days_since_last_activity: user.days_since_last_activity,
        })),
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const eligibleUsers = await fetchEligibleUsers({ includeEmail: false });
    const errors: CampaignError[] = [];
    let usersProcessed = 0;
    let emailsSent = 0;
    let skipped = 0;

    for (const user of eligibleUsers) {
      try {
        const grantResult = await grantBonus(user);

        if (!grantResult.granted) {
          skipped += 1;
          continue;
        }

        usersProcessed += 1;

        let email: string | null = null;
        let emailLookupError: string | null = null;
        try {
          email = await getUserEmail(user.id);
        } catch (error) {
          emailLookupError = String(error);
        }

        if (emailLookupError) {
          errors.push({ user_id: user.id, error: `Email lookup failed: ${emailLookupError}` });
          continue;
        }

        if (!email) {
          errors.push({ user_id: user.id, error: "Email not found after credit grant" });
          continue;
        }

        const emailResult = await sendReactivationEmail({
          to: email,
          firstName: getFirstName(user.full_name),
        });

        if (emailResult.success) {
          emailsSent += 1;
        } else {
          errors.push({
            user_id: user.id,
            error: `Email send failed: ${emailResult.error ?? "Unknown Resend error"}`,
          });
        }

        await sleep(EMAIL_DELAY_MS);
      } catch (error) {
        errors.push({ user_id: user.id, error: String(error) });
      }
    }

    return jsonResponse({
      mode: "live",
      users_processed: usersProcessed,
      credits_granted: usersProcessed * GIFT_AMOUNT,
      emails_sent: emailsSent,
      skipped,
      errors,
    });
  } catch (error) {
    console.error("reactivation-campaign: fatal error", error);
    return jsonResponse({ error: String(error) }, 500);
  }
});
