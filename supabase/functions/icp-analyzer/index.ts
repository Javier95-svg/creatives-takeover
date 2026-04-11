import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";
import { resolveCreditIdempotencyKey } from "../_shared/request-idempotency.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

type Mode = "preview" | "save";

interface IcpAnswers {
  problemStatement: string;
  targetAudience: string;
  currentBehavior: string;
  desiredOutcome: string;
  solutionDifferentiator: string;
  founderEdge: string;
}

interface Clarification {
  question: string;
  answer: string;
}

interface RequestPayload {
  mode: Mode;
  answers: IcpAnswers;
  clarification?: Clarification | null;
}

const ICP_RESULTS_TABLE = "icp_analysis_results";

const buildDescription = (answers: IcpAnswers) =>
  [
    `Painful moment: ${answers.problemStatement}`,
    `Ideal customer: ${answers.targetAudience}`,
    `Current workaround: ${answers.currentBehavior}`,
    `Desired outcome: ${answers.desiredOutcome}`,
    `Structural advantage: ${answers.solutionDifferentiator}`,
    `Why this founder can win now: ${answers.founderEdge}`,
  ].join("\n\n");

const isNonEmpty = (value: unknown, min = 12) => typeof value === "string" && value.trim().length >= min;

function validatePayload(payload: Partial<RequestPayload>) {
  const issues: string[] = [];
  if (payload.mode !== "preview" && payload.mode !== "save") {
    issues.push("mode must be preview or save");
  }

  const answers = payload.answers;
  if (!answers) {
    issues.push("answers are required");
    return issues;
  }

  ([
    "problemStatement",
    "targetAudience",
    "currentBehavior",
    "desiredOutcome",
    "solutionDifferentiator",
    "founderEdge",
  ] as const).forEach((field) => {
    if (!isNonEmpty(answers[field])) {
      issues.push(`${field} must be at least 12 characters`);
    }
  });

  if (payload.clarification) {
    if (!isNonEmpty(payload.clarification.question, 8)) issues.push("clarification question is invalid");
    if (!isNonEmpty(payload.clarification.answer, 8)) issues.push("clarification answer is invalid");
  }

  return issues;
}

function normalizeRoute(route: string | undefined, fallback: string) {
  const value = (route || "").toLowerCase();
  if (value.includes("pmf")) return "/pmf-lab";
  if (value.includes("waitlist")) return "/waitlist";
  if (value.includes("mvp")) return "/mvp-builder";
  if (value.includes("gtm") || value.includes("go-to-market")) return "/go-to-market";
  if (value.includes("mentor")) return "/community/mentor-marketplace";
  return fallback;
}

function buildDashboardContext(draftDocument: Record<string, any>) {
  const level = draftDocument?.confidence?.level ?? "medium";
  const nextActions = Array.isArray(draftDocument?.nextActions) ? draftDocument.nextActions : [];
  const defaultRoute = level === "low" ? "/pmf-lab" : "/waitlist";

  const prioritizedTasks = nextActions.slice(0, 5).map((action: any, index: number) => ({
    id: `icp-draft-task-${index + 1}`,
    title: typeof action?.title === "string" ? action.title : `Next action ${index + 1}`,
    description:
      typeof action?.description === "string"
        ? action.description
        : "Use the ICP Draft to move from analysis into execution.",
    priority: index === 0 ? "high" : index < 3 ? "medium" : "low",
    route: normalizeRoute(action?.route, defaultRoute),
  }));

  return {
    message: "We know who you’re building for — here’s what to do next.",
    suggestedStage: "IDENTITY",
    prioritizedTasks,
    recommendations: [
      {
        title: "We know who you’re building for — here’s what to do next",
        description:
          level === "low"
            ? "Validate the pain fast before you commit to a build path."
            : "Turn the draft into a concrete next move without losing momentum.",
        reason:
          level === "low"
            ? "Low-confidence drafts should produce better evidence, not more assumptions."
            : "A sharper ICP should immediately change what you build or test next.",
        actionUrl: prioritizedTasks[0]?.route || defaultRoute,
        priority: 12,
        type: "action",
      },
      {
        title: level === "low" ? "Pressure-test the pain in PMF Lab" : "Capture demand with Waitlist Maker",
        description:
          level === "low"
            ? "Run interviews and demand checks against the exact segment the draft recommends."
            : "Use the ICP Draft language to create a clear waitlist message before you build more.",
        reason: "The best next move should follow from the draft, not from generic startup advice.",
        actionUrl: level === "low" ? "/pmf-lab" : "/waitlist",
        priority: 11,
        type: "action",
      },
      {
        title: "Get founder-context help from a mentor",
        description: "Use the draft to ask sharper questions about the segment, pain, and offer.",
        reason: "A first ICP usually improves fastest when someone challenges the assumptions directly.",
        actionUrl: "/community/mentor-marketplace",
        priority: 10,
        type: "mentor",
      },
    ],
  };
}

