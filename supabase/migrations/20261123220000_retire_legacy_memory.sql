-- Project memory plan, phase 5 (2026-11-23): retire the memory systems the
-- project ledger replaced, and check "what exists today" on the server.
--
-- conversation_memory (0 rows) was written only by the Dream2Plan chat, which
-- is no longer routed. project_memory (6 rows, last written October 2025) was
-- filled by the memory-manager edge function, which nothing calls. Both tables
-- move to a private "archive" schema: the data is kept, but the app's API no
-- longer serves them. Project memory now lives in projects, the tool tables
-- and pulse_memories.
--
-- The nightly-memory-summarization job called memory-manager through settings
-- that were never configured, so it failed every night. It is removed with the
-- functions that only memory-manager used.
--
-- Safe to run more than once.

-- ── The nightly job ─────────────────────────────────────────────────────────
DO $cron$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'nightly-memory-summarization';
  END IF;
END $cron$;

DROP FUNCTION IF EXISTS public.trigger_memory_summarization();
DROP FUNCTION IF EXISTS public.get_conversations_for_summarization(integer);
DROP FUNCTION IF EXISTS public.archive_old_memories(integer);
DROP FUNCTION IF EXISTS public.search_similar_memories(vector, uuid, integer, text);

-- ── Archive the tables (data kept) ──────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS archive;
REVOKE ALL ON SCHEMA archive FROM PUBLIC, anon, authenticated;
COMMENT ON SCHEMA archive IS 'Retired tables kept for reference. Not exposed through the API.';

DO $archive$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['conversation_memory', 'project_memory'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND to_regclass('archive.' || t) IS NULL THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA archive', t);
    END IF;
    IF to_regclass('archive.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON archive.%I FROM PUBLIC, anon, authenticated', t);
      EXECUTE format($c$COMMENT ON TABLE archive.%I IS 'Retired 2026-11-23 (project memory plan, phase 5); replaced by projects, the tool tables and pulse_memories.'$c$, t);
    END IF;
  END LOOP;
END $archive$;

-- ── "What exists today" is checked like every other onboarding choice ───────
-- Same as the live definition plus productState (the app's ANSWER_OPTIONS in
-- src/lib/onboardingAnswerRules.ts already lists it).
CREATE OR REPLACE FUNCTION public.onboarding_answers_problem(p_answers jsonb)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_field text;
  v_value text;
  v_options text[];
  v_item jsonb;
BEGIN
  IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object' THEN
    RETURN 'Answers must be an object';
  END IF;

  FOR v_field, v_options IN
    SELECT * FROM (VALUES
      ('businessModel', ARRAY['b2b_saas','service','b2c_product','marketplace','ecommerce','media','other']),
      ('evidenceState', ARRAY['none','prospects','replies','conversations','commitment','payment','repeatable_growth']),
      ('productState', ARRAY['idea_only','prototype_demo','mvp_beta','live_product']),
      ('customerCountBand', ARRAY['0','1','2','3','4_plus']),
      ('revenueBand', ARRAY['none','under_1k','1k_10k','10k_50k','over_50k']),
      ('primaryGoal', ARRAY['validate_problem','win_first_customer','reach_three_customers','repeatable_growth','build_product','launch','raise']),
      ('blocker', ARRAY['customer_clarity','prospect_access','messaging','sales_conversion','product_delivery','traction_growth','fundraising','accountability','team']),
      ('fundraisingStatus', ARRAY['not_now','preparing','talking_investors','raising_now']),
      ('cofounderSituation', ARRAY['actively_looking','solo_ok']),
      ('runwayMonths', ARRAY['under_3','3_6','6_12','over_12','not_applicable']),
      ('builderStartingPoint', ARRAY['exploring','idea_chosen']),
      ('selectedIntent', ARRAY['publish_proof','first_customer_sprint','build_demo','find_mentor','run_icp','start_validation','build_mvp','plan_gtm','log_traction','analyze_pitch_deck','unlock_pitch_deck','unlock_tech_stack','unlock_insighta','save_mentor','send_message','book_call'])
    ) AS rules(field, options)
  LOOP
    IF p_answers ? v_field AND jsonb_typeof(p_answers->v_field) <> 'null' THEN
      IF jsonb_typeof(p_answers->v_field) <> 'string' THEN
        RETURN 'Invalid value for ' || v_field;
      END IF;
      v_value := p_answers->>v_field;
      IF v_value <> '' AND NOT v_value = ANY(v_options) THEN
        RETURN 'Invalid value for ' || v_field;
      END IF;
    END IF;
  END LOOP;

  IF p_answers ? 'weeklyCapacityHours' AND jsonb_typeof(p_answers->'weeklyCapacityHours') <> 'null'
    AND COALESCE(p_answers->>'weeklyCapacityHours', '') NOT IN ('', '2', '5', '10', '20') THEN
    RETURN 'Invalid value for weeklyCapacityHours';
  END IF;

  IF p_answers ? 'sectors' THEN
    IF jsonb_typeof(p_answers->'sectors') <> 'array' OR jsonb_array_length(p_answers->'sectors') > 12 THEN
      RETURN 'Invalid sectors';
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers->'sectors') LOOP
      IF jsonb_typeof(v_item) <> 'string' OR NOT (v_item #>> '{}') = ANY(ARRAY['AI & Machine Learning','BioTech & Life Sciences','CleanTech & Climate','Consumer & D2C','Cybersecurity','DeepTech & Hardware','Developer Tools','E-Commerce & Marketplace','EdTech','Energy','Enterprise Software','FinTech','FoodTech & AgTech','Gaming & Entertainment','GovTech','HealthTech','HR Tech & Future of Work','InsurTech','LegalTech','Logistics & Supply Chain','Manufacturing & Industry 4.0','Media & Creator Economy','Mobility & Logistics','Mobility & Transportation','PropTech & Real Estate','RetailTech','Robotics & Automation','SaaS','Social Impact','SpaceTech','Sports & Wellness','Travel & Hospitality','Web3 & Blockchain']) THEN
        RETURN 'Invalid sectors';
      END IF;
    END LOOP;
  END IF;

  IF p_answers ? 'workingDays' THEN
    IF jsonb_typeof(p_answers->'workingDays') <> 'array' OR jsonb_array_length(p_answers->'workingDays') > 7 THEN
      RETURN 'Invalid workingDays';
    END IF;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers->'workingDays') LOOP
      IF jsonb_typeof(v_item) <> 'number' OR (v_item #>> '{}') NOT IN ('0','1','2','3','4','5','6') THEN
        RETURN 'Invalid workingDays';
      END IF;
    END LOOP;
  END IF;

  IF length(trim(COALESCE(p_answers->>'startupBrief', ''))) > 280 THEN RETURN 'Startup brief is too long'; END IF;
  IF length(trim(COALESCE(p_answers->>'country', ''))) > 100 THEN RETURN 'Country is too long'; END IF;
  IF length(btrim(COALESCE(p_answers->>'projectName', ''))) > 120 THEN RETURN 'Project name is too long'; END IF;
  RETURN NULL;
END;
$function$;
