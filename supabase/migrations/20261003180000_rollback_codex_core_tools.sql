-- Roll back the database changes from the Codex core-tools upgrade
-- (commits 43080c71..d2178fc1, migrations 20260930160000..20261001161000) that
-- break the restored pre-Codex code. Those migrations were applied to
-- production outside the migration ledger, so they stay in the repository as
-- history; the tables they created are left in place, unused.
--
-- What this restores:
--   1. Traction Engine: the one-log-per-week rule the scorecard upsert needs
--      (onConflict user_id,week_start_date) and the active-sprint channel index.
--   2. Published MVP sites read the project's files again, not the Codex
--      release table that the restored publish flow never writes to.
--   3. GTM play activation runs the pre-Codex function body.
--   4. Codex-only publish guard and scheduled jobs are removed.

BEGIN;

-- 1. Traction Engine ---------------------------------------------------------
DO $$
DECLARE v_dupes integer;
BEGIN
  SELECT count(*) INTO v_dupes FROM (
    SELECT user_id, week_start_date FROM public.traction_engine_weekly_logs
    GROUP BY user_id, week_start_date HAVING count(*) > 1
  ) d;
  IF v_dupes > 0 THEN
    RAISE EXCEPTION 'Rollback stopped: % user/week pairs have more than one weekly log (created per product by the Codex version). Resolve them before restoring the weekly rule.', v_dupes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'traction_engine_weekly_logs_user_id_week_start_date_key'
      AND conrelid = 'public.traction_engine_weekly_logs'::regclass
  ) THEN
    ALTER TABLE public.traction_engine_weekly_logs
      ADD CONSTRAINT traction_engine_weekly_logs_user_id_week_start_date_key UNIQUE (user_id, week_start_date);
  END IF;
END $$;

DROP INDEX IF EXISTS public.traction_product_week;
DROP INDEX IF EXISTS public.traction_unassigned_week;
DROP INDEX IF EXISTS public.traction_product_channel;
DROP INDEX IF EXISTS public.traction_unassigned_channel;
CREATE UNIQUE INDEX IF NOT EXISTS traction_engine_sprints_active_channel_idx
  ON public.traction_engine_sprints(user_id, lower(channel))
  WHERE status = 'active';

-- 2. Published MVP files ----------------------------------------------------
DROP TRIGGER IF EXISTS guard_mvp_publication ON public.mvp_projects;

