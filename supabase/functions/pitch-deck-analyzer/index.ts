import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAndDeductCredits, getUserFromAuth, refundCredits } from "../_shared/credit-deduction.ts";
import { CREDIT_COSTS } from "../_shared/credit-constants.ts";
import { resolveCreditIdempotencyKey } from "../_shared/request-idempotency.ts";
import { emitAiGenerationCost } from "../_shared/ai-cost.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

// One analysis for everyone. A PDF-capable Claude vision model reads the actual
// slides (text, charts, layout) against the rubric. Haiku 4.5 is the cost-
// efficient pick (native PDF, ~3x cheaper than Sonnet) and is already used across
// the MVP Builder. Anonymous visitors get ONE free run per IP; signed-in runs are
// credit-metered. Swap MODEL if quality ever needs to step up.
const MODEL = "claude-haiku-4-5-20251001";
const FREE_ANALYSES_PER_IP = 1;
const FREE_MAX_PDF_BYTES = 8 * 1024 * 1024; // 8MB; larger decks must sign up
// Haiku 4.5 allows up to 64K output. The prompt below bounds the response to a
// roughly constant size regardless of deck length, but dense decks still need
// real headroom — 4000 truncated the JSON on a 17-slide deck and broke parsing.
const ANALYSIS_MAX_TOKENS = 8000;
const UPLOAD_BUCKET = "pitch-deck-uploads";
const RESULTS_TABLE = "pitch_deck_analyses";

// Dimension weights (sum to 1.0) — overall score is computed server-side, never
// trusted from the model.
const DIMENSION_WEIGHTS: Record<string, number> = {
  storyClarity: 0.15,
  marketOpportunity: 0.20,
  tractionProof: 0.30,
  businessModel: 0.15,
  teamCredibility: 0.10,
  fundraisingReadiness: 0.10,
};

interface SubScores {
  storyClarity: number;
  marketOpportunity: number;
  tractionProof: number;
  businessModel: number;
  teamCredibility: number;
  fundraisingReadiness: number;
}

type Verdict = "Excellent" | "Strong" | "Good" | "Needs Work";

