-- Find a Co-Founder Marketplace V2 (releases 1-4).
-- Additive migration: legacy cofounder_posts columns and routes remain supported.

ALTER TABLE public.cofounder_posts
  ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'building',
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS startup_name text,
  ADD COLUMN IF NOT EXISTS industries text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS skills_offered text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS skills_sought text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS work_mode text NOT NULL DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS founder_values text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now();

UPDATE public.cofounder_posts
SET listing_type = 'building',
    headline = COALESCE(NULLIF(headline, ''), project_name),
    summary = COALESCE(NULLIF(summary, ''), project_description),
    startup_name = COALESCE(NULLIF(startup_name, ''), project_name),
    industries = CASE
      WHEN cardinality(industries) > 0 THEN industries
      WHEN NULLIF(industry, '') IS NOT NULL THEN ARRAY[industry]
      ELSE '{}'::text[]
    END,
    skills_sought = CASE WHEN cardinality(skills_sought) > 0 THEN skills_sought ELSE looking_for END,
    published_at = COALESCE(published_at, created_at, now()),
    expires_at = COALESCE(expires_at, COALESCE(created_at, now()) + interval '30 days'),
    last_active_at = COALESCE(last_active_at, updated_at, created_at, now())
WHERE headline IS NULL
   OR summary IS NULL
   OR published_at IS NULL
   OR expires_at IS NULL
   OR cardinality(industries) = 0
   OR cardinality(skills_sought) = 0;

UPDATE public.cofounder_posts
SET status = 'expired'
WHERE status = 'active' AND expires_at <= now();

WITH ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY user_id
    ORDER BY COALESCE(published_at, created_at) DESC, created_at DESC, id DESC
  ) AS position
  FROM public.cofounder_posts
  WHERE status = 'active'
)
UPDATE public.cofounder_posts p
SET status = 'archived', updated_at = now()
FROM ranked r
WHERE p.id = r.id AND r.position > 1;

ALTER TABLE public.cofounder_posts
  DROP CONSTRAINT IF EXISTS cofounder_posts_listing_type_check,
  ADD CONSTRAINT cofounder_posts_listing_type_check CHECK (listing_type IN ('building', 'joining')),
  DROP CONSTRAINT IF EXISTS cofounder_posts_marketplace_status_check,
  ADD CONSTRAINT cofounder_posts_marketplace_status_check CHECK (status IN ('draft', 'active', 'paused', 'expired', 'closed', 'archived')),
  DROP CONSTRAINT IF EXISTS cofounder_posts_work_mode_check,
  ADD CONSTRAINT cofounder_posts_work_mode_check CHECK (work_mode IN ('remote', 'hybrid', 'in_person', 'flexible'));

