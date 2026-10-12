/**
 * Google Gemini (generateContent) with model fallback, on the GEMINI_API_KEY
 * that MVP Builder already uses. Replaces two paid providers that ran dry in
 * October 2026: Anthropic for Pitch Deck Analyzer (Gemini reads PDFs natively)
 * and Perplexity for live web research (Gemini grounded on Google Search).
 *
 * Models are tried in order. A model that is missing, rate limited, overloaded,
 * or returns nothing usable hands over to the next one.
 */

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GROUNDING_REDIRECT_HOST = "vertexaisearch.cloud.google.com";

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiModelSpec {
  model: string;
  /** Gemini 3 thinking level: "minimal" | "low" | "medium" | "high". */
  thinkingLevel?: string;
  /** Gemini 2.5 thinking budget in tokens; 0 turns thinking off on Flash. */
  thinkingBudget?: number;
}

/** Ungrounded calls (documents, synthesis). All three are on the free tier. */
export const GEMINI_TEXT_MODELS: GeminiModelSpec[] = [
  { model: "gemini-3.8-flash", thinkingLevel: "low" },
  { model: "gemini-3.6-flash", thinkingLevel: "low" },
  { model: "gemini-3.5-flash-lite" },
];

/**
 * Search-grounded calls. Grounding with Google Search is free on the API's free
 * tier only for Gemini 2.5 Flash (500 requests/day); the Gemini 3 models ground
 * on paid-tier keys (5,000 requests/month free). Thinking stays minimal so the
 * answer arrives inside callers' short timeouts.
 */
export const GEMINI_SEARCH_MODELS: GeminiModelSpec[] = [
  { model: "gemini-2.5-flash", thinkingBudget: 0 },
  { model: "gemini-3.6-flash", thinkingLevel: "minimal" },
  { model: "gemini-3.8-flash", thinkingLevel: "low" },
];

export interface GeminiRequest {
  models: GeminiModelSpec[];
  systemInstruction?: string;
  parts: GeminiPart[];
  temperature?: number;
  maxOutputTokens?: number;
  /** Ask for a JSON response. A response cut off at the token cap then counts as a failure. */
  json?: boolean;
  /** Ground the answer on Google Search and return its sources. */
  googleSearch?: boolean;
  /** Budget for the whole call, across every model tried. */
  timeoutMs?: number;
}

export interface GeminiSource {
  url: string;
  title: string;
  snippet?: string;
}

export interface GeminiResponse {
  text: string;
  model: string;
  finishReason: string | null;
  inputTokens: number;
  outputTokens: number;
  sources: GeminiSource[];
  searchQueries: string[];
}

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function buildBody(request: GeminiRequest, spec: GeminiModelSpec, withThinking: boolean) {
  const generationConfig: Record<string, unknown> = {
    temperature: request.temperature ?? 0.2,
  };
  if (request.maxOutputTokens) generationConfig.maxOutputTokens = request.maxOutputTokens;
  if (request.json) generationConfig.responseMimeType = "application/json";
  if (withThinking) {
    generationConfig.thinkingConfig = spec.thinkingLevel
      ? { thinkingLevel: spec.thinkingLevel }
      : { thinkingBudget: spec.thinkingBudget };
  }

  return {
    ...(request.systemInstruction
      ? { systemInstruction: { parts: [{ text: request.systemInstruction }] } }
      : {}),
    contents: [{ role: "user", parts: request.parts }],
    ...(request.googleSearch ? { tools: [{ googleSearch: {} }] } : {}),
    generationConfig,
  };
}

const hasThinkingSetting = (spec: GeminiModelSpec) =>
  Boolean(spec.thinkingLevel) || typeof spec.thinkingBudget === "number";

