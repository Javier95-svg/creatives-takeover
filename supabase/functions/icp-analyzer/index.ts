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

const ICP_RESULTS_TABLE = "icp_analysis_results";

type SaveMode = "preview" | "save";
type EntryMode = "fast" | "guided";
type Operation = "seed_prefill" | "build_draft";

interface SeedPrefillRequest {
  operation: "seed_prefill";
  seed: string;
}

interface GuidedInput {
  seed: string;
  persona: {
    role: string;
    industry: string;
    experience: string;
  };
  specificity: string;
  pain: string;
  workaround: string;
  solutionCompletion: string;
  marketContext: "different_customer" | "too_expensive_or_complex" | "manual_or_no_product" | "new_problem_recently";
  founderEdge: string;
}

interface FastInput {
  description: string;
}

interface BuildDraftRequest {
  operation: "build_draft";
  mode: SaveMode;
  entryMode: EntryMode;
  fastInput?: FastInput | null;
  guidedInput?: GuidedInput | null;
  personaEditedSignificantly?: boolean;
}

type RequestPayload = SeedPrefillRequest | BuildDraftRequest;

const isNonEmpty = (value: unknown, min = 12) => typeof value === "string" && value.trim().length >= min;

function validateGuidedInput(input: GuidedInput | null | undefined) {
  const issues: string[] = [];
  if (!input) {
    issues.push("guidedInput is required");
    return issues;
  }

  if (!isNonEmpty(input.seed, 8)) issues.push("seed must be at least 8 characters");
  if (!isNonEmpty(input.persona?.role, 2)) issues.push("persona.role is required");
  if (!isNonEmpty(input.persona?.industry, 2)) issues.push("persona.industry is required");
  if (!isNonEmpty(input.persona?.experience, 2)) issues.push("persona.experience is required");
  if (!isNonEmpty(input.specificity, 8)) issues.push("specificity must be at least 8 characters");
  if (!isNonEmpty(input.pain, 12)) issues.push("pain must be at least 12 characters");
  if (!isNonEmpty(input.workaround, 6)) issues.push("workaround must be at least 6 characters");
  if (!isNonEmpty(input.solutionCompletion, 6)) issues.push("solutionCompletion must be at least 6 characters");
  if (!isNonEmpty(input.founderEdge, 12)) issues.push("founderEdge must be at least 12 characters");
  if (!input.marketContext) issues.push("marketContext is required");

  return issues;
}

