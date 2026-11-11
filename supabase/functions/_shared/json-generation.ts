/**
 * JSON generation for the founder tools, Gemini first and OpenAI as fallback.
 *
 * 2026-11-11: the OpenAI key ran out of credits and took ICP Builder down with
 * it. Gemini's text models (ungrounded) were the only provider still answering,
 * and they are the cheapest option we have, so they go first. OpenAI stays as
 * the fallback: once it has credits again, a Gemini outage no longer stops a
 * founder's draft. Prompts are unchanged; both providers return the same JSON.
 */

import { callGemini, type GeminiModelSpec } from "./gemini.ts";

/**
 * Fast models first. callGemini shares one deadline across its models, and
 * gemini-3.8-flash timed out and returned 503 "high demand" on 2026-11-11,
 * spending the whole budget before any fallback ran.
 */
export const FAST_JSON_MODELS: GeminiModelSpec[] = [
  { model: "gemini-3.5-flash-lite" },
  { model: "gemini-3.6-flash", thinkingLevel: "low" },
];

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
  provider: "gemini" | "openai";
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

/** Leave OpenAI enough time to answer when Gemini uses its share and fails. */
const OPENAI_RESERVE_MS = 12_000;

export async function generateJsonText(request: JsonGenerationRequest): Promise<JsonGenerationResult> {
  const deadline = Date.now() + request.timeoutMs;
  const hasOpenAI = Boolean(Deno.env.get("OPENAI_API_KEY")?.trim());
  let geminiError: unknown = null;

  if (Deno.env.get("GEMINI_API_KEY")?.trim()) {
    const geminiBudget = hasOpenAI && request.timeoutMs > OPENAI_RESERVE_MS * 2
      ? request.timeoutMs - OPENAI_RESERVE_MS
      : request.timeoutMs;
    try {
      const result = await callGemini({
        models: request.geminiModels ?? FAST_JSON_MODELS,
        systemInstruction: request.system,
        parts: [{ text: request.prompt }],
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        json: true,
        timeoutMs: geminiBudget,
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
      console.error(`${request.label}: Gemini failed${hasOpenAI ? ", trying OpenAI" : ""}:`,
        error instanceof Error ? error.message : error);
    }
  }

  const remaining = deadline - Date.now();
  if (!hasOpenAI || remaining < 2_000) {
    throw geminiError ?? new Error(`${request.label}: no AI provider is configured`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.openaiModel,
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
      throw new Error(`OpenAI API Error: ${response.status} ${body.slice(0, 200)}`.trim());
    }
    const data = await response.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("OpenAI returned an empty response");
    if (choice?.finish_reason === "length") throw new Error("OpenAI response was truncated before completion");
    return {
      text,
      provider: "openai",
      model: request.openaiModel,
      inputTokens: data?.usage?.prompt_tokens,
      outputTokens: data?.usage?.completion_tokens,
    };
  } finally {
    clearTimeout(timer);
  }
}
