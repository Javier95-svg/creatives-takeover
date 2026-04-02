import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BizMapStage = "IDENTITY" | "PROTOTYPE" | "VALIDATING" | "BUILDING" | "LAUNCH";

const STAGE_META: Record<BizMapStage, { label: string; action: string; route: string }> = {
  IDENTITY: {
    label: "Identity",
    action: "Open ICP Builder and tighten one customer pain statement today.",
    route: "/icp-builder",
  },
  PROTOTYPE: {
    label: "Prototype",
    action: "Open Waitlist Maker and improve your headline plus CTA today.",
    route: "/waitlist",
  },
  VALIDATING: {
    label: "Validation",
    action: "Open PMF Lab and log one real customer signal today.",
    route: "/pmf-lab",
  },
  BUILDING: {
    label: "Building",
    action: "Open MVP Builder and lock one scope decision today.",
    route: "/mvp-builder",
  },
  LAUNCH: {
    label: "Launch",
    action: "Open GTM Strategist and commit one channel action for today.",
    route: "/go-to-market",
  },
};

const DEFAULT_STAGE: BizMapStage = "IDENTITY";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

type ReEngagementSendPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeStage(value: unknown): BizMapStage {
  if (typeof value === "string" && value in STAGE_META) {
    return value as BizMapStage;
  }
  return DEFAULT_STAGE;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizePlatformBaseUrl(value: string) {
  return value.replace(/\/$/, "").replace(/\/dashboard$/, "");
}

function buildEmailHtml({
  name,
  stageLabel,
  action,
  platformUrl,
}: {
  name: string;
  stageLabel: string;
  action: string;
  platformUrl: string;
}) {
  const safeName = escapeHtml(name);
  const safeStage = escapeHtml(stageLabel);
  const safeAction = escapeHtml(action);
  const safePlatformUrl = escapeHtml(platformUrl);

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <h2 style="margin: 0 0 16px;">Hi ${safeName}, your startup is still in motion</h2>
      <p style="margin: 0 0 12px;">
        You last showed activity a few days ago, and your current BizMap stage is <strong>${safeStage}</strong>.
      </p>
      <p style="margin: 0 0 12px;">
        The best move today: <strong>${safeAction}</strong>
      </p>
      <div style="margin: 24px 0;">
        <a href="${safePlatformUrl}"
           style="background:#111827;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:8px;display:inline-block;font-weight:600;">
          Jump back into Creatives Takeover
        </a>
      </div>
      <p style="margin: 0 0 8px; color:#4b5563;">
        You do not need a full reset. One focused session is enough to get momentum back.
      </p>
      <p style="margin: 0; color:#6b7280; font-size: 14px;">
        The Creatives Takeover team
      </p>
    </div>
  `;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    if (!resend) {
      return jsonResponse({ error: "RESEND_API_KEY is not configured" }, 500);
    }

    const appBaseUrl = normalizePlatformBaseUrl(Deno.env.get("APP_URL") || "https://www.creativestakeover.com");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
    const replyTo = Deno.env.get("REPLY_TO_EMAIL");
    const nowIso = new Date().toISOString();
    const inactiveThresholdIso = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const resendThresholdIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, last_seen_at, last_activity_at, last_active_at")
      .lte("last_seen_at", inactiveThresholdIso);

    if (profilesError) {
      throw profilesError;
    }

    const candidateProfiles = (profiles ?? []).filter((profile) => {
      const effectiveLastSeen = profile.last_seen_at ?? profile.last_activity_at ?? profile.last_active_at;
      return Boolean(effectiveLastSeen) && new Date(effectiveLastSeen).getTime() <= new Date(inactiveThresholdIso).getTime();
    });

    if (candidateProfiles.length === 0) {
      return jsonResponse({
        success: true,
        processed: 0,
        sent: 0,
        skipped_recently_emailed: 0,
      });
    }

    const userIds = candidateProfiles.map((profile) => profile.id);

    const [{ data: progressRows, error: progressError }, { data: recentEmails, error: recentEmailsError }] = await Promise.all([
      supabase
        .from("user_progress")
        .select("user_id, current_stage")
        .in("user_id", userIds),
      supabase
        .from("re_engagement_emails")
        .select("user_id, sent_at")
        .in("user_id", userIds)
        .gte("sent_at", resendThresholdIso),
    ]);

    if (progressError) throw progressError;
    if (recentEmailsError) throw recentEmailsError;

    const recentEmailUserIds = new Set((recentEmails ?? []).map((row) => row.user_id));
    const progressByUserId = new Map((progressRows ?? []).map((row) => [row.user_id, normalizeStage(row.current_stage)]));

    let sent = 0;
    let skippedRecentlyEmailed = 0;
    const skippedMissingEmail: string[] = [];
    const failures: Array<{ user_id: string; reason: string }> = [];

    for (const profile of candidateProfiles) {
      if (recentEmailUserIds.has(profile.id)) {
        skippedRecentlyEmailed++;
        continue;
      }

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email?.trim();

      if (authError || !email) {
        skippedMissingEmail.push(profile.id);
        continue;
      }

      const stage = progressByUserId.get(profile.id) ?? DEFAULT_STAGE;
      const stageMeta = STAGE_META[stage];
      const userName = profile.full_name?.trim() || email.split("@")[0] || "there";
      const directLink = `${appBaseUrl}${stageMeta.route}`;
      const subject = `${userName}, pick up your ${stageMeta.label.toLowerCase()} stage today`;
      const html = buildEmailHtml({
        name: userName,
        stageLabel: stageMeta.label,
        action: stageMeta.action,
        platformUrl: directLink,
      });

      const payload: ReEngagementSendPayload = {
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject,
        html,
      };

      if (replyTo && replyTo.trim().length > 0) {
        payload.replyTo = replyTo.trim();
      }

      try {
        const sendResult = await resend.emails.send(payload);

        if (sendResult.error) {
          failures.push({ user_id: profile.id, reason: JSON.stringify(sendResult.error) });
          continue;
        }

        const { error: insertError } = await supabase
          .from("re_engagement_emails")
          .insert({
            user_id: profile.id,
            sent_at: nowIso,
            stage_at_send: stage,
            opened: false,
          });

        if (insertError) {
          failures.push({ user_id: profile.id, reason: insertError.message });
          continue;
        }

        sent++;
      } catch (error) {
        failures.push({
          user_id: profile.id,
          reason: error instanceof Error ? error.message : "Unknown send error",
        });
      }
    }

    return jsonResponse({
      success: true,
      processed: candidateProfiles.length,
      sent,
      skipped_recently_emailed: skippedRecentlyEmailed,
      skipped_missing_email: skippedMissingEmail.length,
      failures,
    });
  } catch (error) {
    console.error("check-inactive-users error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