function validatePayload(payload: Partial<RequestPayload>) {
  const issues: string[] = [];
  if (payload.operation === "seed_prefill") {
    if (!isNonEmpty(payload.seed, 8)) issues.push("seed must be at least 8 characters");
    return issues;
  }

  if (payload.operation !== "build_draft") {
    issues.push("operation must be seed_prefill or build_draft");
    return issues;
  }

  if (payload.mode !== "preview" && payload.mode !== "save") {
    issues.push("mode must be preview or save");
  }

  if (payload.entryMode === "fast") {
    if (!isNonEmpty(payload.fastInput?.description, 40)) {
      issues.push("fastInput.description must be at least 40 characters");
    }
    return issues;
  }

  if (payload.entryMode === "guided") {
    issues.push(...validateGuidedInput(payload.guidedInput));
    return issues;
  }

  issues.push("entryMode must be fast or guided");
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

  return {
    message: "We know who you’re building for — here’s what to do next.",
    suggestedStage: "IDENTITY",
    prioritizedTasks: nextActions.slice(0, 5).map((action: any, index: number) => ({
      id: `icp-draft-task-${index + 1}`,
      title: typeof action?.title === "string" ? action.title : `Next action ${index + 1}`,
      description:
        typeof action?.description === "string"
          ? action.description
          : "Use the ICP Draft to move from analysis into execution.",
      priority: index === 0 ? "high" : index < 3 ? "medium" : "low",
      route: normalizeRoute(action?.route, defaultRoute),
    })),
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
        actionUrl: nextActions[0]?.route ? normalizeRoute(nextActions[0].route, defaultRoute) : defaultRoute,
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

function buildSeedPrompt(seed: string) {
  return `You are helping a founder clarify who they are building for.
Return valid JSON only in this shape:
{
  "role": "string",
  "industry": "string",
  "experience": "string",
  "suggestedPain": "string"
}

Rules:
- Be specific, not generic.
- Infer the most plausible user role from the idea.
- Keep the role, industry, and experience easy for a founder to edit.
- suggestedPain must be one concrete frustration, not a broad market statement.

Startup idea:
${seed}`;
}

function buildDraftPrompt(
  request: BuildDraftRequest,
  marketSignals: string[],
  competitorLinks: Array<{ name: string; url: string | null }>,
) {
  const guidedContext =
    request.entryMode === "guided" && request.guidedInput
      ? `Startup idea: ${request.guidedInput.seed}
Confirmed persona role: ${request.guidedInput.persona.role}
Confirmed persona industry: ${request.guidedInput.persona.industry}
Confirmed persona experience: ${request.guidedInput.persona.experience}
Specific segment: ${request.guidedInput.specificity}
Emotional pain: ${request.guidedInput.pain}
Current workaround: ${request.guidedInput.workaround}
Product sentence completion: ${request.guidedInput.solutionCompletion}
Competitive landscape: ${request.guidedInput.marketContext}
Founder edge: ${request.guidedInput.founderEdge}
Founder substantially revised the suggested persona: ${request.personaEditedSignificantly ? "yes" : "no"}`
      : "";

  const fastContext =
    request.entryMode === "fast" && request.fastInput
      ? `Founder description:
${request.fastInput.description}`
      : "";

  const signalBlock = marketSignals.length > 0
    ? `Market signals:
${marketSignals.map((signal) => `- ${signal}`).join("\n")}`
    : "";

  const competitorBlock = competitorLinks.length > 0
    ? `Competitors with URLs:
${competitorLinks.map((item) => `- ${item.name}${item.url ? ` (${item.url})` : ""}`).join("\n")}`
    : "";

  return `You are generating a founder-ready ICP Draft document.
This is not a template fill. It must feel specific, grounded, and usable.
Use the founder's wording wherever possible.
Do not ask clarifying questions.
Do not output generic startup language.
Return valid JSON only in this shape:
{
  "status":"draft_ready",
  "draftDocument":{
    "gatePreview":{"personaName":"string","roleLine":"string","painLine":"string"},
    "customer":{"personaName":"string","roleLine":"string","metaLine":"string","summary":"string","whereToFind":["string"]},
    "pain":{"quote":"string","rootCause":"string","whyItHurts":"string","triggerMoment":"string"},
    "build":{"valueProposition":"string","replaces":["string"],"coreFeatures":[{"title":"string","description":"string"}],"outcome":"string"},
    "moat":{"moatType":"string","edge":"string","incumbentGap":"string","startupsToStudy":[{"name":"string","url":"string|null"}]},
    "confidence":{"level":"high|medium|low","summary":"string","missingSignals":["string"]},
    "nextActions":[{"title":"string","description":"string","route":"waitlist|pmf|mvp|gtm|mentor"}]
  },
  "enrichment":{"contradictionFlag":boolean,"mentorDomain":"string|null"}
}

Rules:
- The customer section must read like one person with one context, not a vague market.
- pain.quote must feel like a line the founder could repeat to a cofounder or designer.
- build.valueProposition must define the first product or service clearly.
- coreFeatures must be exactly 3 items.
- moat.moatType should be a concise badge-style phrase.
- startupsToStudy can include 0-3 items. Use provided URLs when available. If no reliable URL exists, use null.
- confidence must admit missing evidence instead of faking precision.
- nextActions must be concrete and usable in the next week.

Entry mode: ${request.entryMode}
${guidedContext}
${fastContext}
${signalBlock}
${competitorBlock}`;
}

async function fetchMarketSignals(serviceClient: ReturnType<typeof createClient>, req: Request, request: BuildDraftRequest) {
  try {
    const businessIdea =
      request.entryMode === "guided" && request.guidedInput
        ? request.guidedInput.seed
        : request.fastInput?.description || "";
    const targetMarket =
      request.entryMode === "guided" && request.guidedInput
        ? request.guidedInput.specificity || request.guidedInput.persona.role
        : "";

    const validationResponse = await serviceClient.functions.invoke("market-validation-engine", {
      body: {
        business_idea: businessIdea,
        target_market: targetMarket,
      },
      headers: {
        Authorization: req.headers.get("Authorization") || "",
      },
    });

    const score = validationResponse.data?.validation_score;
    const competitors = (score?.top_competitors || [])
      .slice(0, 3)
      .map((item: any) => ({
        name: item?.name || "",
        url: item?.website || null,
      }))
      .filter((item: { name: string; url: string | null }) => item.name);
    const marketSignals = [
      ...(score?.top_competitors || []).slice(0, 3).map((item: any) => item?.name).filter(Boolean),
      ...(score?.reddit_discussions || []).slice(0, 2).map((item: any) => item?.title).filter(Boolean),
      ...(score?.competitor_gaps || []).slice(0, 2).map((item: any) => (typeof item === "string" ? item : item?.gap)).filter(Boolean),
    ];

    return { marketSignals, competitors };
  } catch (error) {
    console.warn("ICP analyzer enrichment failed, continuing without market signals", error);
    return { marketSignals: [] as string[], competitors: [] as Array<{ name: string; url: string | null }> };
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

    if (payload.operation === "seed_prefill") {
      const completion = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.35,
          max_tokens: 400,
          messages: [
            { role: "system", content: "Return valid JSON only." },
            { role: "user", content: buildSeedPrompt(payload.seed) },
          ],
        }),
      });

      if (!completion.ok) {
        throw new Error(`OpenAI API Error: ${completion.status}`);
      }

      const aiData = await completion.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);

      return new Response(JSON.stringify({
        success: true,
        persona: {
          role: parsed.role,
          industry: parsed.industry,
          experience: parsed.experience,
          suggestedPain: parsed.suggestedPain,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let user = null;
    let creditResult: { success: boolean; newBalance: number; error?: string; errorCode?: string } = { success: true, newBalance: 0 };
    let marketSignals: string[] = [];
    let competitorLinks: Array<{ name: string; url: string | null }> = [];

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

      creditResult = await checkAndDeductCredits(user.id, CREDIT_COSTS.ICP_ANALYSIS, "ICP Analysis", undefined, {
        idempotencyKey,
      });
      if (!creditResult.success) {
        return new Response(JSON.stringify({
          success: false,
          error: creditResult.error || "Credit deduction failed",
          creditError: true,
          errorCode: creditResult.errorCode,
          requiredCredits: CREDIT_COSTS.ICP_ANALYSIS,
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const enrichment = await fetchMarketSignals(serviceClient, req, payload);
      marketSignals = enrichment.marketSignals;
      competitorLinks = enrichment.competitors;
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
          max_tokens: payload.mode === "save" ? 2600 : 2000,
          messages: [
            { role: "system", content: "Return valid JSON only." },
            { role: "user", content: buildDraftPrompt(payload, marketSignals, competitorLinks) },
          ],
        }),
      });

      if (!completion.ok) {
        throw new Error(`OpenAI API Error: ${completion.status}`);
      }

      const aiData = await completion.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);
      const draftDocument = parsed.draftDocument;
      const artifact = {
        version: 3,
        generatedAt: new Date().toISOString(),
        founderInputs: {
          mode: payload.entryMode,
          fastDescription: payload.entryMode === "fast" ? payload.fastInput?.description ?? null : null,
          guided: payload.entryMode === "guided" ? payload.guidedInput ?? null : null,
        },
        draftDocument,
        dashboardContext: buildDashboardContext(draftDocument),
        enrichment: {
          contradictionFlag: Boolean(parsed.enrichment?.contradictionFlag),
          marketSignals,
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

      const businessDescription =
        payload.entryMode === "guided"
          ? payload.guidedInput?.seed || ""
          : payload.fastInput?.description || "";
      const targetAudience =
        payload.entryMode === "guided"
          ? payload.guidedInput?.specificity || payload.guidedInput?.persona.role
          : draftDocument?.customer?.roleLine || null;

      const { data: storedAnalysis, error: storeError } = await serviceClient
        .from(ICP_RESULTS_TABLE as any)
        .insert({
          user_id: user.id,
          business_description: businessDescription,
          target_audience: targetAudience,
          niche_score: draftDocument.confidence.level === "high" ? 82 : draftDocument.confidence.level === "medium" ? 64 : 41,
          verdict: draftDocument.confidence.level === "high" ? "Highly Viable" : draftDocument.confidence.level === "medium" ? "Promising" : "Needs Refinement",
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
        creditsUsed: CREDIT_COSTS.ICP_ANALYSIS,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      if (payload.mode === "save" && user) {
        await refundCredits(user.id, CREDIT_COSTS.ICP_ANALYSIS, "ICP Analysis", "Refund: ICP draft generation failed", {
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