export async function callGemini(request: GeminiRequest): Promise<GeminiResponse> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY not configured", 500);

  const deadline = Date.now() + (request.timeoutMs ?? 90_000);
  let lastError: GeminiError | null = null;

  for (const spec of request.models) {
    // A model can reject a thinking setting it does not support. Retry it once
    // without the setting before moving to the next model.
    for (const withThinking of hasThinkingSetting(spec) ? [true, false] : [false]) {
      const remaining = deadline - Date.now();
      if (remaining <= 500) throw lastError ?? new GeminiError("Gemini timed out", 504);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), remaining);
      let response: Response;
      try {
        response = await fetch(`${GEMINI_API_BASE}/${spec.model}:generateContent`, {
          method: "POST",
          signal: controller.signal,
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify(buildBody(request, spec, withThinking)),
        });
      } catch (error) {
        clearTimeout(timer);
        const aborted = error instanceof DOMException && error.name === "AbortError";
        console.error(`Gemini ${spec.model} request failed:`, aborted ? "timeout" : error);
        lastError = new GeminiError(aborted ? "Gemini timed out" : "Gemini request failed", aborted ? 504 : 502);
        break;
      }

      if (!response.ok) {
        clearTimeout(timer);
        const errText = await response.text();
        console.error(`Gemini ${spec.model} error:`, response.status, errText.slice(0, 500));
        lastError = new GeminiError(`Gemini error: ${response.status}`, response.status === 429 ? 429 : 502);
        if (response.status === 400 && withThinking && /thinking/i.test(errText)) continue;
        break;
      }

      let data: any;
      try {
        data = await response.json();
      } catch (error) {
        console.error(`Gemini ${spec.model} response unreadable:`, error);
        lastError = new GeminiError("Gemini response unreadable", 502);
        break;
      } finally {
        clearTimeout(timer);
      }

      const candidate = data?.candidates?.[0];
      const parts: Array<{ text?: string; thought?: boolean }> = candidate?.content?.parts ?? [];
      const text = parts
        .filter((part) => !part.thought && typeof part.text === "string")
        .map((part) => part.text)
        .join("")
        .trim();
      const finishReason: string | null = candidate?.finishReason ?? null;

      if (!text || (request.json && finishReason === "MAX_TOKENS")) {
        console.error(
          `Gemini ${spec.model} returned no usable output. finishReason=`, finishReason,
          "blockReason=", data?.promptFeedback?.blockReason ?? null,
          "textLen=", text.length,
        );
        lastError = new GeminiError(
          finishReason === "MAX_TOKENS" ? "Gemini output was truncated" : "Gemini returned no output",
          502,
        );
        break;
      }

      const usage = data?.usageMetadata ?? {};
      return {
        text,
        model: spec.model,
        finishReason,
        inputTokens: Number(usage.promptTokenCount) || 0,
        outputTokens: (Number(usage.candidatesTokenCount) || 0) + (Number(usage.thoughtsTokenCount) || 0),
        sources: request.googleSearch ? await readGroundingSources(candidate?.groundingMetadata) : [],
        searchQueries: Array.isArray(candidate?.groundingMetadata?.webSearchQueries)
          ? candidate.groundingMetadata.webSearchQueries.filter((q: unknown) => typeof q === "string")
          : [],
      };
    }
  }

  throw lastError ?? new GeminiError("No Gemini model available", 502);
}

/**
 * Grounding sources arrive as Google redirect links titled with the site's
 * domain. Callers dedupe and label sources by hostname, so resolve each
 * redirect to the page it points at; fall back to the titled domain.
 */
async function readGroundingSources(metadata: any): Promise<GeminiSource[]> {
  const chunks: any[] = Array.isArray(metadata?.groundingChunks) ? metadata.groundingChunks : [];
  const supports: any[] = Array.isArray(metadata?.groundingSupports) ? metadata.groundingSupports : [];

  const snippetFor = (index: number) => {
    const support = supports.find((item) =>
      Array.isArray(item?.groundingChunkIndices) && item.groundingChunkIndices.includes(index)
    );
    const text = typeof support?.segment?.text === "string" ? support.segment.text.trim() : "";
    return text ? text.slice(0, 300) : undefined;
  };

  const resolved = await Promise.all(chunks.map(async (chunk, index) => {
    const uri = typeof chunk?.web?.uri === "string" ? chunk.web.uri : "";
    const title = typeof chunk?.web?.title === "string" ? chunk.web.title.trim() : "";
    if (!uri) return null;
    const url = await resolveGroundingUrl(uri, title);
    return url ? { url, title, snippet: snippetFor(index) } : null;
  }));

  const seen = new Set<string>();
  const sources: GeminiSource[] = [];
  for (const source of resolved) {
    if (!source || seen.has(source.url)) continue;
    seen.add(source.url);
    sources.push(source);
  }
  return sources;
}

const looksLikeDomain = (value: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(value);

async function resolveGroundingUrl(uri: string, title: string): Promise<string | null> {
  let host = "";
  try {
    host = new URL(uri).hostname;
  } catch {
    return null;
  }
  if (host !== GROUNDING_REDIRECT_HOST) return uri;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(uri, { method: "GET", redirect: "manual", signal: controller.signal });
    await response.body?.cancel();
    const location = response.headers.get("location");
    if (location && /^https?:\/\//i.test(location)) return location;
  } catch {
    // Fall through to the titled domain.
  } finally {
    clearTimeout(timer);
  }
  return looksLikeDomain(title) ? `https://${title.toLowerCase()}` : null;
}
