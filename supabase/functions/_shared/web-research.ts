/**
 * Live web search for the tools that cite the web (ICP evidence, PMF scoring,
 * Customer Discovery, GTM research, Pulse), replacing Perplexity.
 *
 * Tavily runs first when TAVILY_API_KEY is set: its free plan covers 1,000
 * basic searches a month without a card. Without it, or if it fails, Gemini
 * answers grounded on Google Search, which Google only allows on paid-tier keys.
 * If Gemini fails too, OpenAI's web search tool answers with cited URLs.
 *
 * 2026-11-11: the Gemini key returned 429 RESOURCE_EXHAUSTED on every grounded
 * model (and 404 for gemini-2.5-flash), so every search failed and every ICP
 * draft since September recorded evidenceRetrieval "unavailable". The OpenAI
 * leg keeps search working on the key the ICP and GTM tools already use.
 */

import { callGemini, GEMINI_SEARCH_MODELS, type GeminiSource } from "./gemini.ts";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
// Tavily works best with short queries; long ones are cut rather than rejected.
const TAVILY_MAX_QUERY_LENGTH = 400;
const SNIPPET_LENGTH = 500;

/** "any" sets no date limit: product homepages are often older than a year. */
export type SearchRecency = "day" | "week" | "month" | "year" | "any";

const recencyHint = (recency: SearchRecency) =>
  recency === "any" ? "" : `\n\nPrefer sources from the past ${recency}.`;

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
  provider: "tavily" | "gemini" | "openai";
  model: string;
}

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

export async function searchWeb(input: WebSearchInput): Promise<WebSearchResult> {
  const deadline = Date.now() + input.timeoutMs;

  if (Deno.env.get("TAVILY_API_KEY")) {
    try {
      return await searchTavily(input, deadline);
    } catch (error) {
      console.error("Tavily search failed, trying Gemini:", error instanceof Error ? error.message : error);
    }
  }

  let geminiError: unknown = null;
  if (Deno.env.get("GEMINI_API_KEY")) {
    try {
      const result = await callGemini({
        models: GEMINI_SEARCH_MODELS,
        systemInstruction: input.systemInstruction ??
          "Search the web and answer from what you find, accurately and concisely.",
        parts: [{ text: `${input.query}${recencyHint(input.recency)}` }],
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
    } catch (error) {
      geminiError = error;
      console.error("Gemini search failed, trying OpenAI:", error instanceof Error ? error.message : error);
    }
  }

  if (Deno.env.get("OPENAI_API_KEY") && deadline - Date.now() > 1500) {
    return await searchOpenAI(input, deadline);
  }
  throw geminiError ?? new Error("No web search provider is configured");
}

/**
 * OpenAI Responses API with the web search tool. Sources are the URL citations
 * in the answer, each with the sentence it supports as the snippet.
 */
async function searchOpenAI(input: WebSearchInput, deadline: number): Promise<WebSearchResult> {
  const model = Deno.env.get("OPENAI_SEARCH_MODEL")?.trim() || "gpt-4o-mini";
  let lastError: Error | null = null;

  // "web_search" is the current tool name; older accounts only accept the preview name.
  for (const toolType of ["web_search", "web_search_preview"]) {
    const remaining = deadline - Date.now();
    if (remaining <= 1000) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          tools: [{ type: toolType }],
          instructions: (input.systemInstruction ??
            "Search the web and answer from what you find, accurately and concisely.") +
            " Cite the pages you used.",
          input: `${input.query}${recencyHint(input.recency)}`,
          max_output_tokens: 1500,
        }),
      });
      if (!response.ok) {
        const errText = (await response.text()).slice(0, 300);
        lastError = new Error(`OpenAI search error: ${response.status} ${errText}`);
        if (response.status === 400 && toolType === "web_search") continue;
        throw lastError;
      }

      const data = await response.json();
      const { text, sources } = readOpenAICitations(data);
      return {
        answer: text,
        sources: sources.slice(0, input.maxResults),
        provider: "openai",
        model,
      };
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error("OpenAI search timed out");
}

/** Pulls the answer text and its de-duplicated URL citations from a Responses payload. */
export function readOpenAICitations(data: any): { text: string; sources: GeminiSource[] } {
  const parts: any[] = (Array.isArray(data?.output) ? data.output : [])
    .filter((item: any) => item?.type === "message")
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((part: any) => part?.type === "output_text" && typeof part?.text === "string");

  const text = parts.map((part) => part.text).join("\n").trim();
  const seen = new Set<string>();
  const sources: GeminiSource[] = [];
  for (const part of parts) {
    for (const note of Array.isArray(part.annotations) ? part.annotations : []) {
      const url = typeof note?.url === "string" ? note.url : "";
      if (note?.type !== "url_citation" || !/^https?:\/\//i.test(url)) continue;
      const clean = url.replace(/[?&]utm_source=openai$/, "");
      if (seen.has(clean)) continue;
      seen.add(clean);
      const start = Number.isInteger(note.start_index) ? note.start_index : -1;
      const end = Number.isInteger(note.end_index) ? note.end_index : -1;
      const sentence = start >= 0 && end > start
        ? part.text.slice(Math.max(0, start - SNIPPET_LENGTH / 2), end).replace(/\s+/g, " ").trim()
        : "";
      sources.push({
        url: clean,
        title: typeof note.title === "string" && note.title.trim() ? note.title.trim() : hostOf(clean),
        snippet: sentence ? sentence.slice(-SNIPPET_LENGTH) : undefined,
      });
    }
  }
  return { text, sources };
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
        ...(input.recency === "any" ? {} : { time_range: input.recency }),
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
