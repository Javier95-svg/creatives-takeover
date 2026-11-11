-- GTM Strategist plans could never be saved (found 2026-11-11).
--
-- persist_gtm_competitive_plan and persist_gtm_plan_v2 both RETURN TABLE(plan_id,
-- version), which makes plan_id a PL/pgSQL variable, and their bodies filter
-- tables with an unqualified "WHERE plan_id = v_plan_id". Postgres rejects that:
-- 42702 column reference "plan_id" is ambiguous. gtm-analyzer generated the
-- plan, failed at the save, and refunded the credits; production has 0 GTM
-- plays, tasks or pipeline entries.
--
-- Fix: "#variable_conflict use_column" makes those unqualified names mean the
-- table columns. Neither body uses the output names as variables (they return
-- v_plan_id and v_version). The directive is added to each LIVE definition, so
-- nothing else in the bodies changes; re-running this is a no-op.

DO $migration$
DECLARE
  v_fn regprocedure;
  v_def text;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY[
    'public.persist_gtm_plan_v2(uuid,uuid,text,jsonb,jsonb,text,jsonb)'::regprocedure,
    'public.persist_gtm_competitive_plan(uuid,uuid,text,jsonb,jsonb,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure
  ] LOOP
    v_def := pg_get_functiondef(v_fn);
    IF position('#variable_conflict' IN v_def) > 0 THEN
      CONTINUE;
    END IF;
    IF position('AS $function$' IN v_def) = 0 THEN
      RAISE EXCEPTION 'Unexpected definition for %; not changed', v_fn;
    END IF;
    v_def := regexp_replace(
      v_def,
      'AS \$function\$\s*',
      E'AS $function$\n#variable_conflict use_column\n'
    );
    EXECUTE v_def;
  END LOOP;
END
$migration$;
