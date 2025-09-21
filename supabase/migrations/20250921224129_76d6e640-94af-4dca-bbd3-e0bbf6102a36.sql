-- Create storage bucket for collaboration files
INSERT INTO storage.buckets (id, name, public) VALUES ('collaboration-files', 'collaboration-files', false);

-- Create policies for collaboration files bucket
CREATE POLICY "Users can view files in accessible sessions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'collaboration-files' AND
  name LIKE (auth.uid()::text || '/%') OR
  name LIKE '%/' || (
    SELECT session_id::text FROM public.collaboration_files 
    WHERE storage_path = name AND session_id IN (
      SELECT cs.id FROM public.collaboration_sessions cs
      WHERE cs.created_by = auth.uid() 
      OR cs.id IN (
        SELECT up.session_id FROM public.user_presence up 
        WHERE up.user_id = auth.uid()
      )
    )
  ) || '/%'
);

CREATE POLICY "Users can upload files to accessible sessions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'collaboration-files' AND
  (storage.foldername(name))[1] IN (
    SELECT session_id::text FROM public.collaboration_sessions cs
    WHERE cs.created_by = auth.uid() 
    OR cs.id IN (
      SELECT up.session_id FROM public.user_presence up 
      WHERE up.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own uploaded files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'collaboration-files' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete their own uploaded files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'collaboration-files' AND
  (storage.foldername(name))[2] = auth.uid()::text
);