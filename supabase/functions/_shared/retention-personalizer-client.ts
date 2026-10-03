import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { emitAiGenerationCost } from "./ai-cost.ts";
import {
  buildPersonalizerPrompt,
  PERSONALIZER_SCHEMA,
  PERSONALIZER_SYSTEM_PROMPT,
  type PersonalizerInput,
  validatePersonalizedCopy,
} from "./retention-personalizer.ts";

// Deno-only: the one place retention emails call a model. Returns null on any
// problem (no key, timeout, refusal, bad JSON, failed validation) so the
// caller always has the hand-written template to fall back on.

const MODEL = "claude-opus-5-5";

export interface PersonalizedCopy {
  subject: string;
  paragraph: string;
}

export interface PersonalizerOutcome {
  copy: PersonalizedCopy | null;
  /** Why the template was used instead, for logs. */
  rejection?: string;
}

export async function generatePersonalizedCopy(userId: string, input: PersonalizerInput): Promise<PersonalizerOutcome> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return { copy: null, rejection: "missing_api_key" };

  // Cron callers wait on this request, so the model gets a short budget and
  // no retries. A slow answer just means this email uses the template.
  const client = new Anthropic({ apiKey, timeout: 8_000, maxRetries: 0 });
  const started = Date.now();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Server-side fallback re-runs a declined request on another model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: PERSONALIZER_SCHEMA } },
      system: PERSONALIZER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPersonalizerPrompt(input) }],
    } as never) as Anthropic.Beta.BetaMessage;

    void emitAiGenerationCost({
      userId,
      feature: "RETENTION_EMAIL_COPY",
      model: response.model ?? MODEL,
      provider: "anthropic",
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - started,
    });

    if (response.stop_reason === "refusal") return { copy: null, rejection: "refusal" };
    if (response.stop_reason === "max_tokens") return { copy: null, rejection: "max_tokens" };

    const text = response.content
      .map((block) => block.type === "text" ? block.text : "")
      .join("")
      .trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { copy: null, rejection: "invalid_json" };
    }

    const result = validatePersonalizedCopy(parsed, input);
    if (!result.ok) return { copy: null, rejection: result.problems.join(",") };
    return { copy: { subject: result.subject!, paragraph: result.paragraph! } };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { copy: null, rejection: `api_error_${error.status ?? "unknown"}` };
    }
    return { copy: null, rejection: error instanceof Error ? error.name : "request_failed" };
  }
}