interface AnalyzeRequest {
  mode: "free" | "deep";
  // free
  pdfBase64?: string;
  fileName?: string;
  fileSize?: number;
  // deep
  userId?: string;
  storagePath?: string;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || "unknown";
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function clampScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeSubScores(raw: any): SubScores {
  return {
    storyClarity: clampScore(raw?.storyClarity),
    marketOpportunity: clampScore(raw?.marketOpportunity),
    tractionProof: clampScore(raw?.tractionProof),
    businessModel: clampScore(raw?.businessModel),
    teamCredibility: clampScore(raw?.teamCredibility),
    fundraisingReadiness: clampScore(raw?.fundraisingReadiness),
  };
}

function calculateOverallScore(s: SubScores): number {
  const weighted =
    s.storyClarity * DIMENSION_WEIGHTS.storyClarity +
    s.marketOpportunity * DIMENSION_WEIGHTS.marketOpportunity +
    s.tractionProof * DIMENSION_WEIGHTS.tractionProof +
    s.businessModel * DIMENSION_WEIGHTS.businessModel +
    s.teamCredibility * DIMENSION_WEIGHTS.teamCredibility +
    s.fundraisingReadiness * DIMENSION_WEIGHTS.fundraisingReadiness;
  return Math.round(weighted);
}

// Reconciled with the frontend type (src/types/pitchDeckAnalyzer.ts).
function getVerdict(score: number): Verdict {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Good";
  return "Needs Work";
}

const RUBRIC = `You are a top-tier venture capital partner reviewing a founder's pitch deck. You are reading the actual slides (text, charts, images, layout). Be rigorous, specific, and consistent — never generic. Every judgement MUST cite concrete evidence quoted from the deck.

Score 6 dimensions 0-100 using these bands. 0-39 = Weak, 40-69 = Developing, 70-100 = Strong.
1. Story & Clarity (weight 15%): Weak = no clear problem, jargon, unclear what they do. Strong = a stranger gets it in 30 seconds; sharp problem -> solution -> why-now arc.
2. Market & Opportunity (20%): Weak = no sizing or a vanity "$X trillion" with no basis. Strong = bottom-up TAM/SAM/SOM with sources, a specific ICP, and a credible wedge/differentiation.
3. Traction & Proof (30%, most important): Weak = "we will...", no metrics. Strong = revenue/ARR, growth rate, retention/cohorts, named customers/pilots.
4. Business Model (15%): Weak = no pricing/monetization. Strong = clear pricing + unit economics (LTV/CAC/margins) + path to scale.
5. Team & Credibility (10%): Weak = names only. Strong = demonstrated founder-market fit, prior outcomes, key hires/advisors.
6. Fundraising Readiness (10%): Weak = no ask. Strong = a specific, stage-appropriate raise with use-of-funds tied to concrete milestones and runway.

Rules: judge what is actually on the slides; quote the deck as evidence for each finding; do not invent facts; do not use hype words; return ONLY one valid JSON object, no markdown.`;

function buildAnalysisPrompt(): string {
  return `${RUBRIC}

Output JSON exactly:
{
  "subScores": { "storyClarity": <0-100>, "marketOpportunity": <0-100>, "tractionProof": <0-100>, "businessModel": <0-100>, "teamCredibility": <0-100>, "fundraisingReadiness": <0-100> },
  "dimensions": {
    "storyClarity": { "score": <0-100>, "band": "Weak|Developing|Strong", "findings": [ { "text": "<specific observation>", "evidence": "<short quote from deck>", "severity": "high|medium|low" } ], "fix": "<one concrete fix>" },
    "marketOpportunity": { ... same shape ... },
    "tractionProof": { ... },
    "businessModel": { ... },
    "teamCredibility": { ... },
    "fundraisingReadiness": { ... }
  },
  "strengths": ["<specific strength>"],
  "weaknesses": ["<specific weakness>"],
  "recommendations": ["<specific recommendation>"],
  "slideChecklist": { "present": ["problem","solution",...], "missing": ["competition",...] },
  "narrativeFlow": { "score": <0-100>, "notes": "<assessment of slide order and story arc>" },
  "actionPlan": [ { "priority": 1, "action": "<the highest-impact change>", "impact": "<why it moves the score>" } ],
  "benchmark": { "stage": "pre-seed|seed|series-a|unknown", "comparison": "<how this compares to a typical funded deck at that stage>" },
  "keyInsights": { "targetMarket": "", "uniqueValueProp": "", "fundingStage": "", "askAmount": "" }
}
Expected slides for the checklist: problem, solution, product, market, traction, business model, competition, team, ask.

Length limits — obey these so the JSON stays complete and valid for decks of any length:
- At most 2 findings per dimension (pick the highest-impact ones).
- Each "evidence" quote <= 12 words; each "text"/"fix" <= 1 sentence.
- "strengths", "weaknesses", "recommendations": at most 3 items each, one sentence each.
- "actionPlan": at most 3 items. "narrativeFlow.notes" and "benchmark.comparison": <= 2 sentences each.
- Summarize a long or dense deck — never enumerate every slide. Be concise.
Return ONLY the single complete JSON object — no markdown fences, no prose before or after. Ensure it is fully closed and valid.`;
}

async function callClaude(pdfBase64: string, maxTokens: number): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw Object.assign(new Error("ANTHROPIC_API_KEY not configured"), { status: 500 });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.2,
      system: buildAnalysisPrompt(),
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
            { type: "text", text: "Analyze this pitch deck and return the JSON." },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Anthropic API error:", response.status, errText);
    const status = response.status === 429 ? 429 : 502;
    throw Object.assign(new Error(`Model error: ${response.status}`), { status });
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw Object.assign(new Error("Empty model response"), { status: 502 });

