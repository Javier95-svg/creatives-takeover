-- GTM Strategist V2: versioned plans, durable plays, directory activation,
-- weekly reviews, and exact Traction Engine source relationships.

ALTER TABLE public.gtm_plans
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.gtm_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  plan_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  research_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  research_status text NOT NULL DEFAULT 'unavailable' CHECK (research_status IN ('complete', 'limited', 'unavailable')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, version)
);

CREATE TABLE IF NOT EXISTS public.gtm_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  plan_version_id uuid REFERENCES public.gtm_plan_versions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  channel_name text NOT NULL,
  rank integer NOT NULL DEFAULT 1 CHECK (rank > 0),
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'active', 'paused', 'completed')),
  play_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gtm_directory_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  play_id uuid NOT NULL REFERENCES public.gtm_plays(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  directory_id text NOT NULL,
  status text NOT NULL DEFAULT 'recommended' CHECK (status IN ('recommended', 'visited', 'submitted', 'live', 'skipped')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(play_id, directory_id)
);

CREATE TABLE IF NOT EXISTS public.gtm_weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  play_id uuid REFERENCES public.gtm_plays(id) ON DELETE SET NULL,
  traction_experiment_id uuid REFERENCES public.traction_engine_experiments(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  decision text NOT NULL CHECK (decision IN ('collect_evidence', 'double_down', 'iterate', 'kill')),
  next_best_action text NOT NULL,
  evidence_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, week_start)
);

ALTER TABLE public.traction_engine_sprints
  ADD COLUMN IF NOT EXISTS source_gtm_plan_id uuid REFERENCES public.gtm_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_gtm_play_id uuid REFERENCES public.gtm_plays(id) ON DELETE SET NULL;

