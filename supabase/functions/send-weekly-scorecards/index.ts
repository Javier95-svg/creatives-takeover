import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type WeeklyCheckinDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

interface WeeklyMissionRow {
  id: string;
  user_id: string;
  mission_goal: string;
  status: string | null;
  commitment_outcome: string | null;
  week_start_date: string;
  week_end_date: string;
  completion_percentage: number | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  creative_niche: string | null;
  business_stage: string | null;
  onboarding_completed: boolean | null;
  user_preferences: Record<string, unknown> | null;
}

interface AccountabilityPreferences {
  weekly_checkin_day: WeeklyCheckinDay;
  timezone: string;
  weekly_scorecard_local_hour: number;
  last_weekly_scorecard_week_start: string | null;
}

const WEEKDAY_ORDER: WeeklyCheckinDay[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const SHORT_WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const DEFAULT_PREFERENCES: AccountabilityPreferences = {
  weekly_checkin_day: "monday",
  timezone: "UTC",
  weekly_scorecard_local_hour: 18,
  last_weekly_scorecard_week_start: null,
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isWeeklyCheckinDay(value: unknown): value is WeeklyCheckinDay {
  return typeof value === "string" && WEEKDAY_ORDER.includes(value as WeeklyCheckinDay);
}

function normalizePreferences(userPreferences: Record<string, unknown> | null | undefined): AccountabilityPreferences {
  const preferences = userPreferences ?? {};
  const rawHour = typeof preferences.weekly_scorecard_local_hour === "number"
    ? preferences.weekly_scorecard_local_hour
    : Number(preferences.weekly_scorecard_local_hour);

  return {
    weekly_checkin_day: isWeeklyCheckinDay(preferences.weekly_checkin_day)
      ? preferences.weekly_checkin_day
      : DEFAULT_PREFERENCES.weekly_checkin_day,
    timezone:
      typeof preferences.timezone === "string" && preferences.timezone.trim().length > 0
        ? preferences.timezone
        : DEFAULT_PREFERENCES.timezone,
    weekly_scorecard_local_hour: Number.isFinite(rawHour)
      ? Math.max(0, Math.min(23, Math.round(rawHour)))
      : DEFAULT_PREFERENCES.weekly_scorecard_local_hour,
    last_weekly_scorecard_week_start:
      typeof preferences.last_weekly_scorecard_week_start === "string" &&
      preferences.last_weekly_scorecard_week_start.trim().length > 0
        ? preferences.last_weekly_scorecard_week_start
        : null,
  };
}

function getTimezoneParts(referenceDate: Date, timeZone: string) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hour12: false,
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hour12: false,
    });
  }
  const parts = formatter.formatToParts(referenceDate);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
    weekdayIndex: SHORT_WEEKDAY_TO_INDEX[partMap.weekday] ?? 0,
    hour: Number(partMap.hour),
  };
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getCurrentWeekWindow(preferences: AccountabilityPreferences, referenceDate = new Date()) {
  const localParts = getTimezoneParts(referenceDate, preferences.timezone);
  const localDateAsUtc = new Date(Date.UTC(localParts.year, localParts.month - 1, localParts.day));
  const startDayIndex = WEEKDAY_ORDER.indexOf(preferences.weekly_checkin_day);
  const diffToWeekStart = (localParts.weekdayIndex - startDayIndex + 7) % 7;

  const weekStartDate = new Date(localDateAsUtc);
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - diffToWeekStart);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

  return {
    start: formatDate(weekStartDate),
    end: formatDate(weekEndDate),
    localHour: localParts.hour,
    localWeekdayIndex: localParts.weekdayIndex,
  };
}

function getScorecardDueWeekday(startDay: WeeklyCheckinDay) {
  const startIndex = WEEKDAY_ORDER.indexOf(startDay);
  return WEEKDAY_ORDER[(startIndex + 6) % 7];
}

function shouldSendScorecardNow(preferences: AccountabilityPreferences, referenceDate = new Date()) {
  const dueWeekday = getScorecardDueWeekday(preferences.weekly_checkin_day);
  const dueWeekdayIndex = WEEKDAY_ORDER.indexOf(dueWeekday);
  const currentWindow = getCurrentWeekWindow(preferences, referenceDate);

  return (
    currentWindow.localWeekdayIndex === dueWeekdayIndex &&
    currentWindow.localHour === preferences.weekly_scorecard_local_hour
  );
}

function deriveOutcome(mission: WeeklyMissionRow): {
  label: string;
  state: "completed" | "missed" | "open";
} {
  if (mission.commitment_outcome === "completed" || mission.status === "completed") {
    return {
      label: "Done. You finished what you said you would do.",
      state: "completed",
    };
  }

  if (mission.commitment_outcome === "missed" || mission.status === "abandoned") {
    return {
      label: "Not done. The week closed short.",
      state: "missed",
    };
  }

  return {
    label: mission.completion_percentage && mission.completion_percentage > 0
      ? `Still open at ${Math.round(mission.completion_percentage)}%. Close it honestly before the next week starts.`
      : "Still open. Close it honestly before the next week starts.",
    state: "open",
  };
}

function deriveSuggestedFocus(
  mission: WeeklyMissionRow,
  stage: string | null,
  outcomeState: "completed" | "missed" | "open",
) {
  const normalizedStage = stage?.trim().toLowerCase() ?? "";

  if (outcomeState === "completed") {
    if (normalizedStage.includes("validation")) {
      return "Protect the momentum by turning this proof into one sharper validation move.";
    }

    if (normalizedStage.includes("prototype") || normalizedStage.includes("build")) {
      return "Keep the next build smaller than you want and get it in front of users fast.";
    }

    return "Pick the next bottleneck and commit to one finish line again.";
  }

  if (outcomeState === "missed") {
    if (normalizedStage.includes("validation")) {
      return "Cut next week down to one customer-learning outcome you can finish.";
    }

    if (normalizedStage.includes("prototype") || normalizedStage.includes("build")) {
      return "Stop polishing and define one version you can expose this week.";
    }

    return "Shrink next week until the commitment feels almost too small to fail.";
  }

  return "Close this week from reality, then write one commitment tight enough to finish early.";
}

async function getActiveDaysLast14(userId: string) {
  const fourteenDaysAgoIso = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString();

  const [activityEventsResult, activityLogResult, checkInsResult] = await Promise.all([
    supabase
      .from("activity_events")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", fourteenDaysAgoIso),
    supabase
      .from("user_activity_log")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", fourteenDaysAgoIso),
    supabase
      .from("daily_check_ins")
      .select("check_in_date")
      .eq("user_id", userId)
      .gte("check_in_date", fourteenDaysAgoIso.slice(0, 10)),
  ]);

  if (activityEventsResult.error) {
    throw activityEventsResult.error;
  }

  if (activityLogResult.error) {
    throw activityLogResult.error;
  }

  if (checkInsResult.error) {
    throw checkInsResult.error;
  }

  const activeDates = new Set<string>();

  for (const row of activityEventsResult.data ?? []) {
    if (typeof row.created_at === "string") {
      activeDates.add(row.created_at.slice(0, 10));
    }
  }

  for (const row of activityLogResult.data ?? []) {
    if (typeof row.created_at === "string") {
      activeDates.add(row.created_at.slice(0, 10));
    }
  }

  for (const row of checkInsResult.data ?? []) {
    if (typeof row.check_in_date === "string") {
      activeDates.add(row.check_in_date.slice(0, 10));
    }
  }

  return activeDates.size;
}

async function sendScorecardEmail(args: {
  userId: string;
  email: string;
  fullName: string | null;
  niche: string | null;
  weeklyCommitment: string;
  weeklyOutcome: string;
  weeklyOutcomeState: "completed" | "missed" | "open";
  activeDaysLast14: number;
  suggestedFocus: string;
}) {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-retention-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      ...args,
      sequence: "weekly_scorecard",
      ctaUrl: `${(Deno.env.get("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "")}/dashboard`,
      ctaLabel: "Open Dashboard",
    }),
  });

  const json = await response.json();
  if (!response.ok || (!json.ok && !json.skipped)) {
    throw new Error(`send-retention-email failed: ${JSON.stringify(json)}`);
  }

  return json;
}

async function markScorecardSent(userId: string, existingPreferences: Record<string, unknown> | null, weekStartDate: string) {
  const nextPreferences = {
    ...(existingPreferences ?? {}),
    last_weekly_scorecard_week_start: weekStartDate,
  };

  const { error } = await supabase
    .from("profiles")
    .update({ user_preferences: nextPreferences })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, creative_niche, business_stage, onboarding_completed, user_preferences")
      .eq("onboarding_completed", true);

    if (profilesError) {
      throw profilesError;
    }

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failures: [] as Array<{ user_id: string; reason: string }>,
    };

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      results.processed++;

      try {
        const preferences = normalizePreferences(profile.user_preferences);
        if (!shouldSendScorecardNow(preferences)) {
          results.skipped++;
          continue;
        }

        const weekWindow = getCurrentWeekWindow(preferences);
        if (preferences.last_weekly_scorecard_week_start === weekWindow.start) {
          results.skipped++;
          continue;
        }

        const { data: mission, error: missionError } = await supabase
          .from("weekly_missions")
          .select("id, user_id, mission_goal, status, commitment_outcome, week_start_date, week_end_date, completion_percentage")
          .eq("user_id", profile.id)
          .eq("week_start_date", weekWindow.start)
          .eq("week_end_date", weekWindow.end)
          .maybeSingle();

        if (missionError) {
          throw missionError;
        }

        if (!mission) {
          results.skipped++;
          continue;
        }

        const authResult = await supabase.auth.admin.getUserById(profile.id);
        const email = authResult.data.user?.email?.trim() ?? "";

        if (!email || email.toLowerCase() === "admin@creatives-takeover.com") {
          results.skipped++;
          continue;
        }

        const activeDaysLast14 = await getActiveDaysLast14(profile.id);
        const outcome = deriveOutcome(mission as WeeklyMissionRow);
        const suggestedFocus = deriveSuggestedFocus(mission as WeeklyMissionRow, profile.business_stage, outcome.state);

        const sendResult = await sendScorecardEmail({
          userId: profile.id,
          email,
          fullName: profile.full_name,
          niche: profile.creative_niche,
          weeklyCommitment: mission.mission_goal,
          weeklyOutcome: outcome.label,
          weeklyOutcomeState: outcome.state,
          activeDaysLast14,
          suggestedFocus,
        });

        if (!sendResult.skipped) {
          await markScorecardSent(profile.id, profile.user_preferences, weekWindow.start);
          results.sent++;
        }
      } catch (error) {
        results.failures.push({
          user_id: profile.id,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return jsonResponse({ success: true, ...results });
  } catch (error) {
    console.error("send-weekly-scorecards error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
