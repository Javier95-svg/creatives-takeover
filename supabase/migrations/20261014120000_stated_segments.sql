-- Founder and Builder labels people actually chose.
--
-- Most labels were inferred: the 159 builders come from the 2026-09-17
-- backfill of business_stage ('' or 'idea'), and founder is the column default.
-- Comparing the two segments needs labels people stated, so:
--
-- 1. profiles.segment_stated_at: when the account last said which it is.
--    Null means the label is still an inference.
-- 2. Backfill from completed onboarding: the "What brings you here?" answer,
--    or the founderSegment of the first quiz version, which had no situation.
--    That also corrects the one account that chose Builder and was saved as a
--    Founder.
-- 3. A trigger marks the label as stated whenever onboarding completes with
--    that answer, so the completion function itself is unchanged.
-- 4. state_founder_segment() lets a signed-in founder or builder state it (the
--    workspace asks accounts with an inferred label once), and later move from
--    Builder to Founder. Each change is logged as 'segment_stated'.
-- 5. segment_check_needed() tells the workspace whether to ask.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS segment_stated_at timestamptz;
COMMENT ON COLUMN public.profiles.segment_stated_at IS
  'When the account last stated Founder or Builder (onboarding or the workspace question). Null: user_type is inferred.';

WITH stated AS (
  SELECT DISTINCT ON (s.user_id) s.user_id, s.completed_at,
    CASE s.answers->>'situation'
      WHEN 'existing_project' THEN 'founder'
      WHEN 'starting_project' THEN 'builder'
      ELSE s.answers->>'founderSegment'
    END AS segment
  FROM public.onboarding_sessions s
  WHERE s.status = 'completed'
    AND (s.answers->>'situation' IN ('existing_project', 'starting_project')
      OR s.answers->>'founderSegment' IN ('founder', 'builder'))
  ORDER BY s.user_id, s.completed_at DESC NULLS LAST
)
UPDATE public.profiles p
SET user_type = st.segment, founder_segment = st.segment, segment_stated_at = COALESCE(st.completed_at, now())
FROM stated st
WHERE p.id = st.user_id
  AND st.segment IN ('founder', 'builder')
  -- Mentors, providers and investors keep their reviewed type.
  AND p.user_type IN ('founder', 'builder')
  AND p.segment_stated_at IS NULL;

CREATE OR REPLACE FUNCTION public.mark_segment_stated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed')
     AND NEW.answers->>'situation' IN ('existing_project', 'starting_project') THEN
    UPDATE public.profiles SET segment_stated_at = COALESCE(NEW.completed_at, now()) WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_segment_stated() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS mark_segment_stated ON public.onboarding_sessions;
CREATE TRIGGER mark_segment_stated
AFTER INSERT OR UPDATE OF status ON public.onboarding_sessions
FOR EACH ROW EXECUTE FUNCTION public.mark_segment_stated();

CREATE OR REPLACE FUNCTION public.state_founder_segment(p_segment text, p_source text DEFAULT 'prompt')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_from text;
  v_source text := CASE WHEN p_source IN ('prompt', 'graduation', 'settings') THEN p_source ELSE 'prompt' END;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  IF p_segment IS NULL OR p_segment NOT IN ('founder', 'builder') THEN
    RAISE EXCEPTION 'Choose founder or builder' USING ERRCODE = '22023';
  END IF;
  SELECT user_type INTO v_from FROM public.profiles WHERE id = v_user FOR UPDATE;
  -- Only founders and builders move between the two. Reviewed types never
  -- pass through here, so this cannot skip an application review.
  IF v_from IS NULL OR v_from NOT IN ('founder', 'builder') THEN
    RAISE EXCEPTION 'Only founder and builder accounts can do this' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles
  SET user_type = p_segment, founder_segment = p_segment, segment_stated_at = now()
  WHERE id = v_user;
  INSERT INTO public.user_activity_log (user_id, activity_type, activity_data)
  VALUES (v_user, 'segment_stated', jsonb_build_object('from', v_from, 'to', p_segment, 'source', v_source));
  RETURN p_segment;
END;
$$;
REVOKE ALL ON FUNCTION public.state_founder_segment(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.state_founder_segment(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.segment_check_needed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Accounts still in onboarding are asked there, so only finished ones count.
  SELECT COALESCE((
    SELECT p.user_type IN ('founder', 'builder') AND p.segment_stated_at IS NULL AND COALESCE(p.onboarding_completed, false)
    FROM public.profiles p WHERE p.id = auth.uid()
  ), false);
$$;
REVOKE ALL ON FUNCTION public.segment_check_needed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.segment_check_needed() TO authenticated;
