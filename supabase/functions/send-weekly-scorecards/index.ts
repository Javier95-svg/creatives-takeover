import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyMissionRow {
  id: string;
  user_id: string;
  mission_goal: string;
  status: string | null;
  commitment_outcome: string | null;
  reflection_text: string | null;
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
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getWeekWindow(referenceDate = new Date()) {
  const current = new Date(referenceDate);
  current.setHours(0, 0, 0, 0);
  const dayOfWeek = current.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(current);
  monday.setDate(current.getDate() + diff);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStartDate: monday.toISOString().slice(0, 10),
    weekEndDate: sunday.toISOString().slice(0, 10),
  };
}

function deriveOutcomeLabel(mission: WeeklyMissionRow) {
  if (mission.commitment_outcome === "completed" || mission.status === "completed") {
    return "Done";
  }

  if (mission.commitment_outcome === "missed" || mission.status === "abandoned") {
    return "Not done";
  }

  return mission.completion_percentage && mission.completion_percentage > 0
    ? `Still open at ${Math.round(mission.completion_percentage)}%`
    : "Still open";
}

function deriveSuggestedFocus(mission: WeeklyMissionRow, stage: string | null) {
  const normalizedStage = stage?.trim().toLowerCase() ?? "";

  if (mission.commitment_outcome === "completed" || mission.status === "completed") {
    if (normalizedStage.includes("validation")) {
      return "Turn this week’s proof into one sharper validation move next week.";
    }

    if (normalizedStage.includes("prototype") || normalizedStage.includes("build")) {
      return "Ship the next testable version fast instead of expanding the scope.";
    }

    return "Pick the next bottleneck and write one commitment that removes it.";
  }

  if (mission.commitment_outcome === "missed" || mission.status === "abandoned") {
    if (normalizedStage.includes("validation")) {
      return "Cut the next commitment down to one customer-learning outcome you can finish in a week.";
    }

    if (normalizedStage.includes("prototype") || normalizedStage.includes("build")) {
      return "Stop polishing and define one version you can put in front of real users next week.";
    }

    return "Shrink the scope for next week until the commitment feels hard but finishable.";
  }

  return "Close this week honestly, then set one commitment you can finish before the week gets away from you.";
}

async function getActiveDaysLast7(userId: string) {
  const sevenDaysAgoIso = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();

  const [activityEventsResult, activityLogResult, checkInsResult] = await Promise.all([
    supabase
      .from("activity_events")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgoIso),
    supabase
      .from("user_activity_log")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgoIso),
    supabase
      .from("daily_check_ins")
      .select("check_in_date")
      .eq("user_id", userId)
      .gte("check_in_date", sevenDaysAgoIso.slice(0, 10)),
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
  weeklyReflection: string | null;
  activeDaysLast7: number;
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
      ctaUrl: `${(Deno.env.get("APP_URL") || "https://www.creativestakeover.com").replace(/\/$/, "")}/dashboard`,
      ctaLabel: "Open Dashboard",
    }),
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
    const { weekStartDate, weekEndDate } = getWeekWindow();
    const { data: missions, error: missionsError } = await supabase
      .from("weekly_missions")
      .select("id, user_id, mission_goal, status, commitment_outcome, reflection_text, week_start_date, week_end_date, completion_percentage")
      .eq("week_start_date", weekStartDate)
      .eq("week_end_date", weekEndDate);

    if (missionsError) {
      throw missionsError;
    }

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failures: [] as Array<{ user_id: string; reason: string }>,
    };

    for (const mission of (missions ?? []) as WeeklyMissionRow[]) {
      results.processed++;

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, creative_niche, business_stage, onboarding_completed")
          .eq("id", mission.user_id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        const typedProfile = profile as ProfileRow | null;
        if (!typedProfile || typedProfile.onboarding_completed !== true) {
          results.skipped++;
          continue;
        }

        const authResult = await supabase.auth.admin.getUserById(mission.user_id);
        const email = authResult.data.user?.email?.trim() ?? "";

        if (!email || email.toLowerCase() === "admin@creatives-takeover.com") {
          results.skipped++;
          continue;
        }

        const activeDaysLast7 = await getActiveDaysLast7(mission.user_id);
        const weeklyOutcome = deriveOutcomeLabel(mission);
        const suggestedFocus = deriveSuggestedFocus(mission, typedProfile.business_stage);

        const sendResult = await sendScorecardEmail({
          userId: mission.user_id,
          email,
          fullName: typedProfile.full_name,
          niche: typedProfile.creative_niche,
          weeklyCommitment: mission.mission_goal,
          weeklyOutcome,
          weeklyReflection: mission.reflection_text,
          activeDaysLast7,
          suggestedFocus,
        });

        if (!sendResult.skipped) {
          results.sent++;
        }
      } catch (error) {
        results.failures.push({
          user_id: mission.user_id,
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