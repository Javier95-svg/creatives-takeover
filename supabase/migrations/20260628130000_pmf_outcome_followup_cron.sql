-- PMF Lab calibration: scheduled "what happened with your idea?" follow-up.
-- Mirrors process_dormant_winback: a daily cron that, for each founder with a saved
-- PMF analysis and no recorded outcome, asks them to report the real outcome — so the
-- platform can later measure how accurate its scores were. Routed through the
-- pmf-outcome-request edge function (which excludes mentors + logs to retention_email_log).
--
-- Cadence: one nudge at ~28 days (sequence pmf_outcome_30d) and one at ~58 days
-- (pmf_outcome_60d), capped by a 30-day per-user dedup + the global <3-emails-per-7-days
-- rule. DISTINCT ON (user_id) guarantees at most one email per user per run, which matters
-- because the free re-score path inserts multiple analysis rows per user.

CREATE OR REPLACE FUNCTION public.process_pmf_outcome_followups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
  v_count integer := 0;
  r record;
BEGIN
  IF v_url IS NULL OR v_key IS NULL THEN
    RAISE EXCEPTION 'private.service_config missing supabase_url or supabase_service_key';
  END IF;

  FOR r IN
    SELECT DISTINCT ON (p.user_id)
      p.id AS analysis_id,
      p.user_id AS user_id,
      au.email AS email,
      pr.full_name AS full_name,
      p.pmf_score AS pmf_score,
      p.verdict AS verdict,
      CASE WHEN p.created_at <= now() - interval '55 days' THEN 'pmf_outcome_60d' ELSE 'pmf_outcome_30d' END AS sequence
    FROM public.pmf_analysis_results p
    JOIN auth.users au ON au.id = p.user_id
    LEFT JOIN public.profiles pr ON pr.id = p.user_id
    WHERE p.actual_outcome IS NULL
      AND p.saved_at IS NOT NULL
      AND p.user_id IS NOT NULL
      AND au.email IS NOT NULL
      AND p.created_at <= now() - interval '28 days'
      AND p.created_at >  now() - interval '90 days'
      AND NOT EXISTS (SELECT 1 FROM public.mentors m WHERE m.user_id = p.user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.retention_email_log l
        WHERE l.user_id = p.user_id
          AND l.sequence LIKE 'pmf_outcome%'
          AND l.sent_at >= now() - interval '30 days'
      )
      AND (
        SELECT count(*) FROM public.retention_email_log l
        WHERE l.user_id = p.user_id AND l.sent_at >= now() - interval '7 days'
      ) < 3
    ORDER BY p.user_id, p.created_at DESC
  LOOP
    PERFORM net.http_post(
      url := v_url || '/functions/v1/pmf-outcome-request',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := jsonb_build_object(
        'userId', r.user_id,
        'email', r.email,
        'fullName', r.full_name,
        'analysisId', r.analysis_id,
        'pmfScore', r.pmf_score,
        'verdict', r.verdict,
        'sequence', r.sequence
      )
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_pmf_outcome_followups() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_pmf_outcome_followups() TO service_role;

-- Daily at 17:00 UTC; per-user cadence + cap live in the function.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pmf-outcome-followup-daily') THEN
    PERFORM cron.unschedule('pmf-outcome-followup-daily');
  END IF;
END;
$$;

SELECT cron.schedule(
  'pmf-outcome-followup-daily',
  '0 17 * * *',
  $$SELECT public.process_pmf_outcome_followups();$$
);
