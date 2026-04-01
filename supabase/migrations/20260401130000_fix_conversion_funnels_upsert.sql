-- Fix conversion_funnels upsert: add UNIQUE constraint on session_id
-- (previously only a regular index, which breaks onConflict upserts)
ALTER TABLE conversion_funnels
  ADD CONSTRAINT conversion_funnels_session_id_key UNIQUE (session_id);

-- Allow anon users to update funnel rows (required for upsert conflict resolution)
CREATE POLICY "Allow anonymous funnel update"
  ON conversion_funnels FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to update their own funnel rows
CREATE POLICY "Allow authenticated funnel update"
  ON conversion_funnels FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (true);