CREATE OR REPLACE FUNCTION public.get_published_mvp_file(p_slug text, p_path text)
RETURNS TABLE(content text, filename text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_files jsonb;
  v_norm text;
BEGIN
  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    RETURN;
  END IF;

  -- Prefer the latest version's files; fall back to project_files.
  SELECT COALESCE(
    (
      SELECT v.value->'files'
      FROM public.mvp_projects mp,
           LATERAL jsonb_array_elements(COALESCE(mp.versions, '[]'::jsonb)) v
      WHERE mp.subdomain_slug = p_slug
      ORDER BY COALESCE((v.value->>'version_number')::int, 0) DESC
      LIMIT 1
    ),
    (SELECT mp.project_files FROM public.mvp_projects mp WHERE mp.subdomain_slug = p_slug LIMIT 1)
  )
  INTO v_files;

  IF v_files IS NULL OR jsonb_typeof(v_files) <> 'array' THEN
    RETURN;
  END IF;

  -- Normalize requested path: drop leading slashes / "./"; empty means index.html.
  v_norm := lower(regexp_replace(COALESCE(NULLIF(btrim(p_path), ''), 'index.html'), '^(\./|/)+', ''));
  IF v_norm = '' THEN
    v_norm := 'index.html';
  END IF;

  RETURN QUERY
  SELECT f.value->>'content',
         COALESCE(f.value->>'filename', f.value->>'path')
  FROM jsonb_array_elements(v_files) f
  WHERE lower(regexp_replace(COALESCE(f.value->>'filename', f.value->>'path', ''), '^(\./|/)+', '')) = v_norm
  LIMIT 1;
END;
$$;


CREATE OR REPLACE FUNCTION public.get_published_mvp_file_v2(p_slug text, p_path text)
RETURNS TABLE(
  content text,
  filename text,
  seo_indexable boolean,
  seo_title text,
  seo_description text,
  seo_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.mvp_projects;
  v_files jsonb;
  v_norm text;
  v_validation jsonb;
BEGIN
  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    RETURN;
  END IF;

  SELECT * INTO v_project
  FROM public.mvp_projects
  WHERE subdomain_slug = lower(btrim(p_slug))
    AND deployment_status = 'deployed'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(
    (
      SELECT v.value -> 'files'
      FROM jsonb_array_elements(COALESCE(v_project.versions, '[]'::jsonb)) v
      ORDER BY COALESCE((v.value ->> 'version_number')::int, 0) DESC
      LIMIT 1
    ),
    v_project.project_files
  ) INTO v_files;

  IF v_files IS NULL OR jsonb_typeof(v_files) <> 'array' THEN
    RETURN;
  END IF;

  v_norm := lower(regexp_replace(COALESCE(NULLIF(btrim(p_path), ''), 'index.html'), '^(\./|/)+', ''));
  IF v_norm = '' THEN v_norm := 'index.html'; END IF;
  v_validation := COALESCE(v_project.metadata -> 'lastPublishValidation', '{}'::jsonb);

  RETURN QUERY
  SELECT
    f.value ->> 'content',
    COALESCE(f.value ->> 'filename', f.value ->> 'path'),
    (
      v_norm = 'index.html'
      AND v_project.project_type = 'html_single'
      AND v_project.search_indexing_requested
      AND v_project.search_indexing_review_status = 'approved'
      AND char_length(btrim(COALESCE(v_project.seo_title, ''))) BETWEEN 10 AND 60
      AND char_length(btrim(COALESCE(v_project.seo_description, ''))) BETWEEN 50 AND 160
      AND COALESCE((v_validation #>> '{smokeTest,passed}')::boolean, false)
    ),
    v_project.seo_title,
    v_project.seo_description,
    v_project.seo_image_url
  FROM jsonb_array_elements(v_files) f
  WHERE lower(regexp_replace(COALESCE(f.value ->> 'filename', f.value ->> 'path', ''), '^(\./|/)+', '')) = v_norm
  LIMIT 1;
END;
$$;


-- 3. GTM play activation ---------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_gtm_play_v2(
  p_plan_id uuid,
  p_play_id uuid,
  p_channel text,
  p_activation_payload jsonb,
  p_idempotency_key text
)
RETURNS TABLE(sprint_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  resolved_sprint_id uuid;
  active_count integer;
  rewritten_plays jsonb;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gtm_plans WHERE id = p_plan_id AND user_id = caller_id) THEN
    RAISE EXCEPTION 'GTM plan not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gtm_plays WHERE id = p_play_id AND plan_id = p_plan_id AND user_id = caller_id) THEN
    RAISE EXCEPTION 'GTM play not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(caller_id::text || ':gtm-activation'));

  SELECT id INTO resolved_sprint_id
    FROM public.traction_engine_sprints
    WHERE user_id = caller_id
      AND (activation_idempotency_key = p_idempotency_key OR (status = 'active' AND lower(channel) = lower(trim(p_channel))))
    ORDER BY created_at DESC LIMIT 1;

  IF resolved_sprint_id IS NULL THEN
    SELECT count(*) INTO active_count FROM public.traction_engine_sprints WHERE user_id = caller_id AND status = 'active';
    IF active_count >= 2 THEN RAISE EXCEPTION 'Traction Engine supports two active channels at a time'; END IF;
    INSERT INTO public.traction_engine_sprints (
      user_id, channel, cycle_start_date, status, source_gtm_plan_id, source_gtm_play_id,
      activation_payload, activation_idempotency_key, review_due_at
    ) VALUES (
      caller_id, trim(p_channel), current_date, 'active', p_plan_id, p_play_id,
      COALESCE(p_activation_payload, '{}'::jsonb), p_idempotency_key, now() + interval '7 days'
    ) RETURNING id INTO resolved_sprint_id;
  ELSE
    UPDATE public.traction_engine_sprints SET
      source_gtm_plan_id = p_plan_id,
      source_gtm_play_id = p_play_id,
      activation_payload = COALESCE(p_activation_payload, activation_payload),
      activation_idempotency_key = COALESCE(activation_idempotency_key, p_idempotency_key),
      review_due_at = COALESCE(review_due_at, now() + interval '7 days')
    WHERE id = resolved_sprint_id AND user_id = caller_id;
  END IF;

  UPDATE public.gtm_plays SET
    status = 'active',
    play_content = play_content || jsonb_build_object('status', 'active', 'tractionSprintId', resolved_sprint_id::text)
  WHERE id = p_play_id AND user_id = caller_id;

  SELECT jsonb_agg(
    CASE WHEN item->>'id' = p_play_id::text
      THEN item || jsonb_build_object('status', 'active', 'tractionSprintId', resolved_sprint_id::text)
      ELSE item END
  ) INTO rewritten_plays
  FROM jsonb_array_elements((SELECT plan_content->'plays' FROM public.gtm_plans WHERE id = p_plan_id)) AS item;

  UPDATE public.gtm_plans SET
    plan_content = jsonb_set(plan_content, '{plays}', COALESCE(rewritten_plays, '[]'::jsonb), true),
    updated_at = now()
  WHERE id = p_plan_id AND user_id = caller_id;

  RETURN QUERY SELECT resolved_sprint_id;
END;
$$;


-- 4. Codex scheduled jobs ----------------------------------------------------
DO $$
DECLARE v_job text;
BEGIN
  FOREACH v_job IN ARRAY ARRAY['ct-connected-data-refresh', 'ct-validation-session-worker', 'ct-mvp-setup-jobs'] LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_job) THEN
      PERFORM cron.unschedule(v_job);
    END IF;
  END LOOP;
END $$;

COMMIT;
