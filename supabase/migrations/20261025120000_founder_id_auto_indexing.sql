-- Founder ID profiles become search-indexable automatically once they are
-- filled in (2026-10-25). Before this, a profile needed the owner to request
-- indexing, an admin to approve it, and profile_completion_percentage >= 60.
-- Nothing in the app ever wrote profile_completion_percentage (0 on all 359
-- profiles), so no profile could ever be indexed.
--
-- Now: indexable when the content bar is met and the owner has not opted out.
-- An admin can still block a profile by setting the review status to
-- 'rejected'. Empty and thin profiles stay noindex, so they never dilute the
-- site's quality in search.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS search_indexing_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.search_indexing_opt_out IS
  'Owner chose to keep their Founder ID out of search engines. Default false: filled-in profiles are indexable.';

GRANT SELECT, INSERT, UPDATE (search_indexing_opt_out) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.profile_is_search_indexable(p public.profiles)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    NOT COALESCE(p.search_indexing_opt_out, false)
    AND COALESCE(p.search_indexing_review_status, 'not_requested') <> 'rejected'
    AND char_length(btrim(COALESCE(p.username, ''))) >= 3
    AND p.username !~* '^user[_-]?[0-9a-f]{6,}$'
    AND char_length(btrim(COALESCE(p.full_name, ''))) >= 2
    AND char_length(btrim(COALESCE(p.bio, ''))) >= 120
    AND char_length(btrim(COALESCE(p.positioning_line, ''))) >= 20
    AND (
      char_length(btrim(COALESCE(p.creative_niche, ''))) >= 2
      OR (
        char_length(btrim(COALESCE(p.startup_name, ''))) >= 2
        AND char_length(btrim(COALESCE(p.startup_tagline, ''))) >= 10
      )
    );
$$;
