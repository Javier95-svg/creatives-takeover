-- Link a podcast episode to the mentor it features.
--
-- Mentor interviews live in podcast_episodes but had no relation back to the
-- mentor, so /mentorship/:slug could not surface them. mentor_slug holds the
-- same slug the profile route uses (generateMentorSlug -> "charlotte-joseph"),
-- which keeps the join independent of mentor row ids and works for the
-- name-derived URLs the profile pages already resolve by.
--
-- Nullable: most episodes are not mentor interviews.

ALTER TABLE public.podcast_episodes
  ADD COLUMN IF NOT EXISTS mentor_slug TEXT;

COMMENT ON COLUMN public.podcast_episodes.mentor_slug IS
  'Slug of the mentor featured in this episode, matching /mentorship/:slug. NULL for episodes that are not mentor interviews.';

-- Lookup path for the mentor profile: one published episode for one slug.
CREATE INDEX IF NOT EXISTS podcast_episodes_mentor_slug_idx
  ON public.podcast_episodes (mentor_slug)
  WHERE mentor_slug IS NOT NULL AND is_published = true;

-- Attach the Charlotte Joseph interview.
UPDATE public.podcast_episodes
SET mentor_slug = 'charlotte-joseph'
WHERE mentor_slug IS NULL
  AND title ILIKE '%Charlotte Joseph%';
