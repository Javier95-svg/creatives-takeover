-- Profiles showed a free-text "Stage" and a "Followers" count, neither of which
-- matches the product.
--
-- business_stage and startup_stage are unvalidated text. Production holds
-- 'growing', 'scaling', 'fart' and seven other values, so the profile was
-- title-casing whatever a user typed years ago rather than naming one of the
-- seven Startup Development Cycle stages. assigned_stage is the quiz-assigned
-- 1..7 and is already populated for 37 profiles, so the view now exposes it and
-- the profile reads that instead.
--
-- Following is not a platform concept. Connections are: friend_requests with
-- status 'accepted', which are mutual by construction. RLS restricts that table
-- to rows the viewer is part of, which is correct, so counting another person's
-- connections needs a definer function rather than a client query.

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  username,
  full_name,
  avatar_url,
  bio,
  positioning_line,
  creative_niche,
  followers_count,
  following_count,
  location,
  startup_name,
  startup_tagline,
  startup_stage,
  startup_industry,
  website_url,
  twitter_url,
  linkedin_url,
  instagram_url,
  facebook_url,
  youtube_url,
  github_url,
  tiktok_url,
  is_coach,
  country,
  profile_is_search_indexable(p.*) AS seo_indexable,
  -- The onboarding quiz's placement on the Startup Development Cycle, 1..7.
  -- Appended last: CREATE OR REPLACE VIEW can only add columns at the end.
  assigned_stage
FROM profiles p;

-- Accepted connections in both directions, the way the network actually works:
-- you add people and people add you, and either one that is accepted counts once.
CREATE OR REPLACE FUNCTION public.connection_count(target_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.friend_requests
  WHERE status = 'accepted'
    AND (sender_id = target_id OR receiver_id = target_id);
$function$;

COMMENT ON FUNCTION public.connection_count(uuid) IS
  'Accepted connections for a profile, counted in both directions. Definer because friend_requests RLS limits SELECT to rows the viewer is part of, and a profile shows its own count to any visitor.';

GRANT EXECUTE ON FUNCTION public.connection_count(uuid) TO anon, authenticated;
