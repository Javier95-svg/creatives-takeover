/**
 * JSON generation for the founder tools, Gemini first and OpenAI as fallback.
 *
 * 2026-11-11: the OpenAI key ran out of credits and took ICP Builder down with
 * it. Gemini's text models (ungrounded) were the only provider still answering,
 * and they are the cheapest option we have, so they go first. OpenAI stays as
 * the fallback: once it has credits again, a Gemini outage no longer stops a
 * founder's draft. Prompts are unchanged; both providers return the same JSON.
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
 * The free tier answers 503 "high demand" (and 429 per-minute limits) in short
 * bursts: on 2026-11-11 every model returned 503 within five seconds and the
 * ICP draft failed. Such errors are retried after a pause while time remains.
 */
const RETRY_PAUSES_MS = [2_000, 5_000];
const MIN_ATTEMPT_MS = 8_000;
// callGemini reports an upstream 503 as status 502 with "Gemini error: 503" as
// the message, so the message is what identifies it.
const isTransientGeminiError = (error: unknown) =>
  error instanceof GeminiError
  && (error.status === 503 || error.status === 429 || /Gemini error: (503|429)\b|high demand/i.test(error.message));
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface JsonGenerationRequest {
  /** Shown in logs, e.g. "icp-draft". */
  label: string;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  /** Budget for the whole call, across both providers. */
  timeoutMs: number;
  /** OpenAI model used only when Gemini fails. */
  openaiModel: string;
  geminiModels?: GeminiModelSpec[];
}

export interface JsonGenerationResult {
  text: string;
  provider: "gemini" | "openai" | "lovable" | "groq";
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

/** Leave the fallbacks enough time to answer when Gemini uses its share and fails. */
const OPENAI_RESERVE_MS = 15_000;

export async function generateJsonText(request: JsonGenerationRequest): Promise<JsonGenerationResult> {
  const deadline = Date.now() + request.timeoutMs;
  const hasFallback = ["OPENAI_API_KEY", "LOVABLE_API_KEY", "GROQ_API_KEY"].some((name) => Boolean(Deno.env.get(name)?.trim()));
  let geminiError: unknown = null;

  if (Deno.env.get("GEMINI_API_KEY")?.trim()) {
    const geminiDeadline = deadline - (hasFallback && request.timeoutMs > OPENAI_RESERVE_MS * 2 ? OPENAI_RESERVE_MS : 0);
    for (let attempt = 0; attempt <= RETRY_PAUSES_MS.length; attempt++) {
      try {
        const result = await callGemini({
          models: request.geminiModels ?? FAST_JSON_MODELS,
          systemInstruction: request.system,
          parts: [{ text: request.prompt }],
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          json: true,
          timeoutMs: Math.max(1_000, geminiDeadline - Date.now()),
        });
        return {
          text: result.text,
          provider: "gemini",
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };
      } catch (error) {
        geminiError = error;
        const wait = RETRY_PAUSES_MS[attempt];
        const retry = wait !== undefined && isTransientGeminiError(error)
          && geminiDeadline - Date.now() - wait >= MIN_ATTEMPT_MS;
        console.error(`${request.label}: Gemini failed (attempt ${attempt + 1})${retry ? `, retrying in ${wait}ms` : hasFallback ? ", trying the fallbacks" : ""}:`,
          error instanceof Error ? error.message : error);
        if (!retry) break;
        await pause(wait);
      }
    }
  }

  // OpenAI-compatible fallbacks, in order, each given a share of the time left.
  // 2026-11-16: OpenAI had no credits while Gemini answered 503 "high demand",
  // so every customer-research analysis failed three times over several
  // minutes. The Lovable gateway (Gemini through Lovable's own capacity) and
  // Groq answered both checks that day.
  const fallbacks = chatFallbacks(request.openaiModel);
  let lastError: unknown = geminiError;
  for (let index = 0; index < fallbacks.length; index++) {
    const remaining = deadline - Date.now();
    if (remaining < 2_000) break;
    const provider = fallbacks[index];
    const budget = index === fallbacks.length - 1 ? remaining : Math.max(4_000, Math.floor(remaining / (fallbacks.length - index)));
    try {
      return await callChatCompletions(provider, request, budget);
    } catch (error) {
      lastError = error;
      console.error(`${request.label}: ${provider.name} failed${index < fallbacks.length - 1 ? `, trying ${fallbacks[index + 1].name}` : ""}:`,
        error instanceof Error ? error.message.slice(0, 200) : error);
    }
  }
  throw lastError ?? new Error(`${request.label}: no AI provider is configured`);
}

interface ChatProvider { name: "openai" | "lovable" | "groq"; url: string; key: string; model: string }

/** The OpenAI-compatible providers that have a key, in fallback order. */
function chatFallbacks(openaiModel: string): ChatProvider[] {
  const key = (name: string) => Deno.env.get(name)?.trim() ?? "";
  const providers: ChatProvider[] = [];
  if (key("OPENAI_API_KEY")) providers.push({ name: "openai", url: "https://api.openai.com/v1/chat/completions", key: key("OPENAI_API_KEY"), model: openaiModel });
  if (key("LOVABLE_API_KEY")) providers.push({ name: "lovable", url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: key("LOVABLE_API_KEY"), model: "google/gemini-2.5-flash" });
  if (key("GROQ_API_KEY")) providers.push({ name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: key("GROQ_API_KEY"), model: "llama-3.3-70b-versatile" });
  return providers;
}

async function callChatCompletions(provider: ChatProvider, request: JsonGenerationRequest, timeoutMs: number): Promise<JsonGenerationResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(provider.url, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        response_format: { type: "json_object" },
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.prompt },
        ],
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`${provider.name} API Error: ${response.status} ${body.slice(0, 200)}`.trim());
    }
    const data = await response.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error(`${provider.name} returned an empty response`);
    if (choice?.finish_reason === "length") throw new Error(`${provider.name} response was truncated before completion`);
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
