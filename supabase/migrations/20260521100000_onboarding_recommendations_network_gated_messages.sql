ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country TEXT;

ALTER TABLE public.mentor_saves
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS recommended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recommendation_reason TEXT,
ADD COLUMN IF NOT EXISTS matched_support_areas TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS matched_sectors TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS profiles_country_idx
ON public.profiles (country);

CREATE INDEX IF NOT EXISTS profiles_startup_industry_gin_idx
ON public.profiles USING GIN (startup_industry);

CREATE INDEX IF NOT EXISTS mentor_saves_user_source_idx
ON public.mentor_saves (user_id, source, created_at DESC);

DO $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(format('p.%I', column_name), ', ' ORDER BY ordinal_position)
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'public_profiles'
    AND column_name <> 'country';

  IF v_columns IS NULL THEN
    v_columns := 'p.id, p.username, p.full_name, p.avatar_url, p.bio, p.positioning_line, p.creative_niche, p.followers_count, p.following_count, p.location, p.startup_name, p.startup_tagline, p.startup_stage, p.startup_industry, p.website_url, p.twitter_url, p.linkedin_url, p.instagram_url, p.facebook_url, p.youtube_url, p.github_url, p.tiktok_url';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE VIEW public.public_profiles AS SELECT %s, p.country FROM public.profiles p',
    v_columns
  );
END;
$$;

REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.public_profiles FROM anon;
REVOKE ALL ON TABLE public.public_profiles FROM authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon;
GRANT SELECT ON TABLE public.public_profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.are_users_connected(p_user_a UUID, p_user_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friend_requests fr
    WHERE fr.status = 'accepted'
      AND (
        (fr.sender_id = p_user_a AND fr.receiver_id = p_user_b)
        OR (fr.sender_id = p_user_b AND fr.receiver_id = p_user_a)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.are_users_connected(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_direct_conversation_connected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant_count INTEGER;
  v_user_a UUID;
  v_user_b UUID;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_group, false) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), MIN(participant), MAX(participant)
  INTO v_participant_count, v_user_a, v_user_b
  FROM unnest(NEW.participants) AS participant;

  IF v_participant_count <> 2 THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() <> ALL(NEW.participants) THEN
    RAISE EXCEPTION 'You can only create conversations you participate in'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.are_users_connected(v_user_a, v_user_b) THEN
    RAISE EXCEPTION 'You must be connected before starting a direct message'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS conversations_enforce_connected ON public.conversations;
CREATE TRIGGER conversations_enforce_connected
BEFORE INSERT OR UPDATE OF participants, is_group ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_direct_conversation_connected();

CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(p_other_user_id UUID)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self UUID := auth.uid();
  v_user_a UUID;
  v_user_b UUID;
  v_conversation public.conversations;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  IF p_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient user id is required'
      USING ERRCODE = '22004';
  END IF;

  IF v_self = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create a direct conversation with yourself'
      USING ERRCODE = '22023';
  END IF;

  IF NOT public.are_users_connected(v_self, p_other_user_id) THEN
    RAISE EXCEPTION 'You must be connected before starting a direct message'
      USING ERRCODE = '42501';
  END IF;

  v_user_a := LEAST(v_self, p_other_user_id);
  v_user_b := GREATEST(v_self, p_other_user_id);

  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_a::text || ':' || v_user_b::text, 0));

  INSERT INTO public.conversations (participants, is_group, last_message_at)
  VALUES (ARRAY[v_user_a, v_user_b]::UUID[], false, now())
  ON CONFLICT (direct_user_a, direct_user_b)
  DO UPDATE
    SET updated_at = now()
  RETURNING * INTO v_conversation;

  RETURN v_conversation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_message_not_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant UUID;
  v_is_group BOOLEAN;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT c.is_group, participant
  INTO v_is_group, v_participant
  FROM public.conversations c
  CROSS JOIN LATERAL unnest(c.participants) AS participant
  WHERE c.id = NEW.conversation_id
    AND participant <> NEW.sender_id
  LIMIT 1;

  IF v_participant IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT COALESCE(v_is_group, false) AND NOT public.are_users_connected(NEW.sender_id, v_participant) THEN
    RAISE EXCEPTION 'You must be connected before sending a direct message'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_blocks ub
    WHERE (ub.blocker_id = v_participant AND ub.blocked_id = NEW.sender_id)
       OR (ub.blocker_id = NEW.sender_id AND ub.blocked_id = v_participant)
  ) THEN
    RAISE EXCEPTION 'This conversation is blocked'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_enforce_not_blocked ON public.messages;
CREATE TRIGGER messages_enforce_not_blocked
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_message_not_blocked();
