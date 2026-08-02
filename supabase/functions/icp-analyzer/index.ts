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
type Operation =
  | "seed_prefill"
  | "first_slice"
  | "start_hero_generation"
  | "load_guest_artifact"
  | "retry_guest_deep"
  | "claim_guest_artifact"
  | "build_draft"
  | "save_existing_artifact";

// The fast half of two-stage generation. build_draft is a single gpt-4o call
// with max_tokens 6000 and a 38s abort - it cannot put anything on screen
// quickly enough for a visitor who just typed one sentence into the homepage.
// first_slice answers the same question with gpt-4o-mini in a couple of
// seconds so there is real content to read while the full draft finishes.
interface FirstSliceRequest {
  operation: "first_slice";
  description: string;
}

interface StartHeroGenerationRequest {
  operation: "start_hero_generation";
  description: string;
  source?: string;
}

interface GuestArtifactRequest {
  operation: "load_guest_artifact" | "retry_guest_deep" | "claim_guest_artifact";
  resumeToken: string;
}

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

type RequestPayload =
  | SeedPrefillRequest
  | FirstSliceRequest
  | StartHeroGenerationRequest
  | GuestArtifactRequest
  | BuildDraftRequest
  | SaveExistingArtifactRequest;

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

// Anonymous preview generation is otherwise uncapped: it needs no auth and
// charges no credits. The signup wall used to sit AFTER generation, so it was
// never the cost control it appeared to be - removing it costs us nothing, but
// the path still has to be bounded. Mirrors demo-studio-generator.
const PREVIEW_RATE_LIMIT_PER_MIN = 5;
const FIRST_SLICE_TIMEOUT_MS = 10_000;

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || "unknown";
}

function validatePayload(payload: Partial<RequestPayload>) {
  const issues: string[] = [];

  if (payload.operation === "seed_prefill") {
    if (!isNonEmpty(payload.seed, 8)) issues.push("seed must be at least 8 characters");
    return issues;
  }

  if (payload.operation === "first_slice" || payload.operation === "start_hero_generation") {
    if (!isNonEmpty(payload.description, 3)) issues.push("description must be at least 3 characters");
    return issues;
  }

  if (
    payload.operation === "load_guest_artifact" ||
    payload.operation === "retry_guest_deep" ||
    payload.operation === "claim_guest_artifact"
  ) {
    if (!isNonEmpty(payload.resumeToken, 32)) issues.push("resumeToken is invalid");
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
    issues.push("operation is not supported");
    return issues;
  }

  if (payload.mode !== "preview" && payload.mode !== "save") {
    issues.push("mode must be preview or save");
  }

  if (payload.entryMode === "fast") {
    // Mirrors fastIcpInputSchema on the client: 3 characters, not 40. The old
    // floor rejected exactly the short first sentences we now invite.
    if (!isNonEmpty(payload.fastInput?.description, 3)) {
      issues.push("fastInput.description must be at least 3 characters");
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

function buildFirstSlicePrompt(description: string) {
  return `You are helping a founder see who they are building for.
Return valid JSON only in this shape:
{
  "personaName": "string",
  "roleLine": "string",
  "primarySegment": "string",
  "urgentProblem": "string",
  "buyingTrigger": "string",
  "nonFitSegment": "string",
  "messagingHook": "string",
  "validationStep": "string"
}

Rules:
- Be specific and concrete. Never say "small businesses" or "creators".
- personaName is a short human label, e.g. "Solo bookkeeper at a 3-person firm".
- roleLine is one sentence describing who they are and what they do.
- primarySegment names the narrow market you would sell to first.
- urgentProblem is one frustration they feel now, in their words, not market-speak.
- buyingTrigger is the specific moment that makes them look for a solution.
- nonFitSegment names one adjacent customer the founder should deliberately avoid first.
- messagingHook is a concise outcome-led promise written to the customer.
- validationStep is one concrete interview or outreach action the founder can do this week.
- The founder may have written only a few words. Infer the most plausible
  reading and commit to it rather than hedging or asking for more detail.

What they are building:
${description}`;
}

type HeroDecisionBrief = {
  personaName: string;
  roleLine: string;
  primarySegment: string;
  urgentProblem: string;
  buyingTrigger: string;
  nonFitSegment: string;
  messagingHook: string;
  validationStep: string;
};

const cleanHeroField = (value: unknown) => typeof value === "string" ? value.trim() : "";

function normalizeHeroDecisionBrief(value: Record<string, unknown>): HeroDecisionBrief {
  return {
    personaName: cleanHeroField(value.personaName),
    roleLine: cleanHeroField(value.roleLine),
    primarySegment: cleanHeroField(value.primarySegment ?? value.segment),
    urgentProblem: cleanHeroField(value.urgentProblem ?? value.corePain),
    buyingTrigger: cleanHeroField(value.buyingTrigger),
    nonFitSegment: cleanHeroField(value.nonFitSegment),
    messagingHook: cleanHeroField(value.messagingHook),
    validationStep: cleanHeroField(value.validationStep),
  };
}

async function generateHeroDecisionBrief(openaiApiKey: string, description: string): Promise<HeroDecisionBrief> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FIRST_SLICE_TIMEOUT_MS);
  let completion: Response;
  try {
    completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_tokens: 850,
        messages: [
          { role: "system", content: "Return valid JSON only." },
          { role: "user", content: buildFirstSlicePrompt(description) },
        ],
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!completion.ok) {
    const body = await completion.text().catch(() => "");
    throw new Error(`OpenAI API Error: ${completion.status} ${body.slice(0, 200)}`.trim());
  }

  const data = await completion.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI returned an empty hero decision brief");
  }

  const brief = normalizeHeroDecisionBrief(JSON.parse(content));
  if (!brief.personaName || !brief.primarySegment || !brief.urgentProblem || !brief.validationStep) {
    throw new Error("OpenAI returned an incomplete hero decision brief");
  }
  return brief;
}

function createResumeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hashResumeToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

async function generateAndPersistHeroDeep({
  serviceClient,
  openaiApiKey,
  req,
  artifactId,
  description,
}: {
  serviceClient: any;
  openaiApiKey: string;
  req: Request;
  artifactId: string;
  description: string;
}) {
  const request: DraftRequestShape = {
    entryMode: "fast",
    fastInput: { description },
  };

  try {
    const enrichment = await fetchMarketSignals(serviceClient, req, request);
    const generated = await generateIcpDraftArtifact({
      openaiApiKey,
      request,
      enrichment: {
        marketSignals: enrichment.marketSignals,
        competitorLinks: enrichment.competitors,
        sources: enrichment.sources,
      },
    });
    const { error } = await serviceClient
      .from("guest_activation_artifacts")
      .update({
        deep_payload: generated.artifact,
        generation_status: "deep_ready",
        generation_error_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artifactId);
    if (error) throw error;
    return generated.artifact;
  } catch (error) {
    await serviceClient
      .from("guest_activation_artifacts")
      .update({
        generation_status: "deep_failed",
        generation_error_code: resolveAnalyticsErrorCode(error),
        updated_at: new Date().toISOString(),
      })
      .eq("id", artifactId);
    throw error;
  }
}

function guestArtifactResponse(row: Record<string, any>) {
  return {
    success: true,
    artifactId: row.id,
    artifactType: row.artifact_type,
    source: row.source,
    compact: row.compact_payload,
    artifact: row.deep_payload,
    generationStatus: row.generation_status,
    claimState: row.claim_state,
    nativeArtifactId: row.native_artifact_id,
    expiresAt: row.expires_at,
  };
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

    if (payload.operation === "start_hero_generation") {
      const { error: rateError } = await serviceClient.rpc("assert_rate_limit", {
        p_key: "icp_hero_generation:" + getClientIp(req),
        p_user_id: null,
        p_max_per_minute: PREVIEW_RATE_LIMIT_PER_MIN,
      });
      if (rateError) {
        const limited = /rate_limit_exceeded/i.test(rateError.message || "");
        return new Response(JSON.stringify({
          success: false,
          error: limited
            ? "You have hit the free draft limit. Wait a minute, or create a free account to keep going."
            : "ICP drafts are temporarily unavailable. Please try again shortly.",
          errorCode: limited ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
        }), {
          status: limited ? 429 : 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resumeToken = createResumeToken();
      const resumeTokenHash = await hashResumeToken(resumeToken);
      const source = cleanOptionalText(payload.source) || "homepage_hero";
      const { data: guestRow, error: guestInsertError } = await serviceClient
        .from("guest_activation_artifacts")
        .insert({
          artifact_type: "icp",
          source,
          input_payload: { description: payload.description },
          resume_token_hash: resumeTokenHash,
          generation_status: "compact_generating",
        })
        .select("id, expires_at")
        .single();
      if (guestInsertError || !guestRow) {
        throw new Error(`Could not preserve the guest artifact: ${guestInsertError?.message || "unknown error"}`);
      }

      const artifactId = String(guestRow.id);
      const deepPromise = generateAndPersistHeroDeep({
        serviceClient,
        openaiApiKey,
        req,
        artifactId,
        description: payload.description,
      }).catch((error) => {
        console.error("Hero deep generation failed", { artifactId, error });
      });
      EdgeRuntime.waitUntil(deepPromise);

      try {
        const compact = await generateHeroDecisionBrief(openaiApiKey, payload.description);
        await serviceClient
          .from("guest_activation_artifacts")
          .update({
            compact_payload: compact,
            updated_at: new Date().toISOString(),
          })
          .eq("id", artifactId);
        await serviceClient
          .from("guest_activation_artifacts")
          .update({ generation_status: "deep_running", updated_at: new Date().toISOString() })
          .eq("id", artifactId)
          .eq("generation_status", "compact_generating");
        return new Response(JSON.stringify({
          success: true,
          artifactId,
          resumeToken,
          expiresAt: guestRow.expires_at,
          compact,
          generationStatus: "deep_running",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        await serviceClient
          .from("guest_activation_artifacts")
          .update({
            generation_error_code: resolveAnalyticsErrorCode(error),
            updated_at: new Date().toISOString(),
          })
          .eq("id", artifactId);
        return new Response(JSON.stringify({
          success: false,
          artifactId,
          resumeToken,
          expiresAt: guestRow.expires_at,
          generationStatus: "deep_running",
          error: "The compact brief did not finish. We are still building the full result.",
          errorCode: resolveAnalyticsErrorCode(error),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (
      payload.operation === "load_guest_artifact" ||
      payload.operation === "retry_guest_deep" ||
      payload.operation === "claim_guest_artifact"
    ) {
      const isDeepRetry = payload.operation === "retry_guest_deep";
      const guestAction = isDeepRetry
        ? "retry"
        : payload.operation === "claim_guest_artifact"
          ? "claim"
          : "resume";
      const { error: guestActionRateError } = await serviceClient.rpc("assert_rate_limit", {
        p_key: `guest_icp_${guestAction}:` + getClientIp(req),
        p_user_id: null,
        p_max_per_minute: isDeepRetry ? PREVIEW_RATE_LIMIT_PER_MIN : 30,
      });
      if (guestActionRateError) {
        return new Response(JSON.stringify({
          success: false,
          error: "Too many result requests. Wait a minute and try again.",
          errorCode: "RATE_LIMITED",
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const tokenHash = await hashResumeToken(payload.resumeToken);
      const { data: guest, error: guestError } = await serviceClient
        .from("guest_activation_artifacts")
        .select("*")
        .eq("resume_token_hash", tokenHash)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (guestError || !guest) {
        return new Response(JSON.stringify({ success: false, error: "This result link is no longer valid.", errorCode: "NOT_FOUND" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (payload.operation === "load_guest_artifact") {
        return new Response(JSON.stringify(guestArtifactResponse(guest)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const inputDescription = cleanOptionalText(guest.input_payload?.description);
      if (payload.operation === "retry_guest_deep") {
        if (!inputDescription) {
          return new Response(JSON.stringify({ success: false, error: "This result cannot be regenerated." }), {
            status: 422,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (guest.generation_status !== "deep_ready") {
          await serviceClient
            .from("guest_activation_artifacts")
            .update({ generation_status: "deep_running", generation_error_code: null, updated_at: new Date().toISOString() })
            .eq("id", guest.id);
          EdgeRuntime.waitUntil(generateAndPersistHeroDeep({
            serviceClient,
            openaiApiKey,
            req,
            artifactId: guest.id,
            description: inputDescription,
          }).catch((error) => console.error("Hero deep retry failed", { artifactId: guest.id, error })));
        }
        return new Response(JSON.stringify({ success: true, artifactId: guest.id, generationStatus: "deep_running" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = await getUserFromAuth(req);
      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "Authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (guest.claimed_by && guest.claimed_by !== user.id) {
        return new Response(JSON.stringify({ success: false, error: "This result has already been claimed.", errorCode: "ALREADY_CLAIMED" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (guest.native_artifact_id && guest.claimed_by === user.id) {
        return new Response(JSON.stringify({
          ...guestArtifactResponse(guest),
          success: true,
          status: "claimed",
          analysisId: guest.native_artifact_id,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!guest.deep_payload) {
        if (guest.generation_status === "deep_failed" && inputDescription) {
          try {
            guest.deep_payload = await generateAndPersistHeroDeep({
              serviceClient,
              openaiApiKey,
              req,
              artifactId: guest.id,
              description: inputDescription,
            });
          } catch (error) {
            await emitBusinessEvent({
              eventName: "artifact_claim_failed",
              userId: user.id,
              properties: { tool: "icp_builder", source: guest.source, error_code: resolveAnalyticsErrorCode(error) },
            });
            return new Response(JSON.stringify({ success: false, pending: false, error: "The full brief is not ready yet.", errorCode: "DEEP_FAILED" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          return new Response(JSON.stringify({ success: false, pending: true, generationStatus: guest.generation_status }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      try {
        const { data: analysisId, error: claimError } = await serviceClient.rpc("claim_guest_icp_artifact", {
          p_guest_id: guest.id,
          p_user_id: user.id,
        });
        if (claimError || !analysisId) {
          if (/ALREADY_CLAIMED/i.test(claimError?.message || "")) {
            return new Response(JSON.stringify({ success: false, error: "This result has already been claimed.", errorCode: "ALREADY_CLAIMED" }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          throw new Error(claimError?.message || "The saved brief could not be created");
        }
        const profile = await getIcpSprintProfile(serviceClient, user.id, guest.deep_payload);
        triggerIcpSprint({ supabaseUrl, supabaseKey, user, analysisId, artifact: guest.deep_payload, profile });
        await emitBusinessEvent({
          eventName: "artifact_claim_succeeded",
          userId: user.id,
          properties: { tool: "icp_builder", source: guest.source, artifact_type: "icp_analysis", artifact_id: analysisId },
        });
        return new Response(JSON.stringify({
          success: true,
          status: "claimed",
          artifact: guest.deep_payload,
          compact: guest.compact_payload,
          artifactId: guest.id,
          analysisId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (error) {
        await emitBusinessEvent({
          eventName: "artifact_claim_failed",
          userId: user.id,
          properties: { tool: "icp_builder", source: guest.source, error_code: resolveAnalyticsErrorCode(error) },
        });
        throw error;
      }
    }

    if (payload.operation === "first_slice") {
      // Same per-IP cap as the preview path; this runs unauthenticated too.
      const { error: sliceRateError } = await serviceClient.rpc("assert_rate_limit", {
        p_key: "icp_first_slice:" + getClientIp(req),
        p_user_id: null,
        p_max_per_minute: PREVIEW_RATE_LIMIT_PER_MIN,
      });
      if (sliceRateError) {
        const rateLimited = /rate_limit_exceeded/i.test(sliceRateError.message || "");
        return new Response(JSON.stringify({
          success: false,
          error: rateLimited
            ? "You have hit the free draft limit. Wait a minute, or create a free account to keep going."
            : "ICP drafts are temporarily unavailable. Please try again shortly.",
          errorCode: rateLimited ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
        }), {
          status: rateLimited ? 429 : 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const slice = await generateHeroDecisionBrief(openaiApiKey, payload.description);

      return new Response(JSON.stringify({
        success: true,
        slice: {
          personaName: typeof slice.personaName === "string" ? slice.personaName : "",
          roleLine: typeof slice.roleLine === "string" ? slice.roleLine : "",
          ...slice,
          // Legacy aliases stay for one release while older clients drain.
          segment: slice.primarySegment,
          corePain: slice.urgentProblem,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (payload.mode === "preview") {
      // Fail closed: never generate uncapped if the limiter itself errors.
      const { error: rateLimitError } = await serviceClient.rpc("assert_rate_limit", {
        p_key: "icp_preview:" + getClientIp(req),
        p_user_id: null,
        p_max_per_minute: PREVIEW_RATE_LIMIT_PER_MIN,
      });
      if (rateLimitError) {
        const rateLimited = /rate_limit_exceeded/i.test(rateLimitError.message || "");
        return new Response(JSON.stringify({
          success: false,
          error: rateLimited
            ? "You have hit the free draft limit. Wait a minute, or create a free account to keep going."
            : "ICP drafts are temporarily unavailable. Please try again shortly.",
          errorCode: rateLimited ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
        }), {
          status: rateLimited ? 429 : 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
