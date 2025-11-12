-- Add unique constraint to knowledge_chunks for proper upsert behavior
ALTER TABLE knowledge_chunks 
ADD CONSTRAINT knowledge_chunks_source_source_id_key UNIQUE (source, source_id);