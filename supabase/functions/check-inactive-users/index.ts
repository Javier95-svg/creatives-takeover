import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActivationIntent = "save_mentor" | "send_message" | "book_call";
type SequenceType =
  | "activation_day2"
  | "activation_day7"
  | "weekly_digest"
  | "activation_nudge"
  | "progress_nudge";

type JsonRecord = Record<string, unknown>;

interface ProfileRow {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  creative_niche: string | null;
  onboarding_completed: boolean | null;
  user_preferences: JsonRecord | null;
  last_seen_at: string | null;
  last_activity_at: string | null;
  last_active_at: string | null;
}

interface UserAssetState {
  savedMentorCount: number;
  latestSavedMentorName: string | null;
  unreadMessageCount: number;
  hasDiscoveryCall: boolean;
}

interface SequenceDecision {
  sequence: SequenceType;
  ctaUrl: string;
  contextHeadline: string;
  contextBody: string;
}

const DAY_2_MS = 2 * 24 * 60 * 60 * 1000;
const DAY_7_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_14_MS = 14 * 24 * 60 * 60 * 1000;

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getPreferenceString(preferences: JsonRecord | null, key: string): string | null {
  const value = preferences?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getActivationIntent(value: string | null): ActivationIntent | null {
  if (value === "save_mentor" || value === "send_message" || value === "book_call") {
    return value;
  }

  return null;
}

function getIso(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function getLastSeenAt(profile: ProfileRow) {
  return (
    getIso(profile.last_seen_at) ||
    getIso(profile.last_activity_at) ||
    getIso(profile.last_active_at) ||
    getIso(profile.updated_at) ||
    getIso(profile.created_at)
  );
}

function getDefaultCta(intent: ActivationIntent, appBaseUrl: string) {
  switch (intent) {
    case "save_mentor":
      return `${appBaseUrl}/community?mentorSource=saved`;
    case "send_message":
      return `${appBaseUrl}/messages`;
    case "book_call":
      return `${appBaseUrl}/community?mentorSource=booked-call`;
  }
}

function buildSequenceDecision(args: {
  appBaseUrl: string;
  intent: ActivationIntent;
  activationCompleted: boolean;
  assets: UserAssetState;
  firstValueActionAt: string | null;
  lastSeenAt: string | null;
}): SequenceDecision | null {
  const { appBaseUrl, intent, activationCompleted, assets, firstValueActionAt, lastSeenAt } = args;
  const now = Date.now();
  const lastSeenMs = lastSeenAt ? Date.parse(lastSeenAt) : 0;
  const firstValueMs = firstValueActionAt ? Date.parse(firstValueActionAt) : 0;
  const inactiveFor = lastSeenMs > 0 ? now - lastSeenMs : Number.MAX_SAFE_INTEGER;
  const ageSinceValue = firstValueMs > 0 ? now - firstValueMs : 0;
  const latestSavedMentor = assets.latestSavedMentorName || "your saved mentor";

  if (!activationCompleted) {
    if (inactiveFor >= DAY_7_MS) {
      return {
        sequence: "progress_nudge",
        ctaUrl: getDefaultCta(intent, appBaseUrl),
        contextHeadline: "You started onboarding but never created the first asset that gives you a reason to return.",
        contextBody:
          intent === "save_mentor"
            ? "Save one mentor before you browse anything else. That gives the product a real person to bring you back to."
            : intent === "send_message"
              ? "Start one mentor conversation before you explore the rest of the product. A live thread is still the clearest return trigger in the data."
              : "Book one discovery call before you keep browsing. It is the highest-intent action in the current funnel.",
      };
    }

    if (inactiveFor >= DAY_2_MS) {
      return {
        sequence: "activation_nudge",
        ctaUrl: getDefaultCta(intent, appBaseUrl),
        contextHeadline: "Your first value action is still waiting.",
        contextBody:
          intent === "save_mentor"
            ? "Choose one mentor worth returning to and save them now. That creates a persistent anchor for the rest of the retention system."
            : intent === "send_message"
              ? "Send one message now so the product can pull you back with a reply instead of generic reminders."
              : "Book one discovery call now so you leave with a real next step instead of another passive session.",
      };
    }

    return null;
  }

  if (inactiveFor >= DAY_14_MS && (assets.savedMentorCount > 0 || assets.unreadMessageCount > 0 || assets.hasDiscoveryCall)) {
    return {
      sequence: "weekly_digest",
      ctaUrl:
        assets.unreadMessageCount > 0
          ? `${appBaseUrl}/messages`
          : assets.savedMentorCount > 0
            ? `${appBaseUrl}/community?mentorSource=saved`
            : `${appBaseUrl}/community?mentorSource=booked-call`,
      contextHeadline:
        assets.unreadMessageCount > 0
          ? `You still have ${assets.unreadMessageCount} message ${assets.unreadMessageCount === 1 ? "reply" : "replies"} waiting.`
          : assets.savedMentorCount > 0
            ? `You still have ${assets.savedMentorCount} saved mentor${assets.savedMentorCount === 1 ? "" : "s"} connected to your account.`
            : "You still have a discovery-call path worth following through.",
      contextBody:
        assets.unreadMessageCount > 0
          ? "Start by moving one conversation forward. Messages are still the strongest return trigger in the product."
          : assets.savedMentorCount > 0
            ? `Revisit ${latestSavedMentor} and decide which mentor relationship deserves real follow-up this week.`
            : "Use the mentor marketplace to prepare one focused question for your next discovery conversation.",
    };
  }

  if (inactiveFor >= DAY_7_MS && ageSinceValue >= DAY_7_MS) {
    return {
      sequence: "activation_day7",
      ctaUrl:
        assets.unreadMessageCount > 0
          ? `${appBaseUrl}/messages`
          : assets.savedMentorCount > 0
            ? `${appBaseUrl}/community?mentorSource=saved`
            : getDefaultCta(intent, appBaseUrl),
      contextHeadline:
        assets.unreadMessageCount > 0
          ? "Week 2 is where users disappear. Your open replies are still the best reason to come back."
          : assets.savedMentorCount > 0
            ? `Week 2 is where users disappear. ${latestSavedMentor} is still your cleanest route back into the product.`
            : "Week 2 is where users disappear. The fastest recovery is reopening the exact action you already started.",
      contextBody:
        assets.unreadMessageCount > 0
          ? "Open Messages and move one thread forward today."
          : assets.savedMentorCount > 0
            ? "Open your saved mentors and turn one saved profile into a real follow-up action."
            : intent === "book_call"
              ? "Use the next session to pressure-test one decision with a mentor instead of resetting your whole workflow."
              : "The best recovery is one focused session tied to the action you already started.",
    };
  }

  if (inactiveFor >= DAY_2_MS && ageSinceValue >= DAY_2_MS) {
    return {
      sequence: "activation_day2",
      ctaUrl:
        assets.unreadMessageCount > 0
          ? `${appBaseUrl}/messages`
          : assets.savedMentorCount > 0
            ? `${appBaseUrl}/community?mentorSource=saved`
            : getDefaultCta(intent, appBaseUrl),
      contextHeadline:
        assets.unreadMessageCount > 0
          ? `You still have ${assets.unreadMessageCount} message ${assets.unreadMessageCount === 1 ? "reply" : "replies"} waiting.`
          : assets.savedMentorCount > 0
            ? `You saved ${latestSavedMentor} but have not turned that into follow-up yet.`
            : "Your first value action is still open.",
      contextBody:
        assets.unreadMessageCount > 0
          ? "Pick up the conversation before the thread goes cold."
          : assets.savedMentorCount > 0
            ? "Go back to your saved mentors and move one relationship forward before the momentum fades."
            : intent === "book_call"
              ? "You already created a high-intent path. Use it to move one real decision forward."
              : "The product only retains when it points you back to a real asset, thread, or next step.",
    };
  }

  return null;
}

async function getUserAssetState(userId: string): Promise<UserAssetState> {
  const { data: savedMentors, error: savedMentorError } = await supabase
    .from("mentor_saves")
    .select("created_at, mentor:mentors(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (savedMentorError) {
    throw savedMentorError;
  }

  const latestSavedMentorName = (savedMentors ?? []).find((row) => {
    const mentor = row as { mentor?: { name?: string } | null };
    return typeof mentor.mentor?.name === "string" && mentor.mentor.name.trim().length > 0;
  });

  const { data: conversations, error: conversationError } = await supabase
    .from("conversations")
    .select("id")
    .contains("participants", [userId]);

  if (conversationError) {
    throw conversationError;
  }

  const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
  let unreadMessageCount = 0;

  if (conversationIds.length > 0) {
    const { count, error: unreadError } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .neq("sender_id", userId)
      .eq("is_read", false);

    if (unreadError) {
      throw unreadError;
    }

    unreadMessageCount = count ?? 0;
  }

  const { data: recentBooking, error: bookingError } = await supabase
    .from("user_activity_log")
    .select("id")
    .eq("user_id", userId)
    .eq("activity_type", "discovery_call_booked")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bookingError) {
    throw bookingError;
  }

  return {
    savedMentorCount: savedMentors?.length ?? 0,
    latestSavedMentorName:
      ((latestSavedMentorName as { mentor?: { name?: string } | null } | undefined)?.mentor?.name ?? null),
    unreadMessageCount,
    hasDiscoveryCall: Boolean(recentBooking),
  };
}

async function sendRetentionEmail(args: {
  userId: string;
  email: string;
  fullName: string | null;
  niche: string | null;
  activationIntent: ActivationIntent;
  sequence: SequenceType;
  ctaUrl: string;
  contextHeadline: string;
  contextBody: string;
  savedMentorCount: number;
  unreadMessageCount: number;
}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-retention-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify(args),
  });

  const json = await response.json();
  if (!response.ok || (!json.ok && !json.skipped)) {
    throw new Error(`send-retention-email failed: ${JSON.stringify(json)}`);
  }

  return json;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const appBaseUrl = (Deno.env.get("APP_URL") || "https://www.creativestakeover.com")
      .replace(/\/$/, "")
      .replace(/\/dashboard$/, "");

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select(
        "id, created_at, updated_at, full_name, creative_niche, onboarding_completed, user_preferences, last_seen_at, last_activity_at, last_active_at",
      );

    if (profilesError) {
      throw profilesError;
    }

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      sent_by_sequence: {
        activation_nudge: 0,
        progress_nudge: 0,
        activation_day2: 0,
        activation_day7: 0,
        weekly_digest: 0,
      },
      failures: [] as Array<{ user_id: string; reason: string }>,
    };

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      results.processed++;

      try {
        const authResult = await supabase.auth.admin.getUserById(profile.id);
        const email = authResult.data.user?.email?.trim() ?? "";

        if (!email || email.toLowerCase() === "admin@creatives-takeover.com") {
          results.skipped++;
          continue;
        }

        const preferences = (profile.user_preferences ?? {}) as JsonRecord;
        const explicitIntent = getActivationIntent(getPreferenceString(preferences, "activationIntent"));
        const activationCompleted = profile.onboarding_completed === true;
        const firstValueActionAt =
          getPreferenceString(preferences, "firstValueActionAt") ||
          getPreferenceString(preferences, "activationCompletedAt");
        const lastSeenAt = getLastSeenAt(profile);
        const assets = await getUserAssetState(profile.id);
        const activationIntent =
          explicitIntent ||
          (assets.unreadMessageCount > 0
            ? "send_message"
            : assets.savedMentorCount > 0
              ? "save_mentor"
              : assets.hasDiscoveryCall
                ? "book_call"
                : null);

        if (!activationIntent) {
          results.skipped++;
          continue;
        }

        const sequenceDecision = buildSequenceDecision({
          appBaseUrl,
          intent: activationIntent,
          activationCompleted,
          assets,
          firstValueActionAt,
          lastSeenAt,
        });

        if (!sequenceDecision) {
          results.skipped++;
          continue;
        }

        const sendResult = await sendRetentionEmail({
          userId: profile.id,
          email,
          fullName: profile.full_name,
          niche: profile.creative_niche,
          activationIntent,
          sequence: sequenceDecision.sequence,
          ctaUrl: sequenceDecision.ctaUrl,
          contextHeadline: sequenceDecision.contextHeadline,
          contextBody: sequenceDecision.contextBody,
          savedMentorCount: assets.savedMentorCount,
          unreadMessageCount: assets.unreadMessageCount,
        });

        if (!sendResult.skipped) {
          results.sent++;
          results.sent_by_sequence[sequenceDecision.sequence]++;
        }
      } catch (error) {
        results.failures.push({
          user_id: profile.id,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return jsonResponse({
      success: true,
      ...results,
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
