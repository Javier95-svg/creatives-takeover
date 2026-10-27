-- Structured mentor discovery and fair Pulse rotation. All new mentor fields
-- are optional so existing profiles remain valid while admins enrich them.
ALTER TABLE public.mentors
  ADD COLUMN IF NOT EXISTS industries text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS startup_stages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS coaching_formats text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS location text;

COMMENT ON COLUMN public.mentors.languages IS 'ISO 639-1 language codes used for mentor discovery.';
COMMENT ON COLUMN public.mentors.timezone IS 'IANA timezone used for discovery, not private calendar availability.';

-- Preserve the former directory behavior as data, then stop inferring format
-- from a mentor name in application code.
UPDATE public.mentors
SET coaching_formats = CASE
  WHEN lower(name) LIKE '%marc%' AND lower(name) LIKE '%bright%' THEN ARRAY['Hourly Rate Basis']::text[]
  ELSE ARRAY['8 Week Coaching Program']::text[]
END
WHERE cardinality(coaching_formats) = 0;

REVOKE SELECT ON public.mentors FROM anon, authenticated;
GRANT SELECT (
  id, user_id, name, picture, bio, hourly_rate, hourly_rate_per_hour,
  currency, stripe_connected_account_id, expertise, rating, review_count,
  availability, is_active, is_featured, linkedin_url, twitter_x_url,
  website_url, nationality, universities, industries, languages,
  startup_stages, coaching_formats, timezone, location, created_at, updated_at
) ON public.mentors TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.pulse_mentor_recommendation_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL CHECK (char_length(session_id) BETWEEN 1 AND 64),
  turn_id text NOT NULL CHECK (char_length(turn_id) BETWEEN 1 AND 64),
  mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  query_fingerprint text NOT NULL CHECK (char_length(query_fingerprint) BETWEEN 8 AND 128),
  fit_band text NOT NULL CHECK (fit_band IN ('A', 'B', 'C')),
  rank smallint NOT NULL CHECK (rank BETWEEN 1 AND 3),
  shown_at timestamptz NOT NULL DEFAULT now(),
  clicked_at timestamptz,
  UNIQUE (user_id, turn_id, mentor_id)
);
CREATE INDEX IF NOT EXISTS pulse_mentor_impressions_rotation
  ON public.pulse_mentor_recommendation_impressions (user_id, shown_at DESC, mentor_id);
ALTER TABLE public.pulse_mentor_recommendation_impressions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pulse_mentor_impressions_owner_read ON public.pulse_mentor_recommendation_impressions;
CREATE POLICY pulse_mentor_impressions_owner_read ON public.pulse_mentor_recommendation_impressions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS pulse_mentor_impressions_owner_click ON public.pulse_mentor_recommendation_impressions;
CREATE POLICY pulse_mentor_impressions_owner_click ON public.pulse_mentor_recommendation_impressions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
REVOKE INSERT, DELETE ON public.pulse_mentor_recommendation_impressions FROM anon, authenticated;
REVOKE UPDATE ON public.pulse_mentor_recommendation_impressions FROM authenticated;
GRANT SELECT ON public.pulse_mentor_recommendation_impressions TO authenticated;
GRANT UPDATE (clicked_at) ON public.pulse_mentor_recommendation_impressions TO authenticated;

-- Run periodically from maintenance. Keeping 90 days is enough for fair
-- rotation without retaining an indefinite behavioral history.
CREATE OR REPLACE FUNCTION public.cleanup_pulse_mentor_impressions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE removed integer;
BEGIN
  DELETE FROM public.pulse_mentor_recommendation_impressions WHERE shown_at < now() - interval '90 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_pulse_mentor_impressions() FROM PUBLIC, anon, authenticated;
