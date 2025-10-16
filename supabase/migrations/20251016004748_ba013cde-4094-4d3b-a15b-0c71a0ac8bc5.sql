-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create project_memory table for storing conversation embeddings
CREATE TABLE IF NOT EXISTS public.project_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('short_term', 'long_term')),
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_project_memory_project_id ON public.project_memory(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memory_conversation_id ON public.project_memory(conversation_id);
CREATE INDEX IF NOT EXISTS idx_project_memory_kind ON public.project_memory(kind);
CREATE INDEX IF NOT EXISTS idx_project_memory_created_at ON public.project_memory(created_at);
CREATE INDEX IF NOT EXISTS idx_project_memory_archived ON public.project_memory(is_archived) WHERE is_archived = false;

-- Create vector similarity index using HNSW for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_project_memory_embedding ON public.project_memory 
USING hnsw (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE public.project_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access memory for their own projects
CREATE POLICY "Users can view their own project memory"
  ON public.project_memory FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert memory for their own projects"
  ON public.project_memory FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own project memory"
  ON public.project_memory FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Function to search similar memories using cosine similarity
CREATE OR REPLACE FUNCTION public.search_similar_memories(
  query_embedding vector(1536),
  target_project_id UUID,
  top_k INTEGER DEFAULT 8,
  memory_kind TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  kind TEXT,
  metadata JSONB,
  similarity FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.id,
    pm.content,
    pm.kind,
    pm.metadata,
    1 - (pm.embedding <=> query_embedding) as similarity,
    pm.created_at
  FROM public.project_memory pm
  WHERE 
    pm.project_id = target_project_id
    AND pm.is_archived = false
    AND (memory_kind IS NULL OR pm.kind = memory_kind)
    AND pm.embedding IS NOT NULL
  ORDER BY pm.embedding <=> query_embedding
  LIMIT top_k;
END;
$$;

-- Function to cleanup old short-term memories (for archival)
CREATE OR REPLACE FUNCTION public.archive_old_memories(days_old INTEGER DEFAULT 7)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE public.project_memory
  SET is_archived = true, updated_at = now()
  WHERE 
    kind = 'short_term'
    AND created_at < now() - (days_old || ' days')::interval
    AND is_archived = false;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

-- Function to get conversations ready for summarization
CREATE OR REPLACE FUNCTION public.get_conversations_for_summarization(days_old INTEGER DEFAULT 7)
RETURNS TABLE (
  project_id UUID,
  conversation_id UUID,
  message_count INTEGER,
  oldest_message TIMESTAMP WITH TIME ZONE,
  newest_message TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.project_id,
    pm.conversation_id,
    COUNT(*)::INTEGER as message_count,
    MIN(pm.created_at) as oldest_message,
    MAX(pm.created_at) as newest_message
  FROM public.project_memory pm
  WHERE 
    pm.kind = 'short_term'
    AND pm.is_archived = false
    AND pm.created_at < now() - (days_old || ' days')::interval
    AND pm.conversation_id IS NOT NULL
  GROUP BY pm.project_id, pm.conversation_id
  HAVING COUNT(*) >= 5;
END;
$$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_project_memory_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_project_memory_updated_at
  BEFORE UPDATE ON public.project_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_memory_updated_at();