-- First-30-day engagement foundation.
-- Adds durable Insighta follow-ups and one cross-product return-cue contract.

CREATE TABLE IF NOT EXISTS public.insighta_pipeline_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('vc', 'accelerator')),
  entity_id text NOT NULL CHECK (length(entity_id) BETWEEN 1 AND 160),
  entity_label text NOT NULL CHECK (char_length(entity_label) BETWEEN 1 AND 240),
  entity_route text NOT NULL CHECK (entity_route LIKE '/%' AND char_length(entity_route) <= 500),
  status text NOT NULL DEFAULT 'saved' CHECK (status IN (
    'saved', 'researching', 'ready_to_contact', 'contacted', 'replied', 'meeting', 'closed'
  )),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
  next_action_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS insighta_pipeline_due_idx
  ON public.insighta_pipeline_items (user_id, next_action_at)
  WHERE next_action_at IS NOT NULL AND status NOT IN ('closed');

ALTER TABLE public.insighta_pipeline_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS insighta_pipeline_select_own ON public.insighta_pipeline_items;
CREATE POLICY insighta_pipeline_select_own ON public.insighta_pipeline_items
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS insighta_pipeline_insert_own ON public.insighta_pipeline_items;
CREATE POLICY insighta_pipeline_insert_own ON public.insighta_pipeline_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS insighta_pipeline_update_own ON public.insighta_pipeline_items;
CREATE POLICY insighta_pipeline_update_own ON public.insighta_pipeline_items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS insighta_pipeline_delete_own ON public.insighta_pipeline_items;
CREATE POLICY insighta_pipeline_delete_own ON public.insighta_pipeline_items
  FOR DELETE USING (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insighta_pipeline_items TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_return_cues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_section text NOT NULL CHECK (source_section IN (
    'dashboard', 'bizmap', 'insighta', 'network', 'resources'
  )),
  entity_type text,
  entity_id text,
  reason_key text NOT NULL CHECK (reason_key ~ '^[a-z][a-z0-9_]{2,80}$'),
  scheduled_for timestamptz NOT NULL,
  cta_url text NOT NULL CHECK (cta_url LIKE '/%' AND char_length(cta_url) <= 500),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'completed', 'dismissed', 'cancelled', 'expired'
  )),
  dedupe_key text NOT NULL CHECK (char_length(dedupe_key) BETWEEN 3 AND 180),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  in_app_delivered_at timestamptz,
  email_delivered_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS user_return_cues_due_idx
  ON public.user_return_cues (scheduled_for, user_id)
  WHERE status = 'scheduled';

ALTER TABLE public.user_return_cues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_return_cues_select_own ON public.user_return_cues;
CREATE POLICY user_return_cues_select_own ON public.user_return_cues
  FOR SELECT USING (auth.uid() = user_id);
REVOKE ALL ON public.user_return_cues FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_return_cues TO authenticated;
GRANT ALL ON public.user_return_cues TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_user_return_cue_v1(
  p_source_section text,
  p_entity_type text,
  p_entity_id text,
  p_reason_key text,
  p_scheduled_for timestamptz,
  p_cta_url text,
  p_dedupe_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.user_return_cues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_result public.user_return_cues;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF p_source_section NOT IN ('dashboard', 'bizmap', 'insighta', 'network', 'resources')
     OR p_reason_key !~ '^[a-z][a-z0-9_]{2,80}$'
     OR p_cta_url NOT LIKE '/%'
     OR char_length(p_cta_url) > 500
     OR char_length(p_dedupe_key) NOT BETWEEN 3 AND 180
     OR p_scheduled_for < now() - interval '5 minutes'
     OR p_scheduled_for > now() + interval '1 year' THEN
    RAISE EXCEPTION 'Invalid return cue';
  END IF;

  INSERT INTO public.user_return_cues (
    user_id, source_section, entity_type, entity_id, reason_key,
    scheduled_for, cta_url, dedupe_key, metadata
  ) VALUES (
    v_user, p_source_section, NULLIF(p_entity_type, ''), NULLIF(p_entity_id, ''),
    p_reason_key, p_scheduled_for, p_cta_url, p_dedupe_key,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (user_id, dedupe_key) DO UPDATE SET
    scheduled_for = EXCLUDED.scheduled_for,
    cta_url = EXCLUDED.cta_url,
    metadata = EXCLUDED.metadata,
    status = 'scheduled',
    completed_at = NULL,
    updated_at = now()
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_user_return_cue_v1(p_cue_id uuid)
RETURNS public.user_return_cues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result public.user_return_cues;
BEGIN
  UPDATE public.user_return_cues
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_cue_id AND user_id = auth.uid() AND status = 'scheduled'
  RETURNING * INTO v_result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Return cue not found' USING ERRCODE = 'P0002'; END IF;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_user_return_cue_v1(text,text,text,text,timestamptz,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_user_return_cue_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_return_cue_v1(text,text,text,text,timestamptz,text,text,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_user_return_cue_v1(uuid) TO authenticated, service_role;

-- Dashboard V2 remains additive: V1 consumers keep working while the new UI rolls out.
CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot_v2(p_timezone text DEFAULT 'UTC')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_v1 jsonb;
  v_active_days integer := 0;
  v_meaningful_actions integer := 0;
  v_next_cue jsonb := NULL;
  v_due_pipeline jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  v_v1 := public.get_dashboard_snapshot_v1(p_timezone);

  SELECT count(DISTINCT created_at::date), count(*)
  INTO v_active_days, v_meaningful_actions
  FROM public.user_activity_log
  WHERE user_id = v_user AND created_at >= now() - interval '7 days';

  SELECT to_jsonb(cue) INTO v_next_cue
  FROM (
    SELECT id, source_section AS "sourceSection", reason_key AS "reasonKey",
           scheduled_for AS "scheduledFor", cta_url AS "ctaUrl"
    FROM public.user_return_cues
    WHERE user_id = v_user AND status = 'scheduled'
    ORDER BY scheduled_for ASC LIMIT 1
  ) cue;

  SELECT COALESCE(jsonb_agg(to_jsonb(item) ORDER BY item."nextActionAt"), '[]'::jsonb)
  INTO v_due_pipeline
  FROM (
    SELECT id, entity_type AS "entityType", entity_id AS "entityId",
           entity_label AS "entityLabel", entity_route AS "entityRoute", status,
           next_action_at AS "nextActionAt"
    FROM public.insighta_pipeline_items
    WHERE user_id = v_user AND status <> 'closed' AND next_action_at IS NOT NULL
      AND next_action_at <= now() + interval '7 days'
    ORDER BY next_action_at ASC LIMIT 10
  ) item;

  RETURN (v_v1 - 'version') || jsonb_build_object(
    'version', 2,
    'engagement', jsonb_build_object(
      'activeDays7', v_active_days,
      'meaningfulActions7', v_meaningful_actions,
      'weeklyGoal', 3,
      'nextReturnCue', v_next_cue
    ),
    'crossSectionFollowUps', jsonb_build_object('insighta', v_due_pipeline)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_snapshot_v2(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot_v2(text) TO authenticated, service_role;
