import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-rag-key",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EMBEDDING_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/embed-text`;
const RAG_INGEST_KEY = Deno.env.get("RAG_INGEST_KEY") ?? "";

interface DocumentPayload {
  source: string;
  sourceId?: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

interface IngestRequest {
  documents: DocumentPayload[];
  chunkSize?: number;
  chunkOverlap?: number;
}

interface Chunk {
  source: string;
  sourceId: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (RAG_INGEST_KEY && req.headers.get("x-rag-key") !== RAG_INGEST_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as IngestRequest;
    validateRequest(body);

    const chunkSize = body.chunkSize ?? 1200;
    const chunkOverlap = body.chunkOverlap ?? 200;

    const preparedChunks = prepareChunks(body.documents, chunkSize, chunkOverlap);

    if (preparedChunks.length === 0) {
      return new Response(JSON.stringify({ ingested: 0, message: "No content to ingest" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch embeddings to avoid payload limits
    const batchSize = 16;
    let processed = 0;

    for (let i = 0; i < preparedChunks.length; i += batchSize) {
      const batch = preparedChunks.slice(i, i + batchSize);
      const embeddings = await generateEmbeddings(batch.map((c) => c.body));

      const rows = batch.map((chunk, idx) => ({
        source: chunk.source,
        source_id: chunk.sourceId,
        title: chunk.title,
        body: chunk.body,
        metadata: chunk.metadata,
        embedding: embeddings[idx],
      }));

      const { error } = await supabase.from("knowledge_chunks").upsert(rows, {
        onConflict: "source,source_id",
      });

      if (error) {
        console.error("[RAG-INGEST] Upsert error:", error);
        throw new Error(error.message);
      }

      processed += batch.length;
    }

    console.log(`[RAG-INGEST] Successfully ingested ${processed} chunks from ${body.documents.length} documents`);

    return new Response(JSON.stringify({ ingested: processed, documents: body.documents.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[RAG-INGEST] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function validateRequest(payload: IngestRequest) {
  if (!payload || !Array.isArray(payload.documents) || payload.documents.length === 0) {
    throw new Error("Request must include a non-empty documents array");
  }

  for (const doc of payload.documents) {
    if (!doc.source || !doc.title || !doc.content) {
      throw new Error("Each document requires source, title, and content");
    }
  }
}

function prepareChunks(documents: DocumentPayload[], chunkSize: number, overlap: number): Chunk[] {
  const chunks: Chunk[] = [];

  for (const doc of documents) {
    const baseMetadata = doc.metadata ?? {};
    const chunkBodies = chunkText(doc.content, chunkSize, overlap);

    chunkBodies.forEach((body, idx) => {
      const chunkId = `${doc.sourceId ?? slugify(doc.title)}::${idx + 1}`;
      chunks.push({
        source: doc.source,
        sourceId: chunkId,
        title: doc.title,
        body,
        metadata: {
          ...baseMetadata,
          chunk_index: idx + 1,
          chunk_count: chunkBodies.length,
        },
      });
    });
  }

  return chunks;
}

function chunkText(text: string, maxChars: number, overlap: number): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + maxChars, cleaned.length);
    let chunk = cleaned.slice(start, end).trim();

    // Ensure we don't cut mid-sentence if possible
    if (end < cleaned.length) {
      const lastPeriod = chunk.lastIndexOf(". ");
      if (lastPeriod > maxChars * 0.6) {
        chunk = chunk.slice(0, lastPeriod + 1).trim();
      }
    }

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (end === cleaned.length) break;
    start += Math.max(maxChars - overlap, 1);
  }

  return chunks;
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch(EMBEDDING_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Embedding generation failed: ${msg}`);
  }

  const data = await response.json();
  if (!data.embeddings || data.embeddings.length !== texts.length) {
    throw new Error("Unexpected embedding response shape");
  }

  return data.embeddings;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