  // If generation hit the token cap the JSON is cut off mid-stream and won't parse.
  // Surface it explicitly rather than failing as a generic "malformed JSON".
  if (data?.stop_reason === "max_tokens") {
    console.error("pitch-deck: model hit max_tokens; output truncated. textLen=", text.length);
    throw Object.assign(new Error("Analysis output was truncated"), { status: 502 });
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    console.error("pitch-deck: no JSON object in response. stop_reason=", data?.stop_reason, "preview=", String(text).slice(0, 600));
    throw Object.assign(new Error("Model did not return JSON"), { status: 502 });
  }
  try {
    return { parsed: JSON.parse(match[0]), usage: data?.usage ?? null };
  } catch (parseErr) {
    console.error(
      "pitch-deck: JSON.parse failed. stop_reason=", data?.stop_reason,
      "jsonLen=", match[0].length,
      "tail=", match[0].slice(-300),
    );
    throw Object.assign(new Error("Model returned malformed JSON"), { status: 502 });
  }
}

function buildResult(parsed: any) {
  const subScores = normalizeSubScores(parsed?.subScores);
  const overallScore = calculateOverallScore(subScores);
  return {
    overallScore,
    verdict: getVerdict(overallScore),
    subScores,
    strengths: Array.isArray(parsed?.strengths) ? parsed.strengths.slice(0, 6) : [],
    weaknesses: Array.isArray(parsed?.weaknesses) ? parsed.weaknesses.slice(0, 6) : [],
    recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations.slice(0, 6) : [],
    // Rich structured detail rides in key_insights (jsonb) — no schema migration.
    keyInsights: {
      ...(parsed?.keyInsights ?? {}),
      dimensions: parsed?.dimensions ?? null,
      slideChecklist: parsed?.slideChecklist ?? null,
      narrativeFlow: parsed?.narrativeFlow ?? null,
      actionPlan: Array.isArray(parsed?.actionPlan) ? parsed.actionPlan : [],
      benchmark: parsed?.benchmark ?? null,
    },
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function getAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

// ---- Free (anonymous): one full analysis per IP -----------------------------
async function handleFree(req: Request, body: AnalyzeRequest): Promise<Response> {
  if (!body.pdfBase64) return json({ error: "pdfBase64 is required" }, 400);
  const approxBytes = Math.floor((body.pdfBase64.length * 3) / 4);
  if (approxBytes > FREE_MAX_PDF_BYTES) {
    return json({ error: "This deck is large. Create a free account to analyze decks over 8MB.", oversize: true }, 413);
  }

  const admin = getAdmin();
  if (!admin) return json({ error: "Service unavailable. Please try again." }, 500);

  const ip = getClientIp(req);

  // Atomically reserve the IP's free attempt; blocks once the cap is reached.
  const { data: allowed, error: consumeErr } = await admin.rpc("consume_pitch_deck_free_attempt", {
    p_ip: ip,
    p_max: FREE_ANALYSES_PER_IP,
  });
  if (consumeErr) {
    console.error("consume_pitch_deck_free_attempt error:", consumeErr);
    return json({ error: "Could not start the analysis. Try again in a moment." }, 500);
  }
  if (allowed === false) {
    return json(
      {
        error: "You've used your free analysis. Sign up to analyze more decks — 10 credits each.",
        limitReached: true,
      },
      403,
    );
  }

  try {
    const { parsed, usage } = await callClaude(body.pdfBase64, ANALYSIS_MAX_TOKENS);
    const result = buildResult(parsed);
    await emitAiGenerationCost({
      userId: null,
      feature: "PITCH_DECK_ANALYZER",
      model: MODEL,
      provider: "anthropic",
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
    });
    return json({ success: true, ...result, fileName: body.fileName ?? null, guest: true });
  } catch (err) {
    console.error("pitch-deck free analysis failed:", err instanceof Error ? err.message : err);
    // Give the free try back so a transient failure doesn't burn it.
    await admin.rpc("release_pitch_deck_free_attempt", { p_ip: ip });
    const status = (err as { status?: number })?.status ?? 500;
    return json(
      { error: "We couldn't analyze your deck just now. Please try again.", errorCode: "ANALYSIS_FAILED" },
      status === 429 ? 429 : 500,
    );
  }
}

// ---- Deep (authenticated): first analysis free (gift), then credit-metered ---
async function handleDeep(req: Request, body: AnalyzeRequest): Promise<Response> {
  if (!body.storagePath) return json({ error: "storagePath is required" }, 400);

  const user = await getUserFromAuth(req);
  if (!user) return json({ error: "Authentication required" }, 401);
  if (body.userId && body.userId !== user.id) return json({ error: "User mismatch" }, 403);

  const admin = getAdmin();
  if (!admin) return json({ error: "Service unavailable. Please try again." }, 500);

  const cost = CREDIT_COSTS.PITCH_DECK_ANALYZER;

  // First signed-in analysis is free: race-safe one-time claim in feature_gifts
  // (same pattern as the PMF first-score gift). Failures fall through to a
  // normal charge, and the claim is released if the analysis itself fails.
  let isFirstAnalysisGift = false;
  {
    const { data: gift, error: giftError } = await admin
      .from("feature_gifts")
      .insert({ user_id: user.id, feature: "PITCH_DECK_ANALYZER" })
      .select("user_id")
      .maybeSingle();
    isFirstAnalysisGift = !giftError && Boolean(gift);
  }

  const idempotencyKey = await resolveCreditIdempotencyKey(req, {
    userId: user.id,
    feature: "Pitch Deck Analyzer",
    requestFingerprint: { storagePath: body.storagePath, fileName: body.fileName },
  });

  let creditResult: Awaited<ReturnType<typeof checkAndDeductCredits>> = { success: true } as never;
  if (!isFirstAnalysisGift) {
    creditResult = await checkAndDeductCredits(user.id, cost, "Pitch Deck Analyzer", undefined, {
      idempotencyKey,
      entitlementFeature: "PITCH_DECK_ANALYZER",
    });
    if (!creditResult.success) {
      return json(
        { error: creditResult.error || "Insufficient credits", creditError: true, errorCode: creditResult.errorCode, requiredCredits: cost },
        creditResult.errorCode === "INSUFFICIENT_CREDITS" ? 402 : 400,
      );
    }
  }
  const chargedCredits = isFirstAnalysisGift
    ? 0
    : (creditResult.usedFromQuota ?? 0) + (creditResult.usedFromBalance ?? 0);

  try {
    const { data: fileData, error: dlErr } = await admin.storage.from(UPLOAD_BUCKET).download(body.storagePath);
    if (dlErr || !fileData) throw Object.assign(new Error("Could not read the uploaded deck."), { status: 400 });
    const pdfBase64 = toBase64(new Uint8Array(await fileData.arrayBuffer()));

    const { parsed, usage } = await callClaude(pdfBase64, ANALYSIS_MAX_TOKENS);
    const result = buildResult(parsed);

    // Cost side of the margin equation. operationId === the credit deduction's
    // idempotency key, so this $ai_generation joins 1:1 to credit_action_completed.
    await emitAiGenerationCost({
      userId: user.id,
      feature: "PITCH_DECK_ANALYZER",
      model: MODEL,
      provider: "anthropic",
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      operationId: idempotencyKey,
    });

    return json({ success: true, ...result, creditsUsed: chargedCredits, giftUsed: isFirstAnalysisGift });
  } catch (err) {
    console.error("pitch-deck deep analysis failed:", err instanceof Error ? err.message : err);
    if (chargedCredits > 0) {
      await refundCredits(user.id, chargedCredits, "Pitch Deck Analyzer", "Refund: analysis failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // A failed run must not consume the free first analysis.
    if (isFirstAnalysisGift) {
      await admin
        .from("feature_gifts")
        .delete()
        .eq("user_id", user.id)
        .eq("feature", "PITCH_DECK_ANALYZER");
    }
    const status = (err as { status?: number })?.status ?? 500;
    return json({ error: "We couldn't analyze your deck just now. Please try again.", errorCode: "ANALYSIS_FAILED" }, status === 429 ? 429 : 500);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body: AnalyzeRequest = await req.json();
    if (body.mode === "free") return await handleFree(req, body);
    if (body.mode === "deep") return await handleDeep(req, body);
    return json({ error: "mode must be 'free' or 'deep'" }, 400);
  } catch (error) {
    console.error("Pitch deck analyzer error:", error);
    return json({ error: error instanceof Error ? error.message : "Failed to analyze pitch deck" }, 500);
  }
});
