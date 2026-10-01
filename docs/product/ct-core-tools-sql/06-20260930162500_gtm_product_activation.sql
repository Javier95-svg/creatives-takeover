-- CT core tools: step 6 of 11, 20260930162500_gtm_product_activation.sql
-- Run the entire file as postgres in the Supabase SQL Editor.
-- Run files 01 through 11 in order. Re-running a completed step is safe.
-- Only this step is one transaction; earlier completed steps stay committed.
-- The installer records progress privately, separately from Supabase CLI history.

ROLLBACK;
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public;

DO $ct_install$
DECLARE
  recorded_checksum text;
  required_relation text;
  attempt integer;
  failed_context text;
  failed_detail text;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtextextended('ct-core-tools-manual-install', 0)) THEN
    RAISE EXCEPTION 'Another CT migration is running. Let it finish before retrying this step.';
  END IF;
  IF to_regnamespace('private') IS NULL THEN
    RAISE EXCEPTION 'The baseline private schema is missing. Apply the baseline migrations first.';
  END IF;
  CREATE TABLE IF NOT EXISTS private.ct_core_tools_sql_runs (
    version text PRIMARY KEY,
    source_checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
  REVOKE ALL ON private.ct_core_tools_sql_runs FROM PUBLIC, anon, authenticated;
  SELECT source_checksum INTO recorded_checksum FROM private.ct_core_tools_sql_runs WHERE version='20260930162500';
  IF FOUND THEN
    IF recorded_checksum <> 'a1d57e7ab73a8a194d857b471d78d49096ecf02419f6424cb80f950bc27eb7af' THEN
      RAISE EXCEPTION 'Step 6 was applied from different SQL. Review the difference before changing an applied migration.';
    END IF;
    RAISE NOTICE 'Step 6/11 already completed; skipped.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.ct_core_tools_sql_runs WHERE version='20260930162000') THEN
    RAISE EXCEPTION 'Run step 5 successfully before step 6.';
  END IF;

  -- Each failed attempt is a subtransaction: its DDL and locks are rolled back
  -- before retrying. Never disable RLS, event triggers or other sessions.
  FOR attempt IN 1..3 LOOP
    BEGIN

      EXECUTE $ct_source$
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
  selected_product uuid;
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

  SELECT product_id INTO selected_product FROM public.ct_product_artifacts WHERE user_id=caller_id AND tool='gtm_strategist' AND artifact_id=p_plan_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller_id::text||coalesce(selected_product::text,'unassigned'),0));

  SELECT id INTO resolved_sprint_id
    FROM public.traction_engine_sprints
    WHERE user_id = caller_id
      AND product_id IS NOT DISTINCT FROM selected_product
      AND (activation_idempotency_key = p_idempotency_key OR (status = 'active' AND lower(channel) = lower(trim(p_channel))))
    ORDER BY created_at DESC LIMIT 1;

  IF resolved_sprint_id IS NULL THEN
    SELECT count(*) INTO active_count FROM public.traction_engine_sprints WHERE user_id = caller_id AND product_id IS NOT DISTINCT FROM selected_product AND status = 'active';
    IF active_count >= 2 THEN RAISE EXCEPTION 'Traction Engine supports two active channels at a time'; END IF;
    INSERT INTO public.traction_engine_sprints (
      user_id, product_id, channel, cycle_start_date, status, source_gtm_plan_id, source_gtm_play_id,
      activation_payload, activation_idempotency_key, review_due_at
    ) VALUES (
      caller_id, selected_product, trim(p_channel), date_trunc('week',now() AT TIME ZONE 'UTC')::date, 'active', p_plan_id, p_play_id,
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

GRANT EXECUTE ON FUNCTION public.activate_gtm_play_v2(uuid, uuid, text, jsonb, text) TO authenticated;
$ct_source$;
      EXIT;
    EXCEPTION WHEN deadlock_detected OR lock_not_available THEN
      GET STACKED DIAGNOSTICS failed_context = PG_EXCEPTION_CONTEXT,
                              failed_detail = PG_EXCEPTION_DETAIL;
      IF attempt = 3 THEN
        RAISE EXCEPTION USING ERRCODE=SQLSTATE,
          MESSAGE='Step 6/11 could not obtain database locks: ' || SQLERRM,
          DETAIL=coalesce(failed_detail, '') || E'\nFailing SQL context:\n' || coalesce(failed_context, ''),
          HINT='Earlier completed steps are saved. Run docs/product/ct-core-tools-lock-diagnostics.sql and share the results before retrying. Do not proceed to the next step.';
      END IF;
      PERFORM pg_sleep(0.25 * attempt);
    END;
  END LOOP;
  INSERT INTO private.ct_core_tools_sql_runs(version,source_checksum) VALUES('20260930162500','a1d57e7ab73a8a194d857b471d78d49096ecf02419f6424cb80f950bc27eb7af');
END;
$ct_install$;

COMMIT;
SELECT '6/11' AS step, '20260930162500_gtm_product_activation' AS migration, 'Completed' AS status
FROM private.ct_core_tools_sql_runs WHERE version='20260930162500' AND source_checksum='a1d57e7ab73a8a194d857b471d78d49096ecf02419f6424cb80f950bc27eb7af';
