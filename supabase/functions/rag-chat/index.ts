import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const EMBEDDING_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/embed-text`;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase environment variables are not configured");
}

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required for rag-chat function");
}

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface KnowledgeFilter {
  source?: string;
  tier?: string;
  tag?: string;
}

interface RagChatRequest {
  messages: ChatMessage[];
  userId?: string;
  matchCount?: number;
  filter?: KnowledgeFilter;
  model?: string;
  temperature?: number;
  strategy?: "quality" | "speed" | "economy" | "balanced";
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json() as RagChatRequest;
    validateRequest(payload);

    const lastUserMessage = [...payload.messages].reverse().find((msg) => msg.role === "user");
    if (!lastUserMessage) {
      throw new Error("No user message found in request");
    }

    const queryEmbedding = await generateEmbedding(lastUserMessage.content);
    const matchCount = Math.max(1, Math.min(payload.matchCount ?? 5, 20));

    const { data: retrievedChunks, error: matchError } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      filter: payload.filter ?? {},
    });

    if (matchError) {
      console.error("[RAG-CHAT] match_knowledge_chunks error:", matchError);
      throw new Error("Failed to retrieve knowledge chunks");
    }

    const context = buildContext(retrievedChunks ?? []);
    const llmResponse = await generateCompletion({
      systemPrompt: buildSystemPrompt(context),
      messages: payload.messages,
      model: payload.model,
      temperature: payload.temperature,
    });

    const responseBody = {
      answer: llmResponse.answer,
      sources: context.sources,
      usage: llmResponse.usage,
      matchCount: context.sources.length,
    };

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[RAG-CHAT] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function validateRequest(payload: RagChatRequest) {
  if (!payload || !Array.isArray(payload.messages) || payload.messages.length === 0) {
    throw new Error("Request must include a non-empty messages array");
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(EMBEDDING_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ texts: [text] }),
  });

  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Embedding generation failed: ${msg}`);
  }

  const data = await response.json();
  if (!data.embeddings || data.embeddings.length === 0) {
    throw new Error("Embedding response malformed");
  }

  return data.embeddings[0];
}

interface ContextSource {
  id: string;
  title: string;
  source: string;
  similarity: number;
  metadata: Record<string, unknown>;
  excerpt: string;
}

interface ContextBundle {
  formatted: string;
  sources: ContextSource[];
}

function buildContext(chunks: any[]): ContextBundle {
  if (!chunks || chunks.length === 0) {
    return { formatted: "No supporting knowledge was retrieved for this query.", sources: [] };
  }

  const formattedSources: ContextSource[] = chunks.map((chunk: any, idx: number) => ({
    id: chunk.source_id ?? `${chunk.id}`,
    title: chunk.title ?? `Context ${idx + 1}`,
    source: chunk.source ?? "knowledge",
    similarity: chunk.similarity ?? 0,
    metadata: chunk.metadata ?? {},
    excerpt: chunk.content,
  }));

  const contextText = formattedSources
    .map((entry, idx) =>
      `[Source ${idx + 1}] (${entry.source}) ${entry.title}\nSimilarity: ${(entry.similarity * 100).toFixed(1)}%\n${entry.excerpt}`
    )
    .join("\n\n");

  return {
    formatted: contextText,
    sources: formattedSources,
  };
}

function buildSystemPrompt(context: ContextBundle): string {
  return [
    "You are BizMap AI, a retrieval-augmented business planning assistant.",
    "Use ONLY the retrieved context to answer the user's question.",
    "If the context does not contain the answer, respond with \"I don't have enough data to answer that yet.\"",
    "When you reference information, cite the source like [Source 1].",
    "Be concise, professional, and friendly.",
    "",
    "Retrieved Context:",
    context.formatted,
  ].join("\n");
}

interface CompletionResult {
  answer: string;
  usage?: Record<string, unknown>;
}

async function generateCompletion(args: {
  systemPrompt: string;
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}): Promise<CompletionResult> {
  const { systemPrompt, messages, model, temperature } = args;
  const requestMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model ?? "gpt-4o-mini",
      messages: requestMessages,
      temperature: temperature ?? 0.2,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Completion failed: ${msg}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("No answer generated by language model");
  }

  return {
    answer,
    usage: data.usage,
  };
}

