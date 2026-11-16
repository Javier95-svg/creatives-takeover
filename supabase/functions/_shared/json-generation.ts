/**
 * Text and JSON generation for the founder tools, one provider chain for all.
 *
 * 2026-11-11: the OpenAI key ran out of credits and took ICP Builder down with
 * it. Gemini's text models (ungrounded) were the only provider still answering,
 * and they are the cheapest option we have, so they go first.
 *
 * 2026-11-16: Gemini's free tier answered 503 "high demand" while OpenAI still
 * had no credits, and fifteen functions called OpenAI with no backup at all.
 * Every AI text call now goes through this chain: Gemini (paid, cheap), then
 * the Lovable gateway and Groq, then OpenAI last (its credit is kept for audio).
 * A provider whose key is dead is skipped for a while instead of being tried on
 * every call, every call can be written to provider_spend_ledger, and when the
 * month's AI spend passes AI_MONTHLY_BUDGET_USD the paid providers are skipped.
 */

import { callGemini, GeminiError, type GeminiModelSpec } from "./gemini.ts";

/**
 * Fast models first. callGemini shares one deadline across its models, and
 * gemini-3.8-flash timed out and returned 503 "high demand" on 2026-11-11,
 * spending the whole budget before any fallback ran.
 */
export const FAST_JSON_MODELS: GeminiModelSpec[] = [
  { model: "gemini-3.5-flash-lite" },
  { model: "gemini-3.6-flash", thinkingLevel: "low" },
  // Last: slow and often busy, but a separate capacity pool when the others are.
  { model: "gemini-3.8-flash", thinkingLevel: "low" },
];

/**
 * Gemini answers 503 "high demand" (and 429 per-minute limits) in short bursts:
 * on 2026-11-11 every model returned 503 within five seconds and the ICP draft
 * failed. Such errors are retried after a pause while time remains.
 */
const RETRY_PAUSES_MS = [2_000, 5_000];
const MIN_ATTEMPT_MS = 8_000;
// callGemini reports an upstream 503 as status 502 with "Gemini error: 503" as
// the message, so the message is what identifies it.
const isTransientGeminiError = (error: unknown) =>
  error instanceof GeminiError
  && (error.status === 503 || error.status === 429 || /Gemini error: (503|429)\b|high demand/i.test(error.message));
const isDeadGeminiKey = (error: unknown) =>
  error instanceof GeminiError && /Gemini error: (401|402|403)\b|not configured/i.test(error.message);
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface TextGenerationRequest {
  /** Shown in logs, e.g. "icp-draft". */
  label: string;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  /** Budget for the whole call, across every provider. */
  timeoutMs: number;
  /** OpenAI model, used only when every other provider fails. */
  openaiModel: string;
  geminiModels?: GeminiModelSpec[];
  /**
   * Spend-ledger feature, e.g. "DEMO_STUDIO"; defaults to the label. `false`
   * for callers that write their own ledger rows (customer research).
   */
  feature?: string | false;
  /** Images as data URLs (data:image/png;base64,...). Providers without vision are skipped. */
  images?: string[];
}

/** "data:image/png;base64,AAAA" → Gemini inline data; anything else is dropped. */
function inlineImage(dataUrl: string) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  return match ? { inlineData: { mimeType: match[1], data: match[2] } } : null;
}
const VISION_PROVIDERS = new Set<ProviderName>(["gemini", "lovable", "openai"]);
export type JsonGenerationRequest = TextGenerationRequest;

export type ProviderName = "gemini" | "openai" | "lovable" | "groq";

export interface JsonGenerationResult {
  text: string;
  provider: ProviderName;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

/** Leave the fallbacks enough time to answer when Gemini uses its share and fails. */
const FALLBACK_RESERVE_MS = 15_000;

// ---------------------------------------------------------------------------
// Dead keys: skip a provider for a while after an auth or "no credits" answer.

const BREAKER_MS = 10 * 60_000;
const skipUntil = new Map<ProviderName, number>();
const isOpen = (provider: ProviderName) => (skipUntil.get(provider) ?? 0) > Date.now();
function trip(provider: ProviderName, label: string) {
  skipUntil.set(provider, Date.now() + BREAKER_MS);
  console.error(`${label}: ${provider} key has no access or no credit; skipping it for ${BREAKER_MS / 60_000} minutes`);
}
/** Tests only. */
export function resetProviderBreakers() {
  skipUntil.clear();
  budgetCache = null;
}

export class ProviderError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(message: string, status: number, body = "") {
    super(message);
    this.status = status;
    this.body = body;
  }
}
/** 401/402/403, or a 429 that is about money rather than speed. */
export const isDeadKeyError = (error: unknown) =>
  error instanceof ProviderError
  && (error.status === 401 || error.status === 402 || error.status === 403
    || (error.status === 429 && /insufficient_quota|no credits|credit balance|billing|exceeded your current quota/i.test(error.body)));

// ---------------------------------------------------------------------------
// Spend ledger and the monthly cap on paid providers.

