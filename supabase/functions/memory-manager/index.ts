import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const MEMORY_TOP_K = 8;
const SUMMARIZATION_DAYS = 7;

interface StoreMemoryRequest {
  projectId: string;
  conversationId?: string;
  content: string;
  kind: 'short_term' | 'long_term';
  metadata?: Record<string, any>;
}

interface RetrieveContextRequest {
  projectId: string;
  query: string;
  topK?: number;
  memoryKind?: 'short_term' | 'long_term';
}

interface SummarizeRequest {
  projectId?: string;
  conversationId?: string;
  daysOld?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'store';

    const body = await req.json();

    switch (action) {
      case 'store':
        return await handleStoreMemory(supabase, body as StoreMemoryRequest);
      
      case 'retrieve':
        return await handleRetrieveContext(supabase, body as RetrieveContextRequest);
      
      case 'summarize':
        return await handleSummarize(supabase, body as SummarizeRequest);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[MEMORY-MANAGER] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleStoreMemory(supabase: any, request: StoreMemoryRequest) {
  console.log(`[MEMORY-MANAGER] Storing ${request.kind} memory for project ${request.projectId}`);

  // Generate embedding for the content
  const embedResponse = await fetch(`${SUPABASE_URL}/functions/v1/embed-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ texts: request.content }),
  });

  if (!embedResponse.ok) {
    throw new Error('Failed to generate embedding');
  }

  const { embeddings } = await embedResponse.json();
  const embedding = embeddings[0];

  // Store in database
  const { data, error } = await supabase
    .from('project_memory')
    .insert({
      project_id: request.projectId,
      conversation_id: request.conversationId,
      kind: request.kind,
      content: request.content,
      embedding,
      metadata: request.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error('[MEMORY-MANAGER] Storage error:', error);
    throw error;
  }

  console.log(`[MEMORY-MANAGER] Successfully stored memory ${data.id}`);

  return new Response(JSON.stringify({ 
    success: true, 
    memoryId: data.id 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleRetrieveContext(supabase: any, request: RetrieveContextRequest) {
  console.log(`[MEMORY-MANAGER] Retrieving context for project ${request.projectId}`);

  // Generate embedding for the query
  const embedResponse = await fetch(`${SUPABASE_URL}/functions/v1/embed-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ texts: request.query }),
  });

  if (!embedResponse.ok) {
    throw new Error('Failed to generate query embedding');
  }

  const { embeddings } = await embedResponse.json();
  const queryEmbedding = embeddings[0];

  // Search for similar memories
  const { data, error } = await supabase.rpc('search_similar_memories', {
    query_embedding: queryEmbedding,
    target_project_id: request.projectId,
    top_k: request.topK || MEMORY_TOP_K,
    memory_kind: request.memoryKind || null,
  });

  if (error) {
    console.error('[MEMORY-MANAGER] Retrieval error:', error);
    throw error;
  }

  console.log(`[MEMORY-MANAGER] Retrieved ${data.length} relevant memories`);

  // Format memories for AI context
  const contextText = data
    .map((mem: any, idx: number) => 
      `[Memory ${idx + 1} - ${mem.kind}, similarity: ${(mem.similarity * 100).toFixed(1)}%]\n${mem.content}`
    )
    .join('\n\n');

  return new Response(JSON.stringify({ 
    memories: data,
    contextText,
    count: data.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleSummarize(supabase: any, request: SummarizeRequest) {
  console.log('[MEMORY-MANAGER] Starting conversation summarization');

  const daysOld = request.daysOld || SUMMARIZATION_DAYS;

  // Get conversations ready for summarization
  const { data: conversations, error: convError } = await supabase.rpc(
    'get_conversations_for_summarization',
    { days_old: daysOld }
  );

  if (convError) {
    console.error('[MEMORY-MANAGER] Error fetching conversations:', convError);
    throw convError;
  }

  console.log(`[MEMORY-MANAGER] Found ${conversations.length} conversations to summarize`);

  const summaries = [];

  for (const conv of conversations) {
    // Filter by specific IDs if provided
    if (request.projectId && conv.project_id !== request.projectId) continue;
    if (request.conversationId && conv.conversation_id !== request.conversationId) continue;

    // Fetch all short-term memories for this conversation
    const { data: memories, error: memError } = await supabase
      .from('project_memory')
      .select('content, created_at, metadata')
      .eq('conversation_id', conv.conversation_id)
      .eq('kind', 'short_term')
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (memError || !memories || memories.length === 0) continue;

    // Create summary using OpenAI
    const conversationText = memories
      .map((m: any) => `[${new Date(m.created_at).toISOString()}] ${m.content}`)
      .join('\n\n');

    const summaryPrompt = `Summarize the following business planning conversation into key insights, decisions, and action items. Focus on what matters for future context retrieval:\n\n${conversationText}`;

    const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a business planning assistant. Summarize conversations into concise, actionable insights.' },
          { role: 'user', content: summaryPrompt }
        ],
        max_tokens: 500,
      }),
    });

    if (!summaryResponse.ok) continue;

    const summaryData = await summaryResponse.json();
    const summary = summaryData.choices[0].message.content;

    // Store as long-term memory
    const storeResponse = await handleStoreMemory(supabase, {
      projectId: conv.project_id,
      conversationId: conv.conversation_id,
      content: summary,
      kind: 'long_term',
      metadata: {
        summarized_from: conv.message_count,
        period: {
          start: conv.oldest_message,
          end: conv.newest_message,
        },
      },
    });

    if (storeResponse.ok) {
      // Archive original short-term memories
      await supabase
        .from('project_memory')
        .update({ is_archived: true })
        .eq('conversation_id', conv.conversation_id)
        .eq('kind', 'short_term');

      summaries.push({
        conversationId: conv.conversation_id,
        projectId: conv.project_id,
        messageCount: conv.message_count,
        summary,
      });
    }
  }

  console.log(`[MEMORY-MANAGER] Summarized ${summaries.length} conversations`);

  return new Response(JSON.stringify({ 
    success: true,
    summaries,
    count: summaries.length,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
