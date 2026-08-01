import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGE_CONTEXT = {
  IDENTITY: {
    label: "Stage I - Identity",
    focus: "clarify the ideal customer, the core pain, and the sharpest positioning angle",
    fallbackMission: "Write down the top 3 pains your ideal customer feels and save them in ICP Builder.",
  },
  PROTOTYPE: {
    label: "Stage II - Prototype",
    focus: "shape a clear value proposition and turn it into a demand capture asset",
    fallbackMission: "Draft one waitlist headline, one subheadline, and 3 benefits for your landing page.",
  },
  VALIDATING: {
    label: "Stage III - Validation",
    focus: "gather evidence from real users and tighten your assumptions with direct feedback",
    fallbackMission: "Message 5 target users today and ask for a 15-minute call about their current workflow.",
  },
  BUILDING: {
    label: "Stage IV - Building",
    focus: "lock scope, reduce build ambiguity, and move the MVP toward a usable first version",
    fallbackMission: "List the 3 must-have MVP features and cut any feature that is not essential for first value.",
  },
  LAUNCH: {
    label: "Stage V - Launch",
    focus: "activate distribution, publish consistently, and create repeatable traction loops",
    fallbackMission: "Choose one launch channel and publish one concrete offer or update there today.",
  },
  TRACTION: {
    label: "Stage VI - Traction",
    focus: "verify retention, improve the strongest distribution loop, and make growth repeatable",
    fallbackMission: "Compare your last two growth periods and choose one retention or acquisition variable to improve today.",
  },
} as const;

type BizMapStage = keyof typeof STAGE_CONTEXT;