function buildPrompt(mode: Mode, answers: IcpAnswers, clarification: Clarification | null, marketSignals: string[]) {
  const clarificationText = clarification
    ? `\nClarification asked: ${clarification.question}\nClarification answer: ${clarification.answer}`
    : "";
  const enrichmentText =
    mode === "save" && marketSignals.length > 0
      ? `\nMarket signals:\n${marketSignals.map((signal) => `- ${signal}`).join("\n")}`
      : "";

  return `You are helping a founder get strategic clarity, not filling out a template.
Use the founder's wording wherever possible.
Do not over-generalize.
If the founder input is still too thin and no clarification has been used yet, return:
{"status":"needs_clarification","clarificationQuestion":"string"}

Otherwise return JSON only in this shape:
{
  "status":"draft_ready",
  "draftDocument":{
    "who":{"title":"Who","summary":"string","bullets":["string"]},
    "painPoint":{"title":"Primary pain point","summary":"string","severity":"Critical|High|Medium|Low","frequency":"string","bullets":["string"]},
    "buildRecommendation":{"title":"What to build first","summary":"string","bullets":["string"]},
    "moat":{"title":"Moat","summary":"string","bullets":["string"],"weakClaims":["string"]},
    "confidence":{"level":"high|medium|low","summary":"string","missingSignals":["string"]},
    "nextActions":[{"title":"string","description":"string","route":"waitlist|pmf|mvp|gtm|mentor"}]
  },
  "enrichment":{"contradictionFlag":boolean,"marketSignals":["string"],"mentorDomain":"string|null"}
}

Rules:
- Keep the draft founder-specific and execution-oriented.
- Rank the pain by severity and frequency.
- Recommend the first product or service scope tied directly to that pain.
- Separate true moat signals from weak claims.
- Confidence must include caveats when evidence is weak.
- Next actions must be concrete and usable this week.

Founder input:
Painful moment: ${answers.problemStatement}
Ideal customer: ${answers.targetAudience}
Current workaround: ${answers.currentBehavior}
Desired outcome: ${answers.desiredOutcome}
Structural advantage: ${answers.solutionDifferentiator}
Why this founder can win now: ${answers.founderEdge}${clarificationText}${enrichmentText}`;
}

