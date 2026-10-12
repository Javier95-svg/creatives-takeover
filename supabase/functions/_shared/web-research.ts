/**
 * Live web search for the tools that cite the web (ICP evidence, PMF scoring,
 * Customer Discovery, GTM research, Pulse), replacing Perplexity.
 *
 * Tavily runs first when TAVILY_API_KEY is set: its free plan covers 1,000
 * basic searches a month without a card. Without it, or if it fails, Gemini
 * answers grounded on Google Search, which Google only allows on paid-tier keys.
 */

import { callGemini, GEMINI_SEARCH_MODELS, type GeminiSource } from "./gemini.ts";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
// Tavily works best with short queries; long ones are cut rather than rejected.
const TAVILY_MAX_QUERY_LENGTH = 400;
const SNIPPET_LENGTH = 500;

export type SearchRecency = "day" | "week" | "month" | "year";

export interface WebSearchInput {
  query: string;
  maxResults: number;
  recency: SearchRecency;
  /** Budget for the whole search, across providers. */
  timeoutMs: number;
  /** Also return a short written answer, not just sources. */
  withAnswer?: boolean;
  /** Guidance for the Gemini fallback's answer. */
  systemInstruction?: string;
}

export interface WebSearchResult {
  answer: string;
  sources: GeminiSource[];
  provider: "tavily" | "gemini";
  model: string;
}

export async function searchWeb(input: WebSearchInput): Promise<WebSearchResult> {
  const deadline = Date.now() + input.timeoutMs;

  if (Deno.env.get("TAVILY_API_KEY")) {
    try {
      return await searchTavily(input, deadline);
    } catch (error) {
      console.error("Tavily search failed, trying Gemini:", error instanceof Error ? error.message : error);
    }
  }

  const result = await callGemini({
    models: GEMINI_SEARCH_MODELS,
    systemInstruction: input.systemInstruction ??
      "Search the web and answer from what you find, accurately and concisely.",
    parts: [{ text: `${input.query}\n\nPrefer sources from the past ${input.recency}.` }],
    temperature: 0.2,
    maxOutputTokens: 1500,
    googleSearch: true,
    timeoutMs: Math.max(1000, deadline - Date.now()),
  });
  return {
    answer: result.text,
    sources: result.sources.slice(0, input.maxResults),
    provider: "gemini",
    model: result.model,
  };
}

async function searchTavily(input: WebSearchInput, deadline: number): Promise<WebSearchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, deadline - Date.now()));
  try {
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${Deno.env.get("TAVILY_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: input.query.slice(0, TAVILY_MAX_QUERY_LENGTH),
        search_depth: "basic",
        max_results: Math.min(20, Math.max(1, input.maxResults)),
        include_answer: input.withAnswer ? "basic" : false,
        time_range: input.recency,
      }),
    });
    if (!response.ok) {
      throw new Error(`Tavily error: ${response.status} ${(await response.text()).slice(0, 300)}`);
    }

    const data = await response.json();
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    const sources: GeminiSource[] = results
      .filter((item) => typeof item?.url === "string" && /^https?:\/\//i.test(item.url))
      .map((item) => ({
        url: item.url,
        title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : hostOf(item.url),
        snippet: typeof item.content === "string" && item.content.trim()
          ? item.content.trim().slice(0, SNIPPET_LENGTH)
          : undefined,
      }));

    return {
      answer: typeof data?.answer === "string" ? data.answer : "",
      sources: sources.slice(0, input.maxResults),
      provider: "tavily",
      model: "tavily-basic",
    };
  } finally {
    clearTimeout(timer);
  }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
