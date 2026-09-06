-- Share the guest's socials alongside their project site.
--
-- guest_website (added in 20260905120000) covers the project; these two cover
-- the person, so /podcast can point listeners at the guest directly. Kept as
-- separate columns rather than a JSON blob to match guest_name/guest_website
-- and stay queryable.
--
-- Both nullable and independent: a guest may have one, both, or neither.
-- Stored as absolute URLs, normalized on write, so the client renders them
-- without re-parsing a handle.

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS guest_linkedin  TEXT,
  ADD COLUMN IF NOT EXISTS guest_instagram TEXT;

COMMENT ON COLUMN public.podcast_episodes.guest_linkedin IS
  'Absolute URL of the guest''s LinkedIn profile. NULL when unknown.';

COMMENT ON COLUMN public.podcast_episodes.guest_instagram IS
  'Absolute URL of the guest''s Instagram profile. NULL when unknown.';