async function fetchMarketSignals(serviceClient: ReturnType<typeof createClient>, req: Request, answers: IcpAnswers) {
  try {
    const validationResponse = await serviceClient.functions.invoke("market-validation-engine", {
      body: {
        business_idea: buildDescription(answers),
        target_market: answers.targetAudience,
      },
      headers: {
        Authorization: req.headers.get("Authorization") || "",
      },
    });

    const score = validationResponse.data?.validation_score;
    const competitorNames = (score?.top_competitors || []).slice(0, 3).map((item: any) => item?.name).filter(Boolean);
    const discussionTitles = (score?.reddit_discussions || []).slice(0, 2).map((item: any) => item?.title).filter(Boolean);
    const gaps = (score?.competitor_gaps || []).slice(0, 2).map((item: any) => (typeof item === "string" ? item : item?.gap)).filter(Boolean);
    return [...competitorNames, ...discussionTitles, ...gaps];
  } catch (error) {
    console.warn("ICP analyzer enrichment failed, continuing without market signals", error);
    return [] as string[];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json() as RequestPayload;
    const issues = validatePayload(payload);
    if (issues.length > 0) {
      return new Response(JSON.stringify({ success: false, error: "Validation failed", validationIssues: issues }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!openaiApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error("Missing required environment configuration");
    }

    const serviceClient = createClient(supabaseUrl, supabaseKey);
    const clarification = payload.clarification ?? null;
    let user = null;
    let creditCost = CREDIT_COSTS.ICP_ANALYSIS;
    let creditResult: { success: boolean; newBalance: number; error?: string; errorCode?: string } = { success: true, newBalance: 0 };
    let marketSignals: string[] = [];

    if (payload.mode === "save") {
      user = await getUserFromAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const idempotencyKey = await resolveCreditIdempotencyKey(req, {
        userId: user.id,
        feature: "ICP Analysis",
        requestFingerprint: payload,
      });

      if (creditCost > 0) {
        creditResult = await checkAndDeductCredits(user.id, creditCost, "ICP Analysis", undefined, { idempotencyKey });
        if (!creditResult.success) {
          return new Response(JSON.stringify({
            success: false,
            error: creditResult.error || "Credit deduction failed",
            creditError: true,
            errorCode: creditResult.errorCode,
            requiredCredits: creditCost,
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      marketSignals = await fetchMarketSignals(serviceClient, req, payload.answers);
    }

    try {
      const completion = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: payload.mode === "save" ? "gpt-4o" : "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.45,
          max_tokens: payload.mode === "save" ? 2200 : 1600,
          messages: [
            { role: "system", content: "Return valid JSON only." },
            { role: "user", content: buildPrompt(payload.mode, payload.answers, clarification, marketSignals) },
          ],
        }),
      });

      if (!completion.ok) {
        throw new Error(`OpenAI API Error: ${completion.status}`);
      }

      const aiData = await completion.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);

      if (parsed.status === "needs_clarification") {
        return new Response(JSON.stringify({
          success: true,
          status: "needs_clarification",
          clarificationQuestion: parsed.clarificationQuestion,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const artifact = {
        version: 2,
        generatedAt: new Date().toISOString(),
        founderInputs: payload.answers,
        clarification,
        draftDocument: parsed.draftDocument,
        dashboardContext: buildDashboardContext(parsed.draftDocument),
        enrichment: {
          contradictionFlag: Boolean(parsed.enrichment?.contradictionFlag),
          marketSignals: payload.mode === "save" ? marketSignals : [],
          mentorDomain: parsed.enrichment?.mentorDomain ?? null,
        },
      };

      if (payload.mode === "preview") {
        return new Response(JSON.stringify({
          success: true,
          status: "draft_ready",
          artifact,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: storedAnalysis, error: storeError } = await serviceClient
        .from(ICP_RESULTS_TABLE as any)
        .insert({
          user_id: user.id,
          business_description: buildDescription(payload.answers),
          target_audience: payload.answers.targetAudience,
          niche_score: artifact.draftDocument.confidence.level === "high" ? 82 : artifact.draftDocument.confidence.level === "medium" ? 64 : 41,
          verdict: artifact.draftDocument.confidence.level === "high" ? "Highly Viable" : artifact.draftDocument.confidence.level === "medium" ? "Promising" : "Needs Refinement",
          analysis_data: artifact,
        })
        .select("id")
        .single();

      if (storeError || !storedAnalysis) {
        throw new Error(`Failed to save ICP analysis: ${storeError?.message || "unknown storage error"}`);
      }

      return new Response(JSON.stringify({
        success: true,
        status: "draft_ready",
        artifact,
        analysisId: (storedAnalysis as { id?: string }).id ?? null,
        creditsUsed: creditCost,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      if (payload.mode === "save" && user && creditCost > 0) {
        await refundCredits(user.id, creditCost, "ICP Analysis", "Refund: ICP draft generation failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in ICP analyzer:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