ALTER TABLE public.directory_views
  ADD COLUMN IF NOT EXISTS gtm_plan_id uuid REFERENCES public.gtm_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gtm_play_id uuid REFERENCES public.gtm_plays(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.update_gtm_v2_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_gtm_plan_versions_user_plan ON public.gtm_plan_versions(user_id, plan_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_gtm_plays_user_plan ON public.gtm_plays(user_id, plan_id, status, rank);
CREATE INDEX IF NOT EXISTS idx_gtm_directory_actions_user_plan ON public.gtm_directory_actions(user_id, plan_id, status);
CREATE INDEX IF NOT EXISTS idx_gtm_weekly_reviews_user_plan ON public.gtm_weekly_reviews(user_id, plan_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_traction_sprints_gtm_play ON public.traction_engine_sprints(source_gtm_play_id) WHERE source_gtm_play_id IS NOT NULL;

-- One RPC keeps the current snapshot, immutable version, plays, and directory
-- recommendations in the same database transaction. It is callable only by
-- the service role used by the authenticated Edge Function.
CREATE OR REPLACE FUNCTION public.persist_gtm_plan_v2(
  p_user_id uuid,
  p_plan_id uuid,
  p_plan_title text,
  p_plan_content jsonb,
  p_research_sources jsonb,
  p_research_status text,
  p_plays jsonb
)
RETURNS TABLE(plan_id uuid, version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_version integer;
  v_version_id uuid := gen_random_uuid();
  v_content jsonb;
BEGIN
  IF p_research_status NOT IN ('complete', 'limited', 'unavailable') THEN
    RAISE EXCEPTION 'Invalid GTM research status';
  END IF;
  IF jsonb_typeof(p_plays) <> 'array' OR jsonb_array_length(p_plays) < 2 THEN
    RAISE EXCEPTION 'A GTM plan requires at least two plays';
  END IF;

  IF p_plan_id IS NULL THEN
    INSERT INTO public.gtm_plans(user_id, plan_title, plan_content, status, schema_version, current_version)
    VALUES (p_user_id, p_plan_title, '{}'::jsonb, 'draft', 2, 1)
    RETURNING id INTO v_plan_id;
    v_version := 1;
  ELSE
    SELECT id, current_version + 1 INTO v_plan_id, v_version
    FROM public.gtm_plans
    WHERE id = p_plan_id AND user_id = p_user_id
    FOR UPDATE;
    IF v_plan_id IS NULL THEN RAISE EXCEPTION 'GTM plan not found'; END IF;
    UPDATE public.gtm_plays SET status = 'paused'
    WHERE plan_id = v_plan_id AND user_id = p_user_id AND status IN ('active', 'backlog');
  END IF;

  v_content := jsonb_set(
    jsonb_set(p_plan_content, '{planId}', to_jsonb(v_plan_id::text), true),
    '{version}', to_jsonb(v_version), true
  );

  UPDATE public.gtm_plans
  SET plan_title = p_plan_title, plan_content = v_content, status = 'draft',
      schema_version = 2, current_version = v_version, updated_at = now()
  WHERE id = v_plan_id AND user_id = p_user_id;

  INSERT INTO public.gtm_plan_versions(id, plan_id, user_id, version, plan_content, research_sources, research_status)
  VALUES (v_version_id, v_plan_id, p_user_id, v_version, v_content, COALESCE(p_research_sources, '[]'::jsonb), p_research_status);

  INSERT INTO public.gtm_plays(id, plan_id, plan_version_id, user_id, channel_id, channel_name, rank, status, play_content)
  SELECT
    (play->>'id')::uuid, v_plan_id, v_version_id, p_user_id,
    play->>'channelId', play->>'channelName', ordinality::integer,
    CASE WHEN play->>'status' IN ('backlog', 'active', 'paused', 'completed') THEN play->>'status' ELSE 'backlog' END,
    play
  FROM jsonb_array_elements(p_plays) WITH ORDINALITY AS value(play, ordinality);

  INSERT INTO public.gtm_directory_actions(plan_id, play_id, user_id, directory_id, status)
  SELECT v_plan_id, (play->>'id')::uuid, p_user_id, directory_id #>> '{}', 'recommended'
  FROM jsonb_array_elements(p_plays) AS value(play)
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(play->'recommendedDirectoryIds', '[]'::jsonb)) AS directory(directory_id);

  RETURN QUERY SELECT v_plan_id, v_version;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_gtm_plan_v2(uuid, uuid, text, jsonb, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_gtm_plan_v2(uuid, uuid, text, jsonb, jsonb, text, jsonb) TO service_role;

ALTER TABLE public.gtm_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_directory_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own GTM plan versions" ON public.gtm_plan_versions;
CREATE POLICY "Users manage own GTM plan versions" ON public.gtm_plan_versions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own GTM plays" ON public.gtm_plays;
CREATE POLICY "Users manage own GTM plays" ON public.gtm_plays FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own GTM directory actions" ON public.gtm_directory_actions;
CREATE POLICY "Users manage own GTM directory actions" ON public.gtm_directory_actions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own GTM weekly reviews" ON public.gtm_weekly_reviews;
CREATE POLICY "Users manage own GTM weekly reviews" ON public.gtm_weekly_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_gtm_plays_updated_at ON public.gtm_plays;
CREATE TRIGGER update_gtm_plays_updated_at BEFORE UPDATE ON public.gtm_plays FOR EACH ROW EXECUTE FUNCTION public.update_gtm_v2_updated_at();
DROP TRIGGER IF EXISTS update_gtm_directory_actions_updated_at ON public.gtm_directory_actions;
CREATE TRIGGER update_gtm_directory_actions_updated_at BEFORE UPDATE ON public.gtm_directory_actions FOR EACH ROW EXECUTE FUNCTION public.update_gtm_v2_updated_at();
DROP TRIGGER IF EXISTS update_gtm_weekly_reviews_updated_at ON public.gtm_weekly_reviews;
CREATE TRIGGER update_gtm_weekly_reviews_updated_at BEFORE UPDATE ON public.gtm_weekly_reviews FOR EACH ROW EXECUTE FUNCTION public.update_gtm_v2_updated_at();