type DailyMissionRow = {
  id: string;
  user_id: string;
  stage: BizMapStage;
  mission_text: string;
  completed: boolean;
  mission_date: string;
  created_at: string;
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeStage(value: unknown): BizMapStage {
  if (typeof value === "string" && value in STAGE_CONTEXT) {
    return value as BizMapStage;
  }
  // Fundraising is a parallel capital motion, not an operating maturity stage.
  if (value === "FUNDRAISING") return "TRACTION";
  return "IDENTITY";
}

function stageFromIntelligence(value: unknown): BizMapStage | null {
  const stage = Number(value);
  if (stage === 1) return "IDENTITY";
  if (stage === 2) return "PROTOTYPE";
  if (stage === 3) return "VALIDATING";
  if (stage === 4) return "BUILDING";
  if (stage === 5) return "LAUNCH";
  if (stage === 6) return "TRACTION";
  return null;
}

function sanitizeMissionText(value: unknown, stage: BizMapStage): string {
  const fallback = STAGE_CONTEXT[stage].fallbackMission;
  if (typeof value !== "string") return fallback;

  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();

  if (cleaned.length < 16) return fallback;
  if (cleaned.length > 240) return `${cleaned.slice(0, 237).trimEnd()}...`;
  return cleaned;
}

function buildLastActivitySummary(activity: any, profile: any): string {
  if (activity?.activity_type) {
    const details: string[] = [`type=${activity.activity_type}`];
    if (activity.page_path) {
      details.push(`page=${activity.page_path}`);
    }
    if (activity.created_at) {
      details.push(`at=${activity.created_at}`);
    }
    return details.join(", ");
  }

  if (profile?.last_activity_at) {
    return `Last known activity at ${profile.last_activity_at}`;
  }

  return "No recent activity logged yet.";
}

/**
 * Read the founder's runway pressure.
 *
 * Mirrors the fallback in get_recommendation_context_v1: prefer the derived
 * band, but sessions completed before urgencyBand existed still carry the raw
 * runway answer, and those founders are exactly the ones we should not ignore.
 */
function readUrgencyBand(onboarding: any): string | null {
  const derived = onboarding?.derived_context?.urgencyBand;
  if (typeof derived === "string" && derived) return derived;
  switch (onboarding?.answers?.runwayMonths) {
    case "under_3":
      return "critical";
    case "3_6":
      return "high";
    case "6_12":
      return "moderate";
    case "over_12":
    case "not_applicable":
      return "stable";
    default:
      return null;
  }
}

function buildPersonalizedFallback(stage: BizMapStage, onboarding: any, stageIntelligence: any): string {
  const answers = onboarding?.answers ?? {};
  const goal = answers.primaryGoal;
  const blocker = answers.blocker;
  const capacity = Number(answers.weeklyCapacityHours ?? 5);
  const actionCount = capacity <= 2 ? 2 : capacity <= 5 ? 3 : 5;

  if (
    stageIntelligence?.confidence_band === "low"
    && !stageIntelligence?.boundary_answered_at
  ) {
    const candidateStage = Number(stageIntelligence?.candidate_stage ?? stageIntelligence?.current_stage ?? 1);
    if (candidateStage <= 1) {
      return "Show one target customer a concrete sketch of the idea and record what they expected to be able to do with it.";
    }
    if (candidateStage === 2) {
      return `Put your prototype in front of ${actionCount} target customers and record whether they attempt the core action without prompting.`;
    }
    if (candidateStage === 3) {
      return "Ask one target customer for a concrete commitment—time, data, a pilot, or payment—and record the response.";
    }
    if (candidateStage === 4) {
      return "Complete and test the smallest end-to-end product flow that delivers the promised customer outcome.";
    }
    if (candidateStage === 5) {
      return "Compare customer activity across two recent periods and record whether acquisition, usage, or revenue repeated.";
    }
    return "Verify your strongest growth claim against two recent periods and record the channel, conversion, and retention evidence.";
  }

  if (goal === "raise" || blocker === "fundraising") {
    return "Write the three strongest traction claims in your investor story and attach one verifiable proof point to each.";
  }

  // A founder weeks from running out of money should not spend today building.
  // Fundraising goals are handled above and deliberately left alone: for them
  // the raise is the revenue path, not a detour from it.
  const urgency = readUrgencyBand(onboarding);
  if (
    (urgency === "critical" || urgency === "high")
    && (goal === "build_product" || blocker === "product_delivery")
  ) {
    return `Runway is short, so leave the product where it is today: take the offer you can already deliver to ${actionCount} qualified prospects and record every objection or commitment you get back.`;
  }

  if (goal === "build_product" || blocker === "product_delivery") {
    return "Define the single user outcome your smallest product must deliver and remove every feature that does not support it.";
  }
  if (goal === "repeatable_growth" || blocker === "traction_growth") {
    return "Review your latest acquisition experiment, name the strongest retention signal, and choose one variable to test next.";
  }
  if (goal === "launch" || blocker === "messaging") {
    return `Draft one launch message and send it to ${actionCount} target customers to test whether the promise earns a reply.`;
  }
  if (goal === "win_first_customer" || goal === "reach_three_customers" || blocker === "sales_conversion") {
    return `Contact ${actionCount} qualified prospects with one specific offer and record the objection or commitment you receive.`;
  }
  if (blocker === "prospect_access") {
    return `Add ${actionCount} named prospects who experience the problem and write the first outreach message for each.`;
  }
  if (blocker === "accountability" || blocker === "team") {
    return "Choose the one external founder outcome you will finish today and share that commitment with an accountability partner.";
  }
  return STAGE_CONTEXT[stage].fallbackMission;
}

async function generateMissionText({
  openaiApiKey,
  stage,
  profile,
  activity,
  onboarding,
  stageIntelligence,
}: {
  openaiApiKey: string | null;
  stage: BizMapStage;
  profile: any;
  activity: any;
  onboarding: any;
  stageIntelligence: any;
}): Promise<string> {
  const fallbackMission = buildPersonalizedFallback(stage, onboarding, stageIntelligence);
  if (!openaiApiKey) {
    return fallbackMission;
  }

  const stageConfig = STAGE_CONTEXT[stage];
  const answers = onboarding?.answers ?? {};
  const context = onboarding?.derived_context ?? {};
  const startupContext = [
    answers.startupBrief ? `Startup brief: ${answers.startupBrief}` : null,
    answers.businessModel ? `Business model: ${answers.businessModel}` : null,
    answers.evidenceState ? `Strongest evidence: ${answers.evidenceState}` : null,
    answers.customerCountBand ? `Customer-count band: ${answers.customerCountBand}` : null,
    answers.primaryGoal ? `30-day goal: ${answers.primaryGoal}` : null,
    answers.blocker ? `Primary blocker: ${answers.blocker}` : null,
    answers.weeklyCapacityHours ? `Weekly capacity: ${answers.weeklyCapacityHours} hours` : null,
    answers.runwayMonths ? `Runway remaining: ${answers.runwayMonths.replaceAll("_", " ")}` : null,
    answers.revenueBand ? `Monthly revenue band: ${answers.revenueBand.replaceAll("_", " ")}` : null,
    readUrgencyBand(onboarding) ? `Financial pressure: ${readUrgencyBand(onboarding)}` : null,
    context.founderLoop ? `Operating loop: ${context.founderLoop}` : null,
    context.selectedIntent ? `Selected first action: ${context.selectedIntent}` : null,
    stageIntelligence?.current_stage ? `Evidence-backed operating stage: ${stageIntelligence.current_stage}` : null,
    stageIntelligence?.confidence_band ? `Stage evidence confidence: ${stageIntelligence.confidence_band}` : null,
    stageIntelligence?.capital_motion && stageIntelligence.capital_motion !== "inactive"
      ? `Parallel capital motion: ${stageIntelligence.capital_motion}`
      : null,
    Array.isArray(stageIntelligence?.rationale_codes) && stageIntelligence.rationale_codes.length > 0
      ? `Stage reason codes: ${stageIntelligence.rationale_codes.join(", ")}`
      : null,
    Array.isArray(answers.sectors) && answers.sectors.length > 0 ? `Sectors: ${answers.sectors.join(", ")}` : null,
    profile?.startup_name ? `Startup: ${profile.startup_name}` : null,
    profile?.current_focus ? `Current focus: ${profile.current_focus}` : null,
    profile?.quiz_biggest_challenge ? `Biggest challenge: ${profile.quiz_biggest_challenge}` : null,
    profile?.business_stage ? `Business stage profile: ${profile.business_stage}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.5,
      max_tokens: 160,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a startup execution coach. Return only valid JSON with one key: mission_text. The mission must be exactly one concrete task for today, specific, finishable in under 90 minutes, and aligned to the founder's stage and last activity. Start with a strong verb. Avoid lists, fluff, or multiple steps. If financial pressure is critical or high, choose a task that moves money or a customer commitment closer today, and never one that spends the remaining runway on building or polish. Do not mention their runway back to them; just let it decide the task.",
        },
        {
          role: "user",
          content: `BizMap stage: ${stageConfig.label}
Stage focus: ${stageConfig.focus}
Last activity: ${buildLastActivitySummary(activity, profile)}
Founder context:
${startupContext || "No extra founder profile context available."}

Return JSON like {"mission_text":"..."} and make the task feel like the most useful next action for today.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return fallbackMission;
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;

  if (!content) {
    return fallbackMission;
  }

  try {
    const parsed = JSON.parse(content);
    return sanitizeMissionText(parsed?.mission_text, stage);
  } catch {
    return sanitizeMissionText(content, stage);
  }
}

/**
 * Resolve today's date in the founder's own timezone.
 *
 * The dashboard passes mission_date explicitly, so this only runs for callers
 * that cannot know the local day (a cron sweep, a retry, a manual invoke).
 * Those would otherwise land on the UTC day, which is the wrong date for most
 * of the world for part of every day. Onboarding records the timezone into
 * user_preferences.timezone; anything written before that reads as UTC.
 */
async function resolveLocalMissionDate(
  client: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  let timezone = "UTC";
  try {
    const { data } = await client
      .from("profiles")
      .select("user_preferences")
      .eq("id", userId)
      .maybeSingle();
    const preferences = data?.user_preferences;
    const candidate = preferences && typeof preferences === "object" && !Array.isArray(preferences)
      ? (preferences as Record<string, unknown>).timezone
      : null;
    if (typeof candidate === "string" && candidate.trim()) {
      timezone = candidate.trim();
    }
  } catch {
    // Preferences are advisory here; UTC remains a safe default.
  }

  try {
    // en-CA renders as YYYY-MM-DD, matching the mission_date column format.
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await authClient.auth.getUser(token);

    if (authError || !userData.user) {
      return jsonResponse({ error: "Invalid authentication" }, 401);
    }

    const userId = userData.user.id;
    const { mission_date: missionDateInput } = await req.json().catch(() => ({ mission_date: null }));

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const missionDate = typeof missionDateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(missionDateInput)
      ? missionDateInput
      : await resolveLocalMissionDate(supabase, userId);

    const { data: existingMissionRaw, error: existingError } = await supabase
      .from("daily_missions")
      .select("*")
      .eq("user_id", userId)
      .eq("mission_date", missionDate)
      .maybeSingle();

    const existingMission = existingMissionRaw as DailyMissionRow | null;

    if (existingError) {
      throw existingError;
    }

    if (existingMission) {
      return jsonResponse({ mission: existingMission, cached: true });
    }

    const [
      { data: progress },
      { data: activity },
      { data: profile },
      onboardingResult,
      stageIntelligenceResult,
    ] = await Promise.all([
      supabase
        .from("user_progress")
        .select("current_stage")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("user_activity_log")
        .select("activity_type, activity_data, created_at, page_path")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("business_stage, current_focus, last_activity_at, quiz_biggest_challenge, startup_name")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("onboarding_sessions")
        .select("answers, derived_context")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("founder_stage_state")
        .select("current_stage, candidate_stage, runner_up_stage, confidence_band, evidence_coverage, capital_motion, rationale_codes, boundary_answered_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const stageIntelligence = stageIntelligenceResult.data;
    const stage = stageFromIntelligence(stageIntelligence?.current_stage)
      ?? normalizeStage(progress?.current_stage);
    const missionText = await generateMissionText({
      openaiApiKey: Deno.env.get("OPENAI_API_KEY"),
      stage,
      profile,
      activity,
      onboarding: onboardingResult.data,
      stageIntelligence,
    });

    const { data: insertedMissionRaw, error: insertError } = await supabase
      .from("daily_missions")
      .insert({
        user_id: userId,
        stage,
        mission_text: missionText,
        completed: false,
        mission_date: missionDate,
      })
      .select("*")
      .single();

    const insertedMission = insertedMissionRaw as DailyMissionRow | null;

    if (insertError) {
      const { data: racedMissionRaw } = await supabase
        .from("daily_missions")
        .select("*")
        .eq("user_id", userId)
        .eq("mission_date", missionDate)
        .maybeSingle();

      const racedMission = racedMissionRaw as DailyMissionRow | null;

      if (racedMission) {
        return jsonResponse({ mission: racedMission, cached: true });
      }

      throw insertError;
    }

    return jsonResponse({ mission: insertedMission, cached: false });
  } catch (error) {
    console.error("Error generating daily mission:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to generate daily mission",
      },
      500,
    );
  }
});
