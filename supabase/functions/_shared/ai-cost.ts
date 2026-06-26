/**
 * AI cost telemetry — the missing half of per-feature margin.
 *
 * Credit revenue is captured by `credit_action_completed` (see credit-deduction).
 * This module captures the *cost* side: it estimates the USD cost of an LLM call
 * from token usage and emits a PostHog `$ai_generation` event (PostHog's native
 * LLM-analytics event) tagged with `feature_key` and `operation_id`. When the
 * same `operation_id` is set on both events, credits charged can be joined to
 * real model cost for true per-feature margin.
 *
 * Adoption: call `emitAiGenerationCost(...)` right after any LLM response, passing
 * the same operation/idempotency id used for the credit deduction. Already wired
 * into ai-model-router and pitch-deck-analyzer; other AI edge functions can adopt
 * incrementally.
 */

import { emitBusinessEvent } from "./analytics.ts";

/** USD per 1,000,000 tokens, [input, output]. */
const MODEL_PRICES_PER_MTOK: Record<string, { input: number; output: number }> = {
  // Anthropic (mirrors the output-cost weights in credit-constants.ts)
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 15, output: 75 },
  // Google Gemini (cheap class)
  "google/gemini-3-flash": { input: 0.1, output: 0.4 },
  "google/gemini-2.5-flash": { input: 0.1, output: 0.4 },
  // OpenAI (approximate; extend as models are added)
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};

// Unknown models are costed at Sonnet-class so margin is never silently overstated.
const DEFAULT_PRICE = { input: 3, output: 15 };

export function getModelPrice(model?: string | null): { input: number; output: number } {
  if (!model) return DEFAULT_PRICE;
  return MODEL_PRICES_PER_MTOK[model] ?? DEFAULT_PRICE;
}

/** Estimated USD cost of a single generation from token usage. */
export function estimateAiCostUsd(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = getModelPrice(model);
  const safeIn = Number.isFinite(inputTokens) && inputTokens > 0 ? inputTokens : 0;
  const safeOut = Number.isFinite(outputTokens) && outputTokens > 0 ? outputTokens : 0;
  return (safeIn / 1_000_000) * price.input + (safeOut / 1_000_000) * price.output;
}

export interface AiGenerationCostInput {
  userId?: string | null;
  /** Credit feature / tool this generation belongs to (e.g. PITCH_DECK_ANALYZER). */
  feature: string;
  model: string;
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  /** Shared id with the credit_action_completed event for the same action. */
  operationId?: string | null;
  isError?: boolean;
  latencyMs?: number;
}

/**
 * Emit a PostHog `$ai_generation` event with estimated cost. Fire-and-forget;
 * never throws (telemetry must not break the request).
 */
export async function emitAiGenerationCost(input: AiGenerationCostInput): Promise<void> {
  try {
    const inputCost = estimateAiCostUsd(input.model, input.inputTokens, 0);
    const outputCost = estimateAiCostUsd(input.model, 0, input.outputTokens);
    const totalCost = inputCost + outputCost;

    await emitBusinessEvent({
      eventName: "$ai_generation",
      userId: input.userId || "anonymous",
      properties: {
        // Canonical PostHog LLM-analytics properties
        $ai_model: input.model,
        $ai_provider: input.provider,
        $ai_input_tokens: input.inputTokens,
        $ai_output_tokens: input.outputTokens,
        $ai_input_cost_usd: inputCost,
        $ai_output_cost_usd: outputCost,
        $ai_total_cost_usd: totalCost,
        $ai_latency: input.latencyMs,
        $ai_trace_id: input.operationId,
        $ai_is_error: input.isError ?? false,
        // Join keys for per-feature margin
        feature_key: input.feature,
        operation_id: input.operationId,
      },
    });
  } catch (error) {
    console.warn("[ai-cost] Failed to emit $ai_generation", error);
  }
}
