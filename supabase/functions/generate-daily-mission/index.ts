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
  return "IDENTITY";
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

async function generateMissionText({
  openaiApiKey,
  stage,
  profile,
  activity,
}: {
  openaiApiKey: string | null;
  stage: BizMapStage;
  profile: any;
  activity: any;
}): Promise<string> {
  const fallbackMission = STAGE_CONTEXT[stage].fallbackMission;
  if (!openaiApiKey) {
    return fallbackMission;
  }

  const stageConfig = STAGE_CONTEXT[stage];
  const startupContext = [
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
            "You are a startup execution coach. Return only valid JSON with one key: mission_text. The mission must be exactly one concrete task for today, specific, finishable in under 90 minutes, and aligned to the founder's stage and last activity. Start with a strong verb. Avoid lists, fluff, or multiple steps.",
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
    const missionDate = typeof missionDateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(missionDateInput)
      ? missionDateInput
      : new Date().toISOString().slice(0, 10);

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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

    const [{ data: progress }, { data: activity }, { data: profile }] = await Promise.all([
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
    ]);

    const stage = normalizeStage(progress?.current_stage);
    const missionText = await generateMissionText({
      openaiApiKey: Deno.env.get("OPENAI_API_KEY"),
      stage,
      profile,
      activity,
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
