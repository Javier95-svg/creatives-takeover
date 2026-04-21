import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";
import { resolveCreditIdempotencyKey } from "../_shared/request-idempotency.ts";
import {
  generateIcpDraftArtifact,
  type DraftRequestShape,
  type FastInput,
  type GuidedInput,
} from "../_shared/icp-draft.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

const ICP_RESULTS_TABLE = "icp_analysis_results";

type SaveMode = "preview" | "save";
type Operation = "seed_prefill" | "build_draft" | "save_existing_artifact";

interface SeedPrefillRequest {
  operation: "seed_prefill";
  seed: string;
}

interface BuildDraftRequest extends DraftRequestShape {
  operation: "build_draft";
  mode: SaveMode;
}

interface SaveExistingArtifactRequest {
  operation: "save_existing_artifact";
  artifact: Record<string, any>;
}

type RequestPayload = SeedPrefillRequest | BuildDraftRequest | SaveExistingArtifactRequest;

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
  if (!isNonEmpty(input.pain, 12)) issues.push("pain must be at least 12 characters");
  if (!isNonEmpty(input.workaround, 6)) issues.push("workaround must be at least 6 characters");

  return issues;
}

function validatePayload(payload: Partial<RequestPayload>) {
  const issues: string[] = [];

  if (payload.operation === "seed_prefill") {
    if (!isNonEmpty(payload.seed, 8)) issues.push("seed must be at least 8 characters");
    return issues;
  }

  if (payload.operation === "save_existing_artifact") {
    if (!payload.artifact || typeof payload.artifact !== "object") {
      issues.push("artifact is required");
      return issues;
    }

    const artifact = payload.artifact as Record<string, any>;
    if (!artifact?.draftDocument?.customer?.roleLine) issues.push("artifact.draftDocument.customer.roleLine is required");
    if (!artifact?.draftDocument?.pain?.quote) issues.push("artifact.draftDocument.pain.quote is required");
    return issues;
  }

  if (payload.operation !== "build_draft") {
    issues.push("operation must be seed_prefill, build_draft, or save_existing_artifact");
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

async function fetchMarketSignals(serviceClient: ReturnType<typeof createClient>, req: Request, request: DraftRequestShape) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) {
    return { marketSignals: [] as string[], competitors: [] as Array<{ name: string; url: string | null }> };
  }

  try {
    const businessIdea =
      request.entryMode === "guided"
        ? request.guidedInput?.seed || ""
        : request.fastInput?.description || "";
    const targetMarket =
      request.entryMode === "guided"
        ? request.guidedInput?.specificity || request.guidedInput?.persona.role
        : "";

    const validationResponse = await serviceClient.functions.invoke("market-validation-engine", {
      body: {
        business_idea: businessIdea,
        target_market: targetMarket,
      },
      headers: {
        Authorization: authHeader,
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
      ...(score?.competitor_gaps || [])
        .slice(0, 2)
        .map((item: any) =>
          typeof item === "string"
            ? item
            : item?.gap_description || item?.gap || item?.category,
        )
        .filter(Boolean),
    ];

    return { marketSignals, competitors };
  } catch (error) {
    console.warn("ICP analyzer enrichment failed, continuing without market signals", error);
    return { marketSignals: [] as string[], competitors: [] as Array<{ name: string; url: string | null }> };
  }
}

function buildStoredArtifactPayload(artifact: Record<string, any>) {
  const businessDescription =
    artifact?.founderInputs?.mode === "guided"
      ? artifact?.founderInputs?.guided?.seed || ""
      : artifact?.founderInputs?.fastDescription || "";
  const targetAudience =
    artifact?.founderInputs?.mode === "guided"
      ? artifact?.founderInputs?.guided?.specificity || artifact?.founderInputs?.guided?.persona?.role || artifact?.draftDocument?.customer?.roleLine || null
      : artifact?.draftDocument?.customer?.roleLine || null;
  const confidenceLevel = artifact?.draftDocument?.confidence?.level;

  return {
    businessDescription,
    targetAudience,
    nicheScore: confidenceLevel === "high" ? 82 : confidenceLevel === "medium" ? 64 : 41,
    verdict: confidenceLevel === "high" ? "Highly Viable" : confidenceLevel === "medium" ? "Promising" : "Needs Refinement",
  };
}

async function storeArtifact({
  serviceClient,
  userId,
  artifact,
}: {
  serviceClient: ReturnType<typeof createClient>;
  userId: string;
  artifact: Record<string, any>;
}) {
  const payload = buildStoredArtifactPayload(artifact);
  const { data: storedAnalysis, error: storeError } = await serviceClient
    .from(ICP_RESULTS_TABLE as any)
    .insert({
      user_id: userId,
      business_description: payload.businessDescription,
      target_audience: payload.targetAudience,
      niche_score: payload.nicheScore,
      verdict: payload.verdict,
      analysis_data: artifact,
    })
    .select("id")
    .single();

  if (storeError || !storedAnalysis) {
    throw new Error(`Failed to save ICP analysis: ${storeError?.message || "unknown storage error"}`);
  }

  return (storedAnalysis as { id?: string }).id ?? null;
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

    if (payload.operation === "save_existing_artifact") {
      const user = await getUserFromAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const analysisId = await storeArtifact({
        serviceClient,
        userId: user.id,
        artifact: payload.artifact,
      });

      return new Response(JSON.stringify({
        success: true,
        status: "draft_ready",
        artifact: payload.artifact,
        analysisId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let user = null;
    let creditResult: { success: boolean; newBalance: number; error?: string; errorCode?: string } = { success: true, newBalance: 0 };

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
    }

    try {
      const enrichment = await fetchMarketSignals(serviceClient, req, payload);
      const generated = await generateIcpDraftArtifact({
        openaiApiKey,
        request: payload,
        enrichment: {
          marketSignals: enrichment.marketSignals,
          competitorLinks: enrichment.competitors,
        },
      });

      if (payload.mode === "preview") {
        return new Response(JSON.stringify({
          success: true,
          status: generated.status,
          artifact: generated.artifact,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const analysisId = await storeArtifact({
        serviceClient,
        userId: user!.id,
        artifact: generated.artifact,
      });

      return new Response(JSON.stringify({
        success: true,
        status: generated.status,
        artifact: generated.artifact,
        analysisId,
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