-- Anonymous users must use the masked browse RPC; raw rows include owner IDs.
DROP POLICY IF EXISTS "Anyone can view active cofounder posts" ON public.cofounder_posts;
DROP POLICY IF EXISTS cofounder_posts_authenticated_active_read ON public.cofounder_posts;
CREATE POLICY cofounder_posts_authenticated_active_read ON public.cofounder_posts
  FOR SELECT TO authenticated USING (status='active' OR user_id=auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS cofounder_posts_one_active_per_user_idx
  ON public.cofounder_posts (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS cofounder_posts_marketplace_browse_idx
  ON public.cofounder_posts (status, last_active_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS cofounder_posts_marketplace_expiry_idx
  ON public.cofounder_posts (expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS cofounder_posts_listing_type_idx
  ON public.cofounder_posts (listing_type, status, last_active_at DESC);
CREATE INDEX IF NOT EXISTS cofounder_posts_industries_gin_idx
  ON public.cofounder_posts USING gin (industries);
CREATE INDEX IF NOT EXISTS cofounder_posts_skills_offered_gin_idx
  ON public.cofounder_posts USING gin (skills_offered);
CREATE INDEX IF NOT EXISTS cofounder_posts_skills_sought_gin_idx
  ON public.cofounder_posts USING gin (skills_sought);

CREATE TABLE IF NOT EXISTS public.cofounder_listing_saves (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.cofounder_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS public.cofounder_match_feedback (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.cofounder_posts(id) ON DELETE CASCADE,
  feedback text NOT NULL CHECK(feedback IN('not_relevant','good_match')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,listing_id)
);

CREATE TABLE IF NOT EXISTS public.cofounder_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.cofounder_posts(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason_code text NOT NULL,
  introduction text NOT NULL,
  availability_note text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stop_recommending boolean NOT NULL DEFAULT false,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cofounder_interests_not_self CHECK (sender_id <> recipient_id),
  CONSTRAINT cofounder_interests_status_check CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn', 'expired', 'blocked')),
  CONSTRAINT cofounder_interests_reason_check CHECK (reason_code IN ('complementary_skills', 'shared_industry', 'shared_stage', 'custom_fit')),
  CONSTRAINT cofounder_interests_intro_check CHECK (char_length(introduction) BETWEEN 50 AND 500),
  CONSTRAINT cofounder_interests_availability_check CHECK (char_length(availability_note) BETWEEN 2 AND 180)
);

CREATE UNIQUE INDEX IF NOT EXISTS cofounder_interests_one_pending_idx
  ON public.cofounder_interests (sender_id, listing_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS cofounder_interests_recipient_idx
  ON public.cofounder_interests (recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS cofounder_interests_sender_idx
  ON public.cofounder_interests (sender_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.cofounder_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.cofounder_posts(id) ON DELETE CASCADE,
  interest_id uuid REFERENCES public.cofounder_interests(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  explanation text,
  status text NOT NULL DEFAULT 'open',
  resolution_note text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cofounder_reports_target_check CHECK (listing_id IS NOT NULL OR interest_id IS NOT NULL),
  CONSTRAINT cofounder_reports_category_check CHECK (category IN ('spam', 'scam', 'harassment', 'misleading_information', 'inappropriate_content', 'other')),
  CONSTRAINT cofounder_reports_status_check CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  CONSTRAINT cofounder_reports_explanation_check CHECK (explanation IS NULL OR char_length(explanation) <= 1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS cofounder_reports_dedupe_idx
  ON public.cofounder_reports (reporter_id, COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(interest_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS cofounder_reports_admin_idx ON public.cofounder_reports (status, created_at DESC);

ALTER TABLE public.cofounder_listing_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofounder_match_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofounder_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cofounder_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cofounder_saves_own ON public.cofounder_listing_saves;
CREATE POLICY cofounder_saves_own ON public.cofounder_listing_saves
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS cofounder_match_feedback_own ON public.cofounder_match_feedback;
CREATE POLICY cofounder_match_feedback_own ON public.cofounder_match_feedback
  FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());

DROP POLICY IF EXISTS cofounder_interests_participants_read ON public.cofounder_interests;
CREATE POLICY cofounder_interests_participants_read ON public.cofounder_interests
  FOR SELECT TO authenticated USING (
    sender_id = auth.uid() OR recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS cofounder_reports_reporter_insert ON public.cofounder_reports;
CREATE POLICY cofounder_reports_reporter_insert ON public.cofounder_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND reported_user_id <> auth.uid());
DROP POLICY IF EXISTS cofounder_reports_reporter_read ON public.cofounder_reports;
CREATE POLICY cofounder_reports_reporter_read ON public.cofounder_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS cofounder_reports_admin_update ON public.cofounder_reports;
CREATE POLICY cofounder_reports_admin_update ON public.cofounder_reports
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.cofounder_marketplace_assert_trust(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_confirmed timestamptz;
  v_completion integer;
BEGIN
  SELECT email_confirmed_at INTO v_confirmed FROM auth.users WHERE id = p_user;
  SELECT COALESCE(profile_completion_percentage, 0) INTO v_completion FROM public.profiles WHERE id = p_user;
  IF v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Verify your email before using the co-founder marketplace' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(v_completion, 0) < 60 THEN
    RAISE EXCEPTION 'Complete at least 60%% of your profile before using the co-founder marketplace' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cofounder_marketplace_validate_listing(p_listing jsonb)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_type text := COALESCE(p_listing->>'listingType', p_listing->>'listing_type');
  v_headline text := trim(COALESCE(p_listing->>'headline', ''));
  v_summary text := trim(COALESCE(p_listing->>'summary', ''));
  v_timezone text := trim(COALESCE(p_listing->>'timezone', 'UTC'));
  v_work_mode text := COALESCE(p_listing->>'workMode', p_listing->>'work_mode', 'flexible');
BEGIN
  IF v_type NOT IN ('building', 'joining') THEN RAISE EXCEPTION 'Invalid listing type'; END IF;
  IF char_length(v_headline) NOT BETWEEN 10 AND 100 THEN RAISE EXCEPTION 'Headline must be 10-100 characters'; END IF;
  IF char_length(v_summary) NOT BETWEEN 80 AND 1200 THEN RAISE EXCEPTION 'Summary must be 80-1200 characters'; END IF;
  IF v_work_mode NOT IN ('remote', 'hybrid', 'in_person', 'flexible') THEN RAISE EXCEPTION 'Invalid work mode'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = v_timezone) THEN RAISE EXCEPTION 'Invalid timezone'; END IF;
  IF jsonb_array_length(COALESCE(p_listing->'skillsOffered', p_listing->'skills_offered', '[]'::jsonb)) > 12 THEN RAISE EXCEPTION 'Too many offered skills'; END IF;
  IF jsonb_array_length(COALESCE(p_listing->'skillsSought', p_listing->'skills_sought', '[]'::jsonb)) > 12 THEN RAISE EXCEPTION 'Too many sought skills'; END IF;
  IF jsonb_array_length(COALESCE(p_listing->'industries', '[]'::jsonb)) > 8 THEN RAISE EXCEPTION 'Too many industries'; END IF;
  IF jsonb_array_length(COALESCE(p_listing->'values', p_listing->'founder_values', '[]'::jsonb)) > 8 THEN RAISE EXCEPTION 'Too many values'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cofounder_listing_json(p public.cofounder_posts, p_mask_identity boolean DEFAULT false)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'id', p.id,
    'userId', CASE WHEN p_mask_identity THEN NULL ELSE p.user_id END,
    'listingType', p.listing_type,
    'headline', p.headline,
    'summary', p.summary,
    'startupName', p.startup_name,
    'startupStage', p.stage,
    'industries', p.industries,
    'skillsOffered', p.skills_offered,
    'skillsSought', p.skills_sought,
    'commitment', p.commitment,
    'timezone', p.timezone,
    'workMode', p.work_mode,
    'location', CASE WHEN p_mask_identity THEN NULL ELSE p.location END,
    'experienceLevel', p.experience_level,
    'values', p.founder_values,
    'equityRange', p.equity_range,
    'status', p.status,
    'publishedAt', p.published_at,
    'expiresAt', p.expires_at,
    'lastActiveAt', p.last_active_at,
    'createdAt', p.created_at,
    'updatedAt', p.updated_at
  ));
$$;

CREATE OR REPLACE FUNCTION public.publish_cofounder_listing_v2(p_listing jsonb, p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_existing public.cofounder_posts;
  v_result public.cofounder_posts;
  v_charge jsonb;
  v_id uuid;
  v_skills_offered text[];
  v_skills_sought text[];
  v_industries text[];
  v_values text[];
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF NULLIF(trim(p_idempotency_key), '') IS NULL THEN RAISE EXCEPTION 'Idempotency key is required'; END IF;
  PERFORM public.cofounder_marketplace_assert_trust(v_user);
  PERFORM public.cofounder_marketplace_validate_listing(p_listing);

  SELECT p.* INTO v_existing
  FROM public.cofounder_posts p
  JOIN public.credit_transactions ct ON ct.user_id = v_user
    AND ct.feature = 'COFOUNDER_POST'
    AND ct.metadata->>'idempotencyKey' = p_idempotency_key
  WHERE p.user_id = v_user
    AND p.id::text = ct.metadata->>'listingId'
  ORDER BY p.created_at DESC LIMIT 1;
  IF FOUND THEN RETURN public.cofounder_listing_json(v_existing, false); END IF;

  v_id := COALESCE(NULLIF(p_listing->>'id', '')::uuid, gen_random_uuid());
  SELECT COALESCE(array_agg(value), '{}'::text[]) INTO v_skills_offered FROM jsonb_array_elements_text(COALESCE(p_listing->'skillsOffered', '[]'::jsonb));
  SELECT COALESCE(array_agg(value), '{}'::text[]) INTO v_skills_sought FROM jsonb_array_elements_text(COALESCE(p_listing->'skillsSought', '[]'::jsonb));
  SELECT COALESCE(array_agg(value), '{}'::text[]) INTO v_industries FROM jsonb_array_elements_text(COALESCE(p_listing->'industries', '[]'::jsonb));
  SELECT COALESCE(array_agg(value), '{}'::text[]) INTO v_values FROM jsonb_array_elements_text(COALESCE(p_listing->'values', '[]'::jsonb));

  PERFORM set_config('app.cofounder_marketplace_rpc', '1', true);
  v_charge := public.deduct_credits_atomic(v_user, 5, 'COFOUNDER_POST', NULL, jsonb_build_object(
    'idempotencyKey', p_idempotency_key, 'operationId', p_idempotency_key,
    'listingId', v_id, 'source', 'cofounder_marketplace_v2'
  ));
  IF NOT COALESCE((v_charge->>'success')::boolean, false) THEN
    RAISE EXCEPTION '%', COALESCE(v_charge->>'error', 'Unable to charge credits');
  END IF;

  UPDATE public.cofounder_posts SET status = 'archived', updated_at = now()
  WHERE user_id = v_user AND status = 'active';

  INSERT INTO public.cofounder_posts (
    id, user_id, project_name, project_description, industry, stage, looking_for,
    commitment, location, equity_range, additional_info, status,
    listing_type, headline, summary, startup_name, industries, skills_offered,
    skills_sought, timezone, work_mode, experience_level, founder_values,
    published_at, expires_at, last_active_at
  ) VALUES (
    v_id, v_user,
    COALESCE(NULLIF(p_listing->>'startupName', ''), p_listing->>'headline'),
    p_listing->>'summary', v_industries[1], COALESCE(p_listing->>'startupStage', 'idea'), v_skills_sought,
    NULLIF(p_listing->>'commitment', ''), NULLIF(p_listing->>'location', ''), NULLIF(p_listing->>'equityRange', ''), NULL, 'active',
    p_listing->>'listingType', trim(p_listing->>'headline'), trim(p_listing->>'summary'), NULLIF(p_listing->>'startupName', ''),
    v_industries, v_skills_offered, v_skills_sought, COALESCE(NULLIF(p_listing->>'timezone', ''), 'UTC'),
    COALESCE(NULLIF(p_listing->>'workMode', ''), 'flexible'), NULLIF(p_listing->>'experienceLevel', ''), v_values,
    now(), now() + interval '30 days', now()
  ) RETURNING * INTO v_result;

  UPDATE public.cofounder_posts SET status = 'archived', updated_at = now()
  WHERE user_id = v_user AND status = 'draft' AND id <> v_result.id;

  INSERT INTO public.user_activity_log(user_id, activity_type, activity_data, event_key, source_tool, source_entity_type, source_entity_id, page_path)
  VALUES (v_user, 'cofounder_listing_published', jsonb_build_object('listingType', v_result.listing_type),
    v_result.id::text || ':published:' || extract(epoch from v_result.published_at)::bigint, 'cofounder_marketplace', 'cofounder_listing', v_result.id, '/co-founder')
  ON CONFLICT (user_id, event_key) DO NOTHING;

  RETURN public.cofounder_listing_json(v_result, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_cofounder_listing_draft_v2(p_listing jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid(); v_result public.cofounder_posts; v_id uuid; v_industries text[]; v_offered text[]; v_sought text[]; v_values text[];
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  v_id := NULLIF(p_listing->>'id','')::uuid;
  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cofounder_posts WHERE id=v_id AND user_id=v_user AND status='draft') THEN v_id:=NULL; END IF;
  IF v_id IS NULL THEN SELECT id INTO v_id FROM public.cofounder_posts WHERE user_id=v_user AND status='draft' ORDER BY updated_at DESC LIMIT 1; END IF;
  v_id:=COALESCE(v_id,gen_random_uuid());
  SELECT COALESCE(array_agg(value),'{}') INTO v_industries FROM jsonb_array_elements_text(COALESCE(p_listing->'industries','[]'));
  SELECT COALESCE(array_agg(value),'{}') INTO v_offered FROM jsonb_array_elements_text(COALESCE(p_listing->'skillsOffered','[]'));
  SELECT COALESCE(array_agg(value),'{}') INTO v_sought FROM jsonb_array_elements_text(COALESCE(p_listing->'skillsSought','[]'));
  SELECT COALESCE(array_agg(value),'{}') INTO v_values FROM jsonb_array_elements_text(COALESCE(p_listing->'values','[]'));
  PERFORM set_config('app.cofounder_marketplace_rpc','1',true);
  INSERT INTO public.cofounder_posts(id,user_id,project_name,project_description,industry,stage,looking_for,commitment,location,equity_range,status,
    listing_type,headline,summary,startup_name,industries,skills_offered,skills_sought,timezone,work_mode,experience_level,founder_values,last_active_at)
  VALUES(v_id,v_user,COALESCE(NULLIF(p_listing->>'startupName',''),NULLIF(p_listing->>'headline',''),'Untitled draft'),COALESCE(NULLIF(p_listing->>'summary',''),'Draft listing'),v_industries[1],COALESCE(NULLIF(p_listing->>'startupStage',''),'idea'),v_sought,
    NULLIF(p_listing->>'commitment',''),NULLIF(p_listing->>'location',''),NULLIF(p_listing->>'equityRange',''),'draft',COALESCE(NULLIF(p_listing->>'listingType',''),'building'),NULLIF(p_listing->>'headline',''),NULLIF(p_listing->>'summary',''),NULLIF(p_listing->>'startupName',''),v_industries,v_offered,v_sought,COALESCE(NULLIF(p_listing->>'timezone',''),'UTC'),COALESCE(NULLIF(p_listing->>'workMode',''),'flexible'),NULLIF(p_listing->>'experienceLevel',''),v_values,now())
  ON CONFLICT(id) DO UPDATE SET listing_type=excluded.listing_type,headline=excluded.headline,summary=excluded.summary,startup_name=excluded.startup_name,
    industries=excluded.industries,skills_offered=excluded.skills_offered,skills_sought=excluded.skills_sought,stage=excluded.stage,commitment=excluded.commitment,
    timezone=excluded.timezone,work_mode=excluded.work_mode,location=excluded.location,experience_level=excluded.experience_level,founder_values=excluded.founder_values,
    equity_range=excluded.equity_range,project_name=excluded.project_name,project_description=excluded.project_description,looking_for=excluded.looking_for,updated_at=now()
  RETURNING * INTO v_result;
  RETURN public.cofounder_listing_json(v_result,false);
END; $$;

CREATE OR REPLACE FUNCTION public.update_cofounder_listing_v2(p_listing_id uuid, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_current public.cofounder_posts;
  v_merged jsonb;
  v_result public.cofounder_posts;
  v_arr text[];
BEGIN
  SELECT * INTO v_current FROM public.cofounder_posts WHERE id = p_listing_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found' USING ERRCODE = 'P0002'; END IF;
  v_merged := public.cofounder_listing_json(v_current, false) || p_patch;
  PERFORM public.cofounder_marketplace_validate_listing(v_merged);
  UPDATE public.cofounder_posts SET
    listing_type = COALESCE(p_patch->>'listingType', listing_type),
    headline = COALESCE(NULLIF(trim(p_patch->>'headline'), ''), headline),
    summary = COALESCE(NULLIF(trim(p_patch->>'summary'), ''), summary),
    startup_name = CASE WHEN p_patch ? 'startupName' THEN NULLIF(p_patch->>'startupName', '') ELSE startup_name END,
    stage = COALESCE(NULLIF(p_patch->>'startupStage', ''), stage),
    industries = CASE WHEN p_patch ? 'industries' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'industries')) ELSE industries END,
    skills_offered = CASE WHEN p_patch ? 'skillsOffered' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'skillsOffered')) ELSE skills_offered END,
    skills_sought = CASE WHEN p_patch ? 'skillsSought' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'skillsSought')) ELSE skills_sought END,
    commitment = CASE WHEN p_patch ? 'commitment' THEN NULLIF(p_patch->>'commitment', '') ELSE commitment END,
    timezone = COALESCE(NULLIF(p_patch->>'timezone', ''), timezone),
    work_mode = COALESCE(NULLIF(p_patch->>'workMode', ''), work_mode),
    location = CASE WHEN p_patch ? 'location' THEN NULLIF(p_patch->>'location', '') ELSE location END,
    experience_level = CASE WHEN p_patch ? 'experienceLevel' THEN NULLIF(p_patch->>'experienceLevel', '') ELSE experience_level END,
    founder_values = CASE WHEN p_patch ? 'values' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'values')) ELSE founder_values END,
    equity_range = CASE WHEN p_patch ? 'equityRange' THEN NULLIF(p_patch->>'equityRange', '') ELSE equity_range END,
    project_name = COALESCE(NULLIF(p_patch->>'startupName', ''), NULLIF(p_patch->>'headline', ''), project_name),
    project_description = COALESCE(NULLIF(p_patch->>'summary', ''), project_description),
    updated_at = now(), last_active_at = now()
  WHERE id = p_listing_id
  RETURNING * INTO v_result;
  RETURN public.cofounder_listing_json(v_result, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_cofounder_listing_v2(p_listing_id uuid, p_idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_result public.cofounder_posts;
  v_charge jsonb;
BEGIN
  IF NULLIF(trim(p_idempotency_key), '') IS NULL THEN RAISE EXCEPTION 'Idempotency key is required'; END IF;
  PERFORM public.cofounder_marketplace_assert_trust(v_user);
  SELECT * INTO v_result FROM public.cofounder_posts WHERE id = p_listing_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF v_result.status = 'active' AND v_result.expires_at > now() THEN RETURN public.cofounder_listing_json(v_result, false); END IF;
  PERFORM set_config('app.cofounder_marketplace_rpc', '1', true);
  v_charge := public.deduct_credits_atomic(v_user, 5, 'COFOUNDER_POST', NULL, jsonb_build_object(
    'idempotencyKey', p_idempotency_key, 'operationId', p_idempotency_key, 'listingId', p_listing_id, 'source', 'cofounder_marketplace_renewal'
  ));
  IF NOT COALESCE((v_charge->>'success')::boolean, false) THEN RAISE EXCEPTION '%', COALESCE(v_charge->>'error', 'Unable to charge credits'); END IF;
  UPDATE public.cofounder_posts SET status = 'archived', updated_at = now() WHERE user_id = v_user AND status = 'active' AND id <> p_listing_id;
  UPDATE public.cofounder_posts SET status = 'active', published_at = now(), expires_at = now() + interval '30 days', last_active_at = now(), updated_at = now()
  WHERE id = p_listing_id RETURNING * INTO v_result;
  INSERT INTO public.user_activity_log(user_id, activity_type, activity_data, event_key, source_tool, source_entity_type, source_entity_id, page_path)
  VALUES (v_user, 'cofounder_listing_renewed', '{}'::jsonb, p_listing_id::text || ':renewed:' || extract(epoch from v_result.published_at)::bigint,
    'cofounder_marketplace', 'cofounder_listing', p_listing_id, '/co-founder')
  ON CONFLICT (user_id, event_key) DO NOTHING;
  RETURN public.cofounder_listing_json(v_result, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_cofounder_listing_status_v2(p_listing_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result public.cofounder_posts;
BEGIN
  IF p_status NOT IN ('paused', 'closed', 'archived') THEN RAISE EXCEPTION 'Invalid status transition'; END IF;
  UPDATE public.cofounder_posts SET status = p_status, updated_at = now()
  WHERE id = p_listing_id AND user_id = auth.uid() RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  UPDATE public.daily_tasks SET recommendation_status='dismissed',dismissed_at=COALESCE(dismissed_at,now()),updated_at=now()
  WHERE user_id=auth.uid() AND recommendation_key='cofounder:review_matches:'||p_listing_id AND COALESCE(is_completed,false)=false;
  INSERT INTO public.user_activity_log(user_id,activity_type,activity_data,event_key,source_tool,source_entity_type,source_entity_id,page_path)
  VALUES(auth.uid(),'cofounder_listing_status_changed',jsonb_build_object('status',p_status),p_listing_id::text||':status:'||p_status||':'||extract(epoch from now())::bigint,'cofounder_marketplace','cofounder_listing',p_listing_id,'/co-founder')
  ON CONFLICT(user_id,event_key) DO NOTHING;
  RETURN public.cofounder_listing_json(v_result, false);
END;
$$;

-- Keep legacy raw inserts chargeable, while V2 RPCs perform their own idempotent charge.
CREATE OR REPLACE FUNCTION public.enforce_cofounder_post_credit_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_charge_result jsonb;
BEGIN
  IF current_setting('app.cofounder_marketplace_rpc', true) = '1' THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only create a co-founder post for your own account.' USING ERRCODE = '42501';
  END IF;
  IF char_length(NEW.project_name)>100 OR char_length(NEW.project_description)>1200 OR concat_ws(' ',NEW.project_name,NEW.project_description,NEW.additional_info) ~* '(<script|javascript:|data:text/html)' THEN
    RAISE EXCEPTION 'Listing content is invalid';
  END IF;
  v_charge_result := public.deduct_credits_atomic(NEW.user_id, 5, 'COFOUNDER_POST', NULL, jsonb_build_object(
    'idempotencyKey', 'cofounder-post:' || NEW.id, 'operationId', 'cofounder-post:' || NEW.id,
    'listingId', NEW.id, 'source', 'cofounder_post_insert_trigger'
  ));
  IF NOT COALESCE((v_charge_result->>'success')::boolean, false) THEN RAISE EXCEPTION 'Insufficient credits. Publishing a co-founder post requires 5 credits.'; END IF;
  NEW.status := 'active';
  NEW.listing_type := COALESCE(NULLIF(NEW.listing_type,''),'building');
  NEW.headline := COALESCE(NULLIF(NEW.headline,''),NEW.project_name);
  NEW.summary := COALESCE(NULLIF(NEW.summary,''),NEW.project_description);
  NEW.startup_name := COALESCE(NULLIF(NEW.startup_name,''),NEW.project_name);
  NEW.industries := CASE WHEN cardinality(NEW.industries)>0 THEN NEW.industries WHEN NULLIF(NEW.industry,'') IS NOT NULL THEN ARRAY[NEW.industry] ELSE '{}'::text[] END;
  NEW.skills_sought := CASE WHEN cardinality(NEW.skills_sought)>0 THEN NEW.skills_sought ELSE NEW.looking_for END;
  NEW.published_at := now(); NEW.expires_at := now()+interval '30 days'; NEW.last_active_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_cofounder_listing_update_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF current_setting('app.cofounder_marketplace_rpc',true)='1' OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL OR OLD.user_id<>auth.uid() OR NEW.user_id<>OLD.user_id THEN RAISE EXCEPTION 'Unable to update this listing' USING ERRCODE='42501'; END IF;
  IF NEW.published_at IS DISTINCT FROM OLD.published_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN RAISE EXCEPTION 'Publishing and expiry dates can only change during a paid renewal'; END IF;
  IF OLD.status<>'active' AND NEW.status='active' THEN RAISE EXCEPTION 'Use the renewal action to reactivate this listing'; END IF;
  IF char_length(COALESCE(NEW.headline,NEW.project_name,''))>100 OR char_length(COALESCE(NEW.summary,NEW.project_description,''))>1200 THEN RAISE EXCEPTION 'Listing text exceeds marketplace limits'; END IF;
  IF cardinality(NEW.skills_offered)>12 OR cardinality(NEW.skills_sought)>12 OR cardinality(NEW.industries)>8 OR cardinality(NEW.founder_values)>8 THEN RAISE EXCEPTION 'Listing has too many structured values'; END IF;
  IF concat_ws(' ',NEW.headline,NEW.summary,NEW.project_name,NEW.project_description) ~* '(<script|javascript:|data:text/html)' THEN RAISE EXCEPTION 'Listing contains prohibited content'; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS guard_cofounder_listing_update_v1 ON public.cofounder_posts;
CREATE TRIGGER guard_cofounder_listing_update_v1 BEFORE UPDATE ON public.cofounder_posts FOR EACH ROW EXECUTE FUNCTION public.guard_cofounder_listing_update_v1();

CREATE OR REPLACE FUNCTION public.complete_onboarding_cofounder_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  UPDATE public.daily_tasks SET is_completed=true,completed_at=COALESCE(completed_at,now()),recommendation_status='accepted',updated_at=now()
  WHERE user_id=NEW.user_id AND recommendation_key='onboarding:find_cofounder' AND COALESCE(is_completed,false)=false;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_cofounder_marketplace_dashboard_task_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  INSERT INTO public.daily_tasks(user_id,task_text,task_description,task_date,task_source,priority,source_tool,source_route,intent_type,recommendation_key,recommendation_reason,recommendation_status,effort_estimate,business_impact_score,stage_alignment_score,ai_generated,is_foundational,is_completed)
  SELECT NEW.user_id,'Review your co-founder matches','Your listing is live. Review compatible founders and send one thoughtful interest request.',current_date,'platform','high','find_cofounder','/co-founder?tab=recommended','accountability','cofounder:review_matches:'||NEW.id,'A live listing becomes useful when you start a qualified conversation.','accepted',10,8,8,false,false,false
  WHERE NOT EXISTS(SELECT 1 FROM public.daily_tasks WHERE user_id=NEW.user_id AND recommendation_key='cofounder:review_matches:'||NEW.id AND COALESCE(is_completed,false)=false);
  INSERT INTO public.community_notifications(user_id,actor_id,notification_type,metadata)
  SELECT candidate.user_id,NEW.user_id,'cofounder_match_available',jsonb_build_object('listingId',NEW.id,'route','/co-founder?tab=recommended','message','A new compatible co-founder listing is available')
  FROM (
    SELECT DISTINCT profile.id user_id
    FROM public.profiles profile
    LEFT JOIN public.cofounder_posts own ON own.user_id=profile.id AND own.status='active' AND own.expires_at>now()
    WHERE profile.id<>NEW.user_id AND COALESCE(profile.profile_completion_percentage,0)>=60
      AND (profile.user_preferences->>'cofounderSituation'='actively_looking' OR own.id IS NOT NULL)
      AND (own.id IS NULL OR own.skills_sought&&NEW.skills_offered OR own.skills_offered&&NEW.skills_sought OR own.industries&&NEW.industries)
      AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=profile.id AND b.blocked_id=NEW.user_id) OR (b.blocker_id=NEW.user_id AND b.blocked_id=profile.id))
      AND NOT EXISTS(SELECT 1 FROM public.community_notifications n WHERE n.user_id=profile.id AND n.notification_type='cofounder_match_available' AND n.metadata->>'listingId'=NEW.id::text)
    ORDER BY profile.id LIMIT 50
  ) candidate;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_cofounder_marketplace_dashboard_task_v1 ON public.cofounder_posts;
CREATE TRIGGER sync_cofounder_marketplace_dashboard_task_v1 AFTER INSERT OR UPDATE OF status ON public.cofounder_posts
FOR EACH ROW EXECUTE FUNCTION public.sync_cofounder_marketplace_dashboard_task_v1();

CREATE OR REPLACE FUNCTION public.sync_cofounder_interest_dashboard_task_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.daily_tasks(user_id,task_text,task_description,task_date,task_source,priority,source_tool,source_route,intent_type,recommendation_key,recommendation_reason,recommendation_status,effort_estimate,business_impact_score,stage_alignment_score,ai_generated,is_foundational,is_completed)
  VALUES(NEW.recipient_id,'Respond to co-founder interest','A founder sent a qualified request about your listing.',current_date,'platform','high','find_cofounder','/co-founder?tab=requests','follow_up','cofounder:respond_interest:'||NEW.id,'A human response is waiting.','accepted',5,9,8,false,false,false);
  UPDATE public.daily_tasks SET is_completed=true,completed_at=COALESCE(completed_at,now()),updated_at=now()
  WHERE user_id=NEW.sender_id AND recommendation_key LIKE 'cofounder:review_matches:%' AND COALESCE(is_completed,false)=false;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_cofounder_interest_dashboard_task_v1 ON public.cofounder_interests;
CREATE TRIGGER sync_cofounder_interest_dashboard_task_v1 AFTER INSERT ON public.cofounder_interests
FOR EACH ROW EXECUTE FUNCTION public.sync_cofounder_interest_dashboard_task_v1();

CREATE OR REPLACE FUNCTION public.browse_cofounder_listings_v1(p_filters jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 20, p_cursor text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid(); v_items jsonb; v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
  SELECT COALESCE(jsonb_agg(item ORDER BY sort_time DESC, listing_id DESC), '[]'::jsonb) INTO v_items
  FROM (
    SELECT p.id listing_id, CASE WHEN p_filters->>'sort'='newest' THEN p.created_at ELSE p.last_active_at END sort_time,
      public.cofounder_listing_json(p, v_user IS NULL) ||
      CASE WHEN v_user IS NULL THEN '{}'::jsonb ELSE jsonb_build_object(
        'author', jsonb_strip_nulls(jsonb_build_object('fullName', pp.full_name, 'username', pp.username, 'avatarUrl', pp.avatar_url,
          'emailVerified', au.email_confirmed_at IS NOT NULL, 'profileComplete', COALESCE(pr.profile_completion_percentage,0) >= 60,
          'linkedInAdded', NULLIF(pr.linkedin_url,'') IS NOT NULL, 'githubAdded', NULLIF(pr.github_url,'') IS NOT NULL,
          'responsiveFounder',(SELECT count(*)>=3 AND avg(extract(epoch FROM (i.responded_at-i.created_at))/3600)<=72 FROM public.cofounder_interests i WHERE i.recipient_id=p.user_id AND i.status IN('accepted','declined') AND i.responded_at IS NOT NULL))),
        'saved', EXISTS (SELECT 1 FROM public.cofounder_listing_saves s WHERE s.user_id = v_user AND s.listing_id = p.id),
        'isOwner', p.user_id = v_user
      ) END AS item
    FROM public.cofounder_posts p
    LEFT JOIN public.public_profiles pp ON pp.id = p.user_id
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    LEFT JOIN auth.users au ON au.id = p.user_id
    WHERE p.status = 'active' AND p.expires_at > now()
      AND (v_user IS NULL OR p.user_id <> v_user OR COALESCE((p_filters->>'includeOwn')::boolean, false))
      AND (COALESCE(p_filters->>'listingId','') = '' OR p.id = (p_filters->>'listingId')::uuid)
      AND (COALESCE(p_filters->>'listingType','') = '' OR p.listing_type = p_filters->>'listingType')
      AND (COALESCE(p_filters->>'stage','') = '' OR p.stage = p_filters->>'stage')
      AND (COALESCE(p_filters->>'commitment','') = '' OR lower(COALESCE(p.commitment,'')) = lower(p_filters->>'commitment'))
      AND (COALESCE(p_filters->>'workMode','') = '' OR p.work_mode = p_filters->>'workMode')
      AND (COALESCE(p_filters->>'industry','') = '' OR p.industries @> ARRAY[p_filters->>'industry'])
      AND (COALESCE(p_filters->>'skill','') = '' OR p.skills_offered @> ARRAY[p_filters->>'skill'] OR p.skills_sought @> ARRAY[p_filters->>'skill'])
      AND (COALESCE(p_filters->>'location','') = '' OR p.location ILIKE '%' || replace(p_filters->>'location','%','') || '%')
      AND (COALESCE(p_filters->>'timezone','') = '' OR p.timezone = p_filters->>'timezone')
      AND (NOT COALESCE((p_filters->>'savedOnly')::boolean,false) OR EXISTS (SELECT 1 FROM public.cofounder_listing_saves saved WHERE saved.user_id=v_user AND saved.listing_id=p.id))
      AND (COALESCE(p_filters->>'query','') = '' OR concat_ws(' ',p.headline,p.summary,p.location,array_to_string(p.industries,' '),array_to_string(p.skills_offered,' '),array_to_string(p.skills_sought,' ')) ILIKE '%' || replace(p_filters->>'query','%','') || '%')
      AND (p_cursor IS NULL OR ((CASE WHEN p_filters->>'sort'='newest' THEN p.created_at ELSE p.last_active_at END), p.id) < (split_part(p_cursor,'|',1)::timestamptz, split_part(p_cursor,'|',2)::uuid))
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE v_user IS NOT NULL AND ((b.blocker_id=v_user AND b.blocked_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_id=v_user)))
    ORDER BY (CASE WHEN p_filters->>'sort'='newest' THEN p.created_at ELSE p.last_active_at END) DESC, p.id DESC LIMIT v_limit + 1
  ) q;
  RETURN jsonb_build_object('items', (SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) FROM jsonb_array_elements(v_items) WITH ORDINALITY e(value,n) WHERE n <= v_limit),
    'nextCursor', CASE WHEN jsonb_array_length(v_items) > v_limit THEN (CASE WHEN p_filters->>'sort'='newest' THEN v_items->(v_limit-1)->>'createdAt' ELSE v_items->(v_limit-1)->>'lastActiveAt' END) || '|' || (v_items->(v_limit-1)->>'id') ELSE NULL END);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_cofounder_listing_v1(p_listing_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_listing public.cofounder_posts;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_listing FROM public.cofounder_posts WHERE user_id=auth.uid() AND (p_listing_id IS NULL OR id=p_listing_id)
  ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 WHEN 'expired' THEN 2 WHEN 'paused' THEN 3 ELSE 4 END, updated_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN public.cofounder_listing_json(v_listing,false);
END; $$;

CREATE OR REPLACE FUNCTION public.get_cofounder_matches_v1(p_listing_id uuid DEFAULT NULL, p_filters jsonb DEFAULT '{}'::jsonb, p_limit integer DEFAULT 20, p_cursor text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid(); v_seed public.cofounder_posts; v_profile public.profiles; v_items jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_seed FROM public.cofounder_posts WHERE user_id=v_user AND (id=p_listing_id OR p_listing_id IS NULL) ORDER BY (status='active') DESC, updated_at DESC LIMIT 1;
  SELECT * INTO v_profile FROM public.profiles WHERE id=v_user;
  WITH candidates AS (
    SELECT p.*, pp.full_name, pp.username, pp.avatar_url, public.cofounder_listing_json(p, false) AS listing_json,
      LEAST(100,
        CASE WHEN (v_seed.id IS NOT NULL AND ((p.skills_offered && v_seed.skills_sought) OR (p.skills_sought && v_seed.skills_offered)))
          OR (v_seed.id IS NULL AND (p.skills_sought && ARRAY[COALESCE(v_profile.founder_role,'')] OR p.skills_offered && COALESCE(v_profile.looking_for,'{}'::text[]))) THEN 30 ELSE 0 END +
        CASE WHEN COALESCE(v_seed.stage,v_profile.startup_stage)=p.stage THEN 20 ELSE 8 END +
        CASE WHEN v_seed.commitment IS NOT NULL AND lower(v_seed.commitment)=lower(COALESCE(p.commitment,'')) THEN 15 ELSE 5 END +
        CASE WHEN COALESCE(v_seed.work_mode,'flexible')='flexible' OR p.work_mode='flexible' OR v_seed.work_mode=p.work_mode THEN 6 ELSE 0 END +
        CASE WHEN COALESCE(v_seed.timezone,'UTC')=p.timezone THEN 4 ELSE 0 END +
        CASE WHEN COALESCE(v_seed.industries,v_profile.startup_industry,'{}') && p.industries THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(v_seed.founder_values,'{}') && p.founder_values THEN 10 ELSE 0 END +
        CASE WHEN p.last_active_at >= now()-interval '7 days' THEN 5 WHEN p.last_active_at >= now()-interval '30 days' THEN 2 ELSE 0 END
      )::integer score
    FROM public.cofounder_posts p
    LEFT JOIN public.public_profiles pp ON pp.id=p.user_id
    JOIN public.profiles trust ON trust.id=p.user_id AND COALESCE(trust.profile_completion_percentage,0)>=60
    JOIN auth.users au ON au.id=p.user_id AND au.email_confirmed_at IS NOT NULL
    WHERE p.user_id<>v_user AND p.status='active' AND p.expires_at>now()
      AND (COALESCE(p_filters->>'listingType','')='' OR p.listing_type=p_filters->>'listingType')
      AND (COALESCE(p_filters->>'stage','')='' OR p.stage=p_filters->>'stage')
      AND (COALESCE(p_filters->>'commitment','')='' OR lower(COALESCE(p.commitment,''))=lower(p_filters->>'commitment'))
      AND (COALESCE(p_filters->>'workMode','')='' OR p.work_mode=p_filters->>'workMode')
      AND (COALESCE(p_filters->>'timezone','')='' OR p.timezone=p_filters->>'timezone')
      AND (COALESCE(p_filters->>'industry','')='' OR p.industries@>ARRAY[p_filters->>'industry'])
      AND (COALESCE(p_filters->>'skill','')='' OR p.skills_offered@>ARRAY[p_filters->>'skill'] OR p.skills_sought@>ARRAY[p_filters->>'skill'])
      AND (COALESCE(p_filters->>'location','')='' OR p.location ILIKE '%'||replace(p_filters->>'location','%','')||'%')
      AND (COALESCE(p_filters->>'query','')='' OR concat_ws(' ',p.headline,p.summary,p.location,array_to_string(p.industries,' '),array_to_string(p.skills_offered,' '),array_to_string(p.skills_sought,' ')) ILIKE '%'||replace(p_filters->>'query','%','')||'%')
      AND (NOT COALESCE((p_filters->>'savedOnly')::boolean,false) OR EXISTS(SELECT 1 FROM public.cofounder_listing_saves s WHERE s.user_id=v_user AND s.listing_id=p.id))
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=v_user AND b.blocked_id=p.user_id) OR (b.blocker_id=p.user_id AND b.blocked_id=v_user))
      AND NOT EXISTS (SELECT 1 FROM public.cofounder_interests i WHERE i.sender_id=v_user AND i.listing_id=p.id AND i.stop_recommending)
      AND NOT EXISTS (SELECT 1 FROM public.cofounder_match_feedback f WHERE f.user_id=v_user AND f.listing_id=p.id AND f.feedback='not_relevant')
  ), ranked AS (
    SELECT *, row_number() OVER (ORDER BY score DESC,last_active_at DESC,id DESC) rn FROM candidates
  )
  SELECT COALESCE(jsonb_agg(listing_json || jsonb_build_object(
    'author',jsonb_build_object('fullName',full_name,'username',username,'avatarUrl',avatar_url), 'score',score,
    'reasons', to_jsonb((array_remove(ARRAY[
      CASE WHEN (v_seed.id IS NOT NULL AND ((skills_offered && v_seed.skills_sought) OR (skills_sought && v_seed.skills_offered))) OR (v_seed.id IS NULL AND (skills_sought&&ARRAY[COALESCE(v_profile.founder_role,'')] OR skills_offered&&COALESCE(v_profile.looking_for,'{}'::text[]))) THEN 'complementary_skills' END,
      CASE WHEN COALESCE(v_seed.industries,v_profile.startup_industry,'{}') && industries THEN 'shared_industry' END,
      CASE WHEN COALESCE(v_seed.stage,v_profile.startup_stage)=stage THEN 'stage_alignment' END,
      CASE WHEN last_active_at>=now()-interval '7 days' THEN 'recently_active' END
    ],NULL))[1:3]) ORDER BY score DESC,last_active_at DESC,id DESC), '[]'::jsonb) INTO v_items
  FROM ranked r WHERE rn<=LEAST(GREATEST(COALESCE(p_limit,20),1),50);
  RETURN jsonb_build_object('items',v_items,'nextCursor',NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_cofounder_interest_v1(p_listing_id uuid, p_reason_code text, p_introduction text, p_availability_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_listing public.cofounder_posts; v_interest public.cofounder_interests;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  PERFORM public.cofounder_marketplace_assert_trust(v_user);
  SELECT * INTO v_listing FROM public.cofounder_posts WHERE id=p_listing_id AND status='active' AND expires_at>now() FOR SHARE;
  IF NOT FOUND OR v_listing.user_id=v_user THEN RAISE EXCEPTION 'Listing is unavailable'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=v_user AND b.blocked_id=v_listing.user_id) OR (b.blocker_id=v_listing.user_id AND b.blocked_id=v_user)) THEN RAISE EXCEPTION 'Unable to contact this founder'; END IF;
  IF (SELECT count(*) FROM public.cofounder_interests WHERE sender_id=v_user AND created_at>now()-interval '24 hours')>=10 THEN RAISE EXCEPTION 'Daily interest limit reached'; END IF;
  UPDATE public.cofounder_interests SET status='expired',updated_at=now() WHERE sender_id=v_user AND listing_id=p_listing_id AND status='pending' AND expires_at<=now();
  INSERT INTO public.cofounder_interests(listing_id,sender_id,recipient_id,reason_code,introduction,availability_note)
  VALUES(p_listing_id,v_user,v_listing.user_id,p_reason_code,trim(p_introduction),trim(p_availability_note)) RETURNING * INTO v_interest;
  INSERT INTO public.community_notifications(user_id,actor_id,notification_type,metadata)
  VALUES(v_listing.user_id,v_user,'cofounder_interest_received',jsonb_build_object('interestId',v_interest.id,'listingId',p_listing_id,'route','/co-founder?tab=requests','message','A founder sent you a co-founder interest request'));
  INSERT INTO public.user_activity_log(user_id,activity_type,activity_data,event_key,source_tool,source_entity_type,source_entity_id,page_path)
  VALUES(v_user,'cofounder_interest_sent',jsonb_build_object('listingId',p_listing_id),v_interest.id::text||':sent','cofounder_marketplace','cofounder_interest',v_interest.id,'/co-founder')
  ON CONFLICT(user_id,event_key) DO NOTHING;
  RETURN to_jsonb(v_interest);
END; $$;

CREATE OR REPLACE FUNCTION public.respond_cofounder_interest_v1(p_interest_id uuid, p_action text, p_stop_recommending boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_interest public.cofounder_interests; v_conversation public.conversations; v_status text;
BEGIN
  IF p_action NOT IN ('accept','decline') THEN RAISE EXCEPTION 'Invalid response'; END IF;
  SELECT * INTO v_interest FROM public.cofounder_interests WHERE id=p_interest_id AND recipient_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Interest not found'; END IF;
  IF v_interest.status<>'pending' OR v_interest.expires_at<=now() THEN RAISE EXCEPTION 'Interest is no longer pending'; END IF;
  v_status:=CASE WHEN p_action='accept' THEN 'accepted' ELSE 'declined' END;
  IF p_action='accept' THEN
    SELECT * INTO v_conversation FROM public.create_or_get_direct_conversation(v_interest.sender_id);
    INSERT INTO public.messages(conversation_id,sender_id,content,attachments,message_type)
    VALUES(v_conversation.id,v_interest.sender_id,v_interest.introduction,jsonb_build_object('kind','cofounder_interest','listingId',v_interest.listing_id,'interestId',v_interest.id),'text');
  END IF;
  UPDATE public.cofounder_interests SET status=v_status,stop_recommending=p_stop_recommending,conversation_id=v_conversation.id,responded_at=now(),updated_at=now()
  WHERE id=p_interest_id RETURNING * INTO v_interest;
  UPDATE public.daily_tasks SET is_completed=true,completed_at=COALESCE(completed_at,now()),updated_at=now()
  WHERE user_id=v_user AND recommendation_key='cofounder:respond_interest:'||v_interest.id AND COALESCE(is_completed,false)=false;
  INSERT INTO public.community_notifications(user_id,actor_id,notification_type,conversation_id,metadata)
  VALUES(v_interest.sender_id,v_user,'cofounder_interest_'||v_status,v_conversation.id,jsonb_build_object('interestId',v_interest.id,'listingId',v_interest.listing_id,'route',CASE WHEN v_conversation.id IS NULL THEN '/co-founder?tab=requests' ELSE '/messages?conversationId='||v_conversation.id END,'message',CASE WHEN v_status='accepted' THEN 'Your co-founder interest request was accepted' ELSE 'Your co-founder interest request was declined' END));
  INSERT INTO public.user_activity_log(user_id,activity_type,activity_data,event_key,source_tool,source_entity_type,source_entity_id,page_path)
  VALUES(v_user,'cofounder_interest_'||v_status,jsonb_build_object('listingId',v_interest.listing_id),v_interest.id::text||':'||v_status,'cofounder_marketplace','cofounder_interest',v_interest.id,'/co-founder')
  ON CONFLICT(user_id,event_key) DO NOTHING;
  RETURN to_jsonb(v_interest);
END; $$;

CREATE OR REPLACE FUNCTION public.withdraw_cofounder_interest_v1(p_interest_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.cofounder_interests SET status='withdrawn',updated_at=now() WHERE id=p_interest_id AND sender_id=auth.uid() AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Pending interest not found'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.block_cofounder_interest_v1(p_interest_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_interest public.cofounder_interests; v_user uuid:=auth.uid();
BEGIN
  SELECT * INTO v_interest FROM public.cofounder_interests WHERE id=p_interest_id AND recipient_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Interest not found'; END IF;
  INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(v_user,v_interest.sender_id) ON CONFLICT(blocker_id,blocked_id) DO NOTHING;
  UPDATE public.cofounder_interests SET status='blocked',responded_at=COALESCE(responded_at,now()),updated_at=now() WHERE id=p_interest_id;
  UPDATE public.daily_tasks SET is_completed=true,completed_at=COALESCE(completed_at,now()),updated_at=now()
  WHERE user_id=v_user AND recommendation_key='cofounder:respond_interest:'||p_interest_id AND COALESCE(is_completed,false)=false;
END; $$;

CREATE OR REPLACE FUNCTION public.report_cofounder_target_v1(p_listing_id uuid DEFAULT NULL,p_interest_id uuid DEFAULT NULL,p_category text DEFAULT 'other',p_explanation text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_reported uuid; v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF p_category NOT IN('spam','scam','harassment','misleading_information','inappropriate_content','other') THEN RAISE EXCEPTION 'Invalid report category'; END IF;
  IF char_length(COALESCE(p_explanation,''))>1000 THEN RAISE EXCEPTION 'Report explanation is too long'; END IF;
  IF p_listing_id IS NOT NULL THEN SELECT user_id INTO v_reported FROM public.cofounder_posts WHERE id=p_listing_id; END IF;
  IF p_interest_id IS NOT NULL THEN SELECT CASE WHEN sender_id=v_user THEN recipient_id ELSE sender_id END INTO v_reported FROM public.cofounder_interests WHERE id=p_interest_id AND v_user IN(sender_id,recipient_id); END IF;
  IF v_reported IS NULL OR v_reported=v_user THEN RAISE EXCEPTION 'Invalid report target'; END IF;
  INSERT INTO public.cofounder_reports(reporter_id,listing_id,interest_id,reported_user_id,category,explanation)
  VALUES(v_user,p_listing_id,p_interest_id,v_reported,p_category,NULLIF(trim(p_explanation),'')) RETURNING id INTO v_id;
  INSERT INTO public.user_activity_log(user_id,activity_type,activity_data,event_key,source_tool,source_entity_type,source_entity_id,page_path)
  VALUES(v_user,'cofounder_listing_reported',jsonb_build_object('category',p_category),v_id::text||':reported','cofounder_marketplace','cofounder_report',v_id,'/co-founder')
  ON CONFLICT(user_id,event_key) DO NOTHING;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.moderate_cofounder_report_v1(p_report_id uuid,p_status text,p_resolution_note text DEFAULT NULL,p_hide_listing boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_report public.cofounder_reports;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  IF p_status NOT IN('reviewing','resolved','dismissed') THEN RAISE EXCEPTION 'Invalid moderation status'; END IF;
  UPDATE public.cofounder_reports SET status=p_status,resolution_note=NULLIF(trim(p_resolution_note),''),resolved_by=CASE WHEN p_status IN('resolved','dismissed') THEN auth.uid() ELSE NULL END,resolved_at=CASE WHEN p_status IN('resolved','dismissed') THEN now() ELSE NULL END
  WHERE id=p_report_id RETURNING * INTO v_report;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF p_hide_listing AND v_report.listing_id IS NOT NULL THEN UPDATE public.cofounder_posts SET status='archived',updated_at=now() WHERE id=v_report.listing_id; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.expire_cofounder_marketplace_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_listings integer; v_interests integer;
BEGIN
  PERFORM set_config('app.cofounder_marketplace_rpc','1',true);
  UPDATE public.cofounder_posts SET status='expired',updated_at=now() WHERE status='active' AND expires_at<=now(); GET DIAGNOSTICS v_listings=ROW_COUNT;
  UPDATE public.daily_tasks t SET recommendation_status='dismissed',dismissed_at=COALESCE(dismissed_at,now()),updated_at=now()
  FROM public.cofounder_posts p WHERE p.user_id=t.user_id AND p.status='expired' AND t.recommendation_key='cofounder:review_matches:'||p.id AND COALESCE(t.is_completed,false)=false;
  UPDATE public.cofounder_interests SET status='expired',updated_at=now() WHERE status='pending' AND expires_at<=now(); GET DIAGNOSTICS v_interests=ROW_COUNT;
  RETURN jsonb_build_object('listings',v_listings,'interests',v_interests);
END; $$;

CREATE OR REPLACE FUNCTION public.nudge_cofounder_listing_expiry_v1()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_count integer:=0;
BEGIN
  INSERT INTO public.community_notifications(user_id,actor_id,notification_type,metadata)
  SELECT p.user_id,p.user_id,'cofounder_listing_expiring',jsonb_build_object('listingId',p.id,'daysRemaining',(p.expires_at::date-current_date),'route','/co-founder?tab=mine','message','Your co-founder listing expires soon')
  FROM public.cofounder_posts p
  WHERE p.status='active' AND p.expires_at::date-current_date IN (7,1)
    AND NOT EXISTS(SELECT 1 FROM public.community_notifications n WHERE n.user_id=p.user_id AND n.notification_type='cofounder_listing_expiring' AND n.metadata->>'listingId'=p.id::text AND n.metadata->>'daysRemaining'=(p.expires_at::date-current_date)::text);
  GET DIAGNOSTICS v_count=ROW_COUNT;
  INSERT INTO public.daily_tasks(user_id,task_text,task_description,task_date,task_source,priority,source_tool,source_route,intent_type,recommendation_key,recommendation_reason,recommendation_status,effort_estimate,business_impact_score,stage_alignment_score,ai_generated,is_foundational,is_completed)
  SELECT p.user_id,'Renew or pause your co-founder listing','Your listing expires soon. Renew for 5 credits or pause it if you are no longer looking.',current_date,'platform','medium','find_cofounder','/co-founder?tab=mine','follow_up','cofounder:listing_expiry:'||p.id,'Keep marketplace availability accurate.','accepted',5,6,6,false,false,false
  FROM public.cofounder_posts p WHERE p.status='active' AND p.expires_at::date-current_date=1
    AND NOT EXISTS(SELECT 1 FROM public.daily_tasks t WHERE t.user_id=p.user_id AND t.recommendation_key='cofounder:listing_expiry:'||p.id AND COALESCE(t.is_completed,false)=false);
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.get_cofounder_marketplace_admin_v1(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object(
    'activeListings',(SELECT count(*) FROM public.cofounder_posts WHERE status='active' AND expires_at>now()),
    'listingsByType',(SELECT COALESCE(jsonb_object_agg(listing_type,total),'{}') FROM (SELECT listing_type,count(*) total FROM public.cofounder_posts WHERE created_at BETWEEN p_from AND p_to GROUP BY listing_type) s),
    'newListings',(SELECT count(*) FROM public.cofounder_posts WHERE published_at BETWEEN p_from AND p_to),
    'saves',(SELECT count(*) FROM public.cofounder_listing_saves WHERE created_at BETWEEN p_from AND p_to),
    'interests',(SELECT count(*) FROM public.cofounder_interests WHERE created_at BETWEEN p_from AND p_to),
    'uniqueMarketplaceUsers',(SELECT count(DISTINCT user_id) FROM public.user_activity_log WHERE source_tool='cofounder_marketplace' AND created_at BETWEEN p_from AND p_to),
    'listingViews',(SELECT count(*) FROM public.user_activity_log WHERE activity_type='cofounder_listing_viewed' AND created_at BETWEEN p_from AND p_to),
    'detailToInterestRate',(SELECT round(100.0*(SELECT count(*) FROM public.cofounder_interests WHERE created_at BETWEEN p_from AND p_to)/NULLIF((SELECT count(*) FROM public.user_activity_log WHERE activity_type='cofounder_listing_viewed' AND created_at BETWEEN p_from AND p_to),0),1)),
    'acceptanceRate',(SELECT round(100.0*count(*) FILTER(WHERE status='accepted')/NULLIF(count(*) FILTER(WHERE status IN('accepted','declined')),0),1) FROM public.cofounder_interests WHERE created_at BETWEEN p_from AND p_to),
    'medianResponseHours',(SELECT round((extract(epoch FROM percentile_cont(0.5) WITHIN GROUP(ORDER BY responded_at-created_at))/3600)::numeric,1) FROM public.cofounder_interests WHERE responded_at IS NOT NULL AND created_at BETWEEN p_from AND p_to),
    'acceptedToConversationRate',(SELECT round(100.0*count(*) FILTER(WHERE conversation_id IS NOT NULL)/NULLIF(count(*) FILTER(WHERE status='accepted'),0),1) FROM public.cofounder_interests WHERE created_at BETWEEN p_from AND p_to),
    'expiredWithoutInterestRate',(SELECT round(100.0*count(*) FILTER(WHERE p.status='expired' AND NOT EXISTS(SELECT 1 FROM public.cofounder_interests i WHERE i.listing_id=p.id))/NULLIF(count(*) FILTER(WHERE p.status='expired'),0),1) FROM public.cofounder_posts p WHERE p.updated_at BETWEEN p_from AND p_to),
    'reportRate',(SELECT round(100.0*(SELECT count(*) FROM public.cofounder_reports WHERE created_at BETWEEN p_from AND p_to)/NULLIF((SELECT count(*) FROM public.cofounder_interests WHERE created_at BETWEEN p_from AND p_to),0),1)),
    'openReports',(SELECT count(*) FROM public.cofounder_reports WHERE status IN('open','reviewing')),
    'breakdownByPlan',(SELECT COALESCE(jsonb_object_agg(plan,total),'{}') FROM(SELECT COALESCE(pr.subscription_tier,'rookie') plan,count(DISTINCT a.user_id) total FROM public.user_activity_log a JOIN public.profiles pr ON pr.id=a.user_id WHERE a.source_tool='cofounder_marketplace' AND a.created_at BETWEEN p_from AND p_to GROUP BY 1)s),
    'breakdownByStage',(SELECT COALESCE(jsonb_object_agg(stage,total),'{}') FROM(SELECT COALESCE(pr.startup_stage,'unknown') stage,count(DISTINCT a.user_id) total FROM public.user_activity_log a JOIN public.profiles pr ON pr.id=a.user_id WHERE a.source_tool='cofounder_marketplace' AND a.created_at BETWEEN p_from AND p_to GROUP BY 1)s),
    'breakdownByCountry',(SELECT COALESCE(jsonb_object_agg(country,total),'{}') FROM(SELECT COALESCE(pr.country,'unknown') country,count(DISTINCT a.user_id) total FROM public.user_activity_log a JOIN public.profiles pr ON pr.id=a.user_id WHERE a.source_tool='cofounder_marketplace' AND a.created_at BETWEEN p_from AND p_to GROUP BY 1)s)
  );
END; $$;

-- Restrict direct writes: mutations go through audited RPCs except saves/reports under RLS.
REVOKE ALL ON public.cofounder_interests FROM anon, authenticated;
GRANT SELECT ON public.cofounder_interests TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.cofounder_listing_saves TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cofounder_match_feedback TO authenticated;
GRANT SELECT ON public.cofounder_reports TO authenticated;

GRANT EXECUTE ON FUNCTION public.browse_cofounder_listings_v1(jsonb,integer,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_cofounder_listing_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cofounder_matches_v1(uuid,jsonb,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_cofounder_listing_v2(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_cofounder_listing_draft_v2(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_cofounder_listing_v2(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renew_cofounder_listing_v2(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_cofounder_listing_status_v2(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_cofounder_interest_v1(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_cofounder_interest_v1(uuid,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_cofounder_interest_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_cofounder_interest_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_cofounder_target_v1(uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_cofounder_report_v1(uuid,text,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cofounder_marketplace_admin_v1(timestamptz,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.expire_cofounder_marketplace_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.nudge_cofounder_listing_expiry_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cofounder_marketplace_assert_trust(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cofounder_marketplace_validate_listing(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cofounder_listing_json(public.cofounder_posts,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_cofounder_marketplace_dashboard_task_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_cofounder_interest_dashboard_task_v1() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_cofounder_listing_update_v1() FROM PUBLIC,anon,authenticated;

-- The old global broadcast produced noisy, irrelevant notifications.
DROP TRIGGER IF EXISTS on_new_cofounder_post_notify_all_users ON public.cofounder_posts;

COMMENT ON FUNCTION public.publish_cofounder_listing_v2(jsonb,text) IS 'Publishes one active co-founder listing and atomically charges five credits with caller-provided idempotency.';
COMMENT ON FUNCTION public.get_cofounder_matches_v1(uuid,jsonb,integer,text) IS 'Returns deterministic, explainable co-founder matches without AI or credit usage.';

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM cron.job WHERE jobname='cofounder-marketplace-daily-maintenance') THEN
    PERFORM cron.unschedule('cofounder-marketplace-daily-maintenance');
  END IF;
END $$;
SELECT cron.schedule('cofounder-marketplace-daily-maintenance','15 13 * * *',$job$
  SELECT public.nudge_cofounder_listing_expiry_v1();
  SELECT public.expire_cofounder_marketplace_v1();
$job$);
