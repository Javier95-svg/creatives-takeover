-- Personalized retention emails: record how each email was written and which
-- project facts it used, so AI-written and hand-written copy can be compared.
--
-- send-retention-email works before this migration is applied: it retries the
-- log insert without these columns and skips the metadata update. Every
-- statement is idempotent because production's migration ledger has drifted
-- from this repository and some columns may already exist.

ALTER TABLE public.retention_email_log
  ADD COLUMN IF NOT EXISTS copy_source text,
  ADD COLUMN IF NOT EXISTS context_keys text[],
  ADD COLUMN IF NOT EXISTS context_version integer,
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS template_version integer,
  ADD COLUMN IF NOT EXISTS delivery_status text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'retention_email_log_copy_source_check'
      AND conrelid = 'public.retention_email_log'::regclass
  ) THEN
    ALTER TABLE public.retention_email_log
      ADD CONSTRAINT retention_email_log_copy_source_check
      CHECK (copy_source IS NULL OR copy_source IN ('template', 'ai', 'ai_rejected'));
  END IF;
END $$;

COMMENT ON COLUMN public.retention_email_log.copy_source IS
  'How the email copy was written: template (hand-written), ai (model-written opener that passed validation), ai_rejected (model output failed validation, template sent). NULL for emails sent before 2026-10.';
COMMENT ON COLUMN public.retention_email_log.context_keys IS
  'Names of the project facts present when the email was built (for example projectTitle, customer). Never the values.';

CREATE INDEX IF NOT EXISTS retention_email_log_copy_source_sent_at_idx
  ON public.retention_email_log (copy_source, sent_at DESC)
  WHERE copy_source IS NOT NULL;

-- Last 30 days by sequence and copy source. A return counts when the founder
-- came back through the email within 7 days of it being sent.
CREATE OR REPLACE VIEW public.retention_email_copy_report
WITH (security_invoker = true) AS
SELECT
  sequence,
  copy_source,
  count(*) AS sent,
  round(100.0 * count(*) FILTER (WHERE opened_at IS NOT NULL) / nullif(count(*), 0), 1) AS open_rate_pct,
  round(100.0 * count(*) FILTER (WHERE clicked_at IS NOT NULL) / nullif(count(*), 0), 1) AS click_rate_pct,
  round(100.0 * count(*) FILTER (
    WHERE returned_at IS NOT NULL AND returned_at <= sent_at + interval '7 days'
  ) / nullif(count(*), 0), 1) AS return_7d_rate_pct,
  round(avg(coalesce(array_length(context_keys, 1), 0)), 1) AS avg_facts_used
FROM public.retention_email_log
WHERE sent_at >= now() - interval '30 days'
  AND copy_source IS NOT NULL
GROUP BY sequence, copy_source;

REVOKE ALL ON public.retention_email_copy_report FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.retention_email_copy_report TO service_role;

COMMENT ON VIEW public.retention_email_copy_report IS
  'Open, click and 7-day return rates for retention emails by sequence and copy source (template vs ai), last 30 days. Service role only.';
