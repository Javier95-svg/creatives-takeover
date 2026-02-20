-- Waitlist Phase 2: analytics, richer signup form

-- 1. View counter on waitlist pages
ALTER TABLE waitlist_pages
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. RPC to increment view count (SECURITY DEFINER so anon can call it without UPDATE RLS)
CREATE OR REPLACE FUNCTION increment_waitlist_view(page_id UUID)
RETURNS void AS $$
  UPDATE waitlist_pages
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = page_id AND status = 'published';
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant anon + authenticated users the ability to call this function
GRANT EXECUTE ON FUNCTION increment_waitlist_view(UUID) TO anon, authenticated;

-- 3. Richer signup fields
ALTER TABLE waitlist_signups
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS consent BOOLEAN DEFAULT false;
