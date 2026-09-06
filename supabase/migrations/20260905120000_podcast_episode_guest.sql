-- Credit the guest featured in a podcast episode.
--
-- The episode banner showed only a title and a clamped description, so the
-- person being interviewed and the thing they are building were buried in prose
-- (or missing entirely). These two columns make that attribution structured, so
-- /podcast can render the guest's name and link out to their project.
--
-- Both nullable: solo/host-only episodes have no guest, and a guest does not
-- always have a site to point at. Independent of mentor_slug, which only covers
-- guests who also have a mentor profile on the platform.

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS guest_name    TEXT,
  ADD COLUMN IF NOT EXISTS guest_website TEXT;

COMMENT ON COLUMN public.podcast_episodes.guest_name IS
  'Display name of the guest featured in this episode. NULL for episodes without a guest.';

COMMENT ON COLUMN public.podcast_episodes.guest_website IS
  'Absolute URL of the guest''s project/company site, stored with its scheme. NULL when unknown.';