/** USD per million tokens. Lovable and Groq are not billed to us per call. */
const PRICE_PER_MILLION: Record<ProviderName, { input: number; output: number }> = {
  gemini: { input: 0.15, output: 0.6 },
  openai: { input: 0.15, output: 0.6 },
  lovable: { input: 0, output: 0 },
  groq: { input: 0, output: 0 },
};
export const PAID_PROVIDERS: ProviderName[] = ["gemini", "openai"];
const BUDGET_CACHE_MS = 5 * 60_000;
let budgetCache: { at: number; spent: number } | null = null;

const monthlyBudgetUsd = () => Number(Deno.env.get("AI_MONTHLY_BUDGET_USD") ?? "25") || 25;

function restTarget() {
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  return url && key ? { url, key } : null;
}

export function estimateCostUsd(provider: ProviderName, inputTokens = 0, outputTokens = 0) {
  const price = PRICE_PER_MILLION[provider];
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

/** Month-to-date AI (llm:*) spend from the ledger, cached per instance. */
export async function aiSpendThisMonth(): Promise<number | null> {
  if (budgetCache && Date.now() - budgetCache.at < BUDGET_CACHE_MS) return budgetCache.spent;
  const target = restTarget();
  if (!target) return null;
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  try {
    const response = await fetch(
      `${target.url}/rest/v1/provider_spend_ledger?select=est_cost_usd&provider=like.llm%3A*&created_at=gte.${encodeURIComponent(month)}`,
      { headers: { apikey: target.key, Authorization: `Bearer ${target.key}` }, signal: AbortSignal.timeout(3_000) },
    );
    if (!response.ok) return null;
    const rows: Array<{ est_cost_usd: number | string }> = await response.json();
    const spent = rows.reduce((sum, row) => sum + (Number(row.est_cost_usd) || 0), 0);
    budgetCache = { at: Date.now(), spent };
    return spent;
  } catch {
    return null;
  }
}

/** True when this month's AI spend has reached AI_MONTHLY_BUDGET_USD. Unknown spend never pauses anything. */
async function paidProvidersPaused(): Promise<boolean> {
  const spent = await aiSpendThisMonth();
  return spent !== null && spent >= monthlyBudgetUsd();
}

/** Fire and forget: the ledger never delays or fails an answer. */
function recordSpend(request: TextGenerationRequest, result: JsonGenerationResult) {
  if (request.feature === false) return;
  const feature = request.feature || request.label;
  const target = restTarget();
  if (!target) return;
  const cost = estimateCostUsd(result.provider, result.inputTokens, result.outputTokens);
  if (budgetCache) budgetCache.spent += cost;
  fetch(`${target.url}/rest/v1/provider_spend_ledger`, {
    method: "POST",
    headers: { apikey: target.key, Authorization: `Bearer ${target.key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ feature, provider: `llm:${result.provider}`, units: 1, est_cost_usd: Number(cost.toFixed(5)) }),
  }).catch((error) => console.error(`spend ledger write failed for ${feature}:`, error instanceof Error ? error.message : error));
}

// ---------------------------------------------------------------------------
// The chain.

/** True when at least one text provider has a key. */
export const hasTextProvider = () =>
  ["GEMINI_API_KEY", "LOVABLE_API_KEY", "GROQ_API_KEY", "OPENAI_API_KEY"].some((name) => Boolean(Deno.env.get(name)?.trim()));

export async function generateJsonText(request: JsonGenerationRequest): Promise<JsonGenerationResult> {
  return generate(request, true);
}

/** The same chain without JSON mode, for answers in plain text or markdown. */
export async function generateText(request: TextGenerationRequest): Promise<JsonGenerationResult> {
  return generate(request, false);
}

async function generate(request: TextGenerationRequest, json: boolean): Promise<JsonGenerationResult> {
  const deadline = Date.now() + request.timeoutMs;
  const paused = await paidProvidersPaused();
  if (paused) console.error(`${request.label}: monthly AI budget reached; using the free providers only`);
  const images = request.images ?? [];
  const fallbacks = chatFallbacks(request.openaiModel, { skipPaid: paused })
    .filter((provider) => !images.length || VISION_PROVIDERS.has(provider.name));
  let lastError: unknown = null;

  if (!paused && !isOpen("gemini") && Deno.env.get("GEMINI_API_KEY")?.trim()) {
    const geminiDeadline = deadline - (fallbacks.length && request.timeoutMs > FALLBACK_RESERVE_MS * 2 ? FALLBACK_RESERVE_MS : 0);
    for (let attempt = 0; attempt <= RETRY_PAUSES_MS.length; attempt++) {
      try {
        const result = await callGemini({
          models: request.geminiModels ?? FAST_JSON_MODELS,
          systemInstruction: request.system,
          parts: [{ text: request.prompt }, ...images.map(inlineImage).filter((part): part is NonNullable<typeof part> => part !== null)],
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          json,
          timeoutMs: Math.max(1_000, geminiDeadline - Date.now()),
        });
        const answer: JsonGenerationResult = {
          text: result.text,
          provider: "gemini",
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };
        recordSpend(request, answer);
        return answer;
      } catch (error) {
        lastError = error;
        if (isDeadGeminiKey(error)) trip("gemini", request.label);
        const wait = RETRY_PAUSES_MS[attempt];
        const retry = wait !== undefined && isTransientGeminiError(error)
          && geminiDeadline - Date.now() - wait >= MIN_ATTEMPT_MS;
        console.error(`${request.label}: Gemini failed (attempt ${attempt + 1})${retry ? `, retrying in ${wait}ms` : fallbacks.length ? ", trying the fallbacks" : ""}:`,
          error instanceof Error ? error.message : error);
        if (!retry) break;
        await pause(wait);
      }
    }
  }

  // OpenAI-compatible fallbacks, in order, each given a share of the time left.
  for (let index = 0; index < fallbacks.length; index++) {
    const remaining = deadline - Date.now();
    if (remaining < 2_000) break;
    const provider = fallbacks[index];
    const budget = index === fallbacks.length - 1 ? remaining : Math.max(4_000, Math.floor(remaining / (fallbacks.length - index)));
    try {
      const answer = await callChatCompletions(provider, request, budget, json);
      recordSpend(request, answer);
      return answer;
    } catch (error) {
      lastError = error;
      if (isDeadKeyError(error)) trip(provider.name, request.label);
      console.error(`${request.label}: ${provider.name} failed${index < fallbacks.length - 1 ? `, trying ${fallbacks[index + 1].name}` : ""}:`,
        error instanceof Error ? error.message.slice(0, 200) : error);
    }
  }
  throw lastError ?? new Error(`${request.label}: no AI provider is available`);
}

export interface ChatProvider { name: Exclude<ProviderName, "gemini">; url: string; key: string; model: string }

/**
 * The OpenAI-compatible providers that have a key and are not being skipped, in
 * fallback order: the two free ones first, OpenAI last.
 */
export function chatFallbacks(openaiModel: string, options: { skipPaid?: boolean } = {}): ChatProvider[] {
  const key = (name: string) => Deno.env.get(name)?.trim() ?? "";
  const providers: ChatProvider[] = [];
  if (key("LOVABLE_API_KEY")) providers.push({ name: "lovable", url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: key("LOVABLE_API_KEY"), model: "google/gemini-2.5-flash" });
  if (key("GROQ_API_KEY")) providers.push({ name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: key("GROQ_API_KEY"), model: "llama-3.3-70b-versatile" });
  if (key("OPENAI_API_KEY") && !options.skipPaid) providers.push({ name: "openai", url: "https://api.openai.com/v1/chat/completions", key: key("OPENAI_API_KEY"), model: openaiModel });
  return providers.filter((provider) => !isOpen(provider.name));
}

async function callChatCompletions(provider: ChatProvider, request: TextGenerationRequest, timeoutMs: number, json: boolean): Promise<JsonGenerationResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(provider.url, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        messages: [
          { role: "system", content: request.system },
          {
            role: "user",
            content: request.images?.length
              ? [{ type: "text", text: request.prompt }, ...request.images.map((url) => ({ type: "image_url", image_url: { url, detail: "high" } }))]
              : request.prompt,
          },
        ],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ProviderError(`${provider.name} API Error: ${response.status} ${body.slice(0, 200)}`.trim(), response.status, body);
    }
    const data = await response.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error(`${provider.name} returned an empty response`);
    if (choice?.finish_reason === "length" && json) throw new Error(`${provider.name} response was truncated before completion`);
    return {
      text,
      provider: provider.name,
      model: `${provider.name}/${provider.model}`,
      inputTokens: data?.usage?.prompt_tokens,
      outputTokens: data?.usage?.completion_tokens,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Streaming (BizMap analysis): the first provider that answers 200 streams.

export interface StreamChatRequest {
  label: string;
  /** Chat-completions body without `model` and `stream`. */
  body: Record<string, unknown>;
  openaiModel: string;
  /** Time allowed for each provider to start answering. */
  connectTimeoutMs?: number;
}

/**
 * Returns the first OK streaming Response (OpenAI-compatible server-sent
 * events) from Lovable, Groq, then OpenAI. Gemini is reached through the
 * Lovable gateway here, since its native API streams a different format.
 */
export async function streamChatWithFallbacks(request: StreamChatRequest): Promise<{ response: Response; provider: ChatProvider["name"] }> {
  const paused = await paidProvidersPaused();
  let lastError: unknown = null;
  for (const provider of chatFallbacks(request.openaiModel, { skipPaid: paused })) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.connectTimeoutMs ?? 30_000);
    try {
      const response = await fetch(provider.url, {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...request.body, model: provider.model, stream: true }),
      });
      clearTimeout(timer);
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new ProviderError(`${provider.name} API Error: ${response.status} ${body.slice(0, 200)}`.trim(), response.status, body);
      }
      return { response, provider: provider.name };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (isDeadKeyError(error)) trip(provider.name, request.label);
      console.error(`${request.label}: ${provider.name} stream failed:`, error instanceof Error ? error.message.slice(0, 200) : error);
    }
  }
  throw lastError ?? new Error(`${request.label}: no AI provider is available`);
}
