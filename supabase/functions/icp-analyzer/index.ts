import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";
import { resolveCreditIdempotencyKey } from "../_shared/request-idempotency.ts";
import { emitBusinessEvent, resolveAnalyticsErrorCode } from "../_shared/analytics.ts";
import {
  generateIcpDraftArtifact,
  type DraftRequestShape,
  type DraftSource,
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

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

type IcpSprintProfile = {
  fullName: string | null;
  niche: string | null;
};

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

async function fetchMarketSignals(serviceClient: any, req: Request, request: DraftRequestShape) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) {
    return { marketSignals: [] as string[], competitors: [] as Array<{ name: string; url: string | null }>, sources: [] as DraftSource[] };
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

    // Enrichment is optional. Cap it so a slow market-validation call can never
    // eat the draft-generation budget and push the client into a timeout.
    const validationResponse = await Promise.race([
      serviceClient.functions.invoke("market-validation-engine", {
        body: {
          business_idea: businessIdea,
          target_market: targetMarket,
        },
        headers: {
          Authorization: authHeader,
        },
      }),
      new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 10000)),
    ]);

    const score = (validationResponse as { data?: { validation_score?: any } })?.data?.validation_score;
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

    // Real, citable evidence: verbatim community discussions + competitor pages,
    // each kept with its source URL so the draft can cite where claims come from.
    const sources: DraftSource[] = [
      ...(score?.reddit_discussions || [])
        .slice(0, 5)
        .map((item: any): DraftSource | null => {
          const title = typeof item?.title === "string" ? item.title.trim() : "";
          if (!title) return null;
          const sub = item?.subreddit ? `r/${item.subreddit}` : null;
          const upvotes = typeof item?.upvotes === "number" ? `${item.upvotes} upvotes` : null;
          const detail = [sub, upvotes].filter(Boolean).join(" · ") || null;
          return {
            type: "community",
            title,
            url: typeof item?.url === "string" && item.url.trim() ? item.url : null,
            detail,
          };
        })
        .filter((item: DraftSource | null): item is DraftSource => Boolean(item)),
      ...(score?.top_competitors || [])
        .slice(0, 4)
        .map((item: any): DraftSource | null => {
          const name = typeof item?.name === "string" ? item.name.trim() : "";
          if (!name) return null;
          return {
            type: "competitor",
            title: name,
            url: typeof item?.website === "string" && item.website.trim() ? item.website : null,
            detail: "Competitor",
          };
        })
        .filter((item: DraftSource | null): item is DraftSource => Boolean(item)),
    ];

    return { marketSignals, competitors, sources };
  } catch (error) {
    console.warn("ICP analyzer enrichment failed, continuing without market signals", error);
    return { marketSignals: [] as string[], competitors: [] as Array<{ name: string; url: string | null }>, sources: [] as DraftSource[] };
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

function shouldChargeIcpCredits(amount: number) {
  return Number.isFinite(amount) && amount > 0;
}

async function storeArtifact({
  serviceClient,
  userId,
  artifact,
}: {
  serviceClient: any;
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

function cleanOptionalText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getArtifactNicheFallback(artifact: Record<string, any>) {
  return (
    cleanOptionalText(artifact?.founderInputs?.guided?.persona?.industry) ||
    cleanOptionalText(artifact?.draftDocument?.customer?.metaLine) ||
    cleanOptionalText(artifact?.draftDocument?.customer?.roleLine) ||
    cleanOptionalText(artifact?.draftDocument?.customer?.personaName)
  );
}

async function getIcpSprintProfile(
  serviceClient: any,
  userId: string,
  artifact: Record<string, any>,
): Promise<IcpSprintProfile> {
  const artifactNiche = getArtifactNicheFallback(artifact);

  try {
    const { data, error } = await serviceClient
      .from("profiles" as any)
      .select("full_name, creative_niche")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("ICP sprint profile lookup failed:", error);
      return { fullName: null, niche: artifactNiche };
    }

    const profile = data as { full_name?: string | null; creative_niche?: string | null } | null;
    return {
      fullName: cleanOptionalText(profile?.full_name),
      niche: cleanOptionalText(profile?.creative_niche) || artifactNiche,
    };
  } catch (error) {
    console.warn("ICP sprint profile lookup failed:", error);
    return { fullName: null, niche: artifactNiche };
  }
}

function triggerIcpSprint({
  supabaseUrl,
  supabaseKey,
  user,
  analysisId,
  artifact,
  profile,
}: {
  supabaseUrl: string;
  supabaseKey: string;
  user: AuthenticatedUser;
  analysisId: string | null;
  artifact: Record<string, any>;
  profile: IcpSprintProfile;
}) {
  const email = cleanOptionalText(user.email);
  if (!email) {
    console.warn("trigger-icp-sprint skipped: missing user email", { userId: user.id, analysisId });
    return;
  }

  const body = {
    userId: user.id,
    email,
    fullName: profile.fullName,
    icpId: analysisId,
    niche: profile.niche || getArtifactNicheFallback(artifact),
  };

  fetch(`${supabaseUrl}/functions/v1/trigger-icp-sprint`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  }).catch((err) => console.warn("trigger-icp-sprint fire failed:", err));
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
        const errBody = await completion.text().catch(() => "");
        throw new Error(`OpenAI API Error: ${completion.status} ${errBody.slice(0, 200)}`.trim());
      }

      const aiData = await completion.json();
      const seedContent = aiData?.choices?.[0]?.message?.content;
      if (typeof seedContent !== "string" || !seedContent.trim()) {
        throw new Error("OpenAI returned an empty persona suggestion");
      }
      let parsed: ReturnType<typeof JSON.parse>;
      try {
        parsed = JSON.parse(seedContent);
      } catch (parseError) {
        throw new Error(
          `Failed to parse persona suggestion JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }

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
      const profile = await getIcpSprintProfile(serviceClient, user.id, payload.artifact);
      triggerIcpSprint({
        supabaseUrl,
        supabaseKey,
        user,
        analysisId,
        artifact: payload.artifact,
        profile,
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
    let creditResult: {
      success: boolean;
      newBalance?: number;
      error?: string;
      errorCode?: string;
      usedFromQuota?: number;
      usedFromBalance?: number;
    } = { success: true, newBalance: 0 };
    let creditsCharged = false;
    let icpDraftCost = 0;

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

      // First ICP draft per account is free; every additional draft costs 5 credits.
      const { count: existingDraftCount } = await serviceClient
        .from(ICP_RESULTS_TABLE as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      icpDraftCost = (existingDraftCount ?? 0) >= 1 ? CREDIT_COSTS.ICP_EXTRA_DRAFT : 0;

      if (shouldChargeIcpCredits(icpDraftCost)) {
        creditResult = await checkAndDeductCredits(user.id, icpDraftCost, "ICP Draft", undefined, {
          idempotencyKey,
          entitlementFeature: "ICP_ANALYSIS",
        });
        if (!creditResult.success) {
          return new Response(JSON.stringify({
            success: false,
            error: creditResult.error || "Credit deduction failed",
            creditError: true,
            errorCode: creditResult.errorCode,
            requiredCredits: icpDraftCost,
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        creditsCharged = true;
      } else {
        console.info("First ICP draft is free for this account; no credits charged.", {
          userId: user.id,
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
          sources: enrichment.sources,
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
      const profile = await getIcpSprintProfile(serviceClient, user!.id, generated.artifact);
      triggerIcpSprint({
        supabaseUrl,
        supabaseKey,
        user: user!,
        analysisId,
        artifact: generated.artifact,
        profile,
      });

      return new Response(JSON.stringify({
        success: true,
        status: generated.status,
        artifact: generated.artifact,
        analysisId,
        creditsUsed: icpDraftCost,
        newBalance: creditResult.newBalance,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      if (payload.mode === "save" && user) {
        const refundSucceeded = creditsCharged
          ? await refundCredits(user.id, icpDraftCost, "ICP Draft", "Refund: ICP draft generation failed", {
              error: error instanceof Error ? error.message : String(error),
            })
          : true;
        await emitBusinessEvent({
          eventName: "generation_failed",
          userId: user.id,
          properties: {
            tool: "icp_builder",
            error_code: resolveAnalyticsErrorCode(error),
            credits_refunded: refundSucceeded && creditsCharged ? icpDraftCost : 0,
          },
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
