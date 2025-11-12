-- Enable RLS on knowledge_chunks table (accessed by RAG edge functions)
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- Service role can manage all knowledge chunks
CREATE POLICY "Service role can manage knowledge chunks"
ON knowledge_chunks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can read knowledge chunks (for RAG queries)
CREATE POLICY "Authenticated users can read knowledge chunks"
ON knowledge_chunks
FOR SELECT
TO authenticated
USING (true);