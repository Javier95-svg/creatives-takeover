-- Waitlist Builder: extend waitlist_pages and add email signups table

-- 1. Extend waitlist_pages with builder columns
ALTER TABLE waitlist_pages
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ai_content JSONB,
  ADD COLUMN IF NOT EXISTS product_name TEXT;

-- 2. Waitlist email signups
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_page_id UUID NOT NULL REFERENCES waitlist_pages(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (waitlist_page_id, email)
);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can submit their email to a published waitlist
CREATE POLICY "Public insert waitlist signups"
  ON waitlist_signups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM waitlist_pages
      WHERE waitlist_pages.id = waitlist_signups.waitlist_page_id
        AND waitlist_pages.status = 'published'
    )
  );

-- Page owners can read their own signups
CREATE POLICY "Owners read their waitlist signups"
  ON waitlist_signups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM waitlist_pages
      WHERE waitlist_pages.id = waitlist_signups.waitlist_page_id
        AND waitlist_pages.user_id = auth.uid()
    )
  );

-- 3. Allow public SELECT on published waitlist pages
--    (Drop the existing select policy first if it only covered authenticated owners)
DO $$ BEGIN
  -- Add a public-read policy for published pages if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'waitlist_pages'
      AND policyname = 'Public read published waitlist pages'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public read published waitlist pages"
        ON waitlist_pages FOR SELECT
        USING (status = 'published' OR auth.uid() = user_id)
    $policy$;
  END IF;
END $$;

-- 4. Index for slug lookups
CREATE INDEX IF NOT EXISTS waitlist_pages_slug_idx ON waitlist_pages (slug);
