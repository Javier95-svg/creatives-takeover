-- Revenue P0: prepare, but do not send, a deduplicated review list for founders
-- who created discovery-call intents. Access is service-role only and the list
-- excludes anyone who disabled retention email or has any unsubscribe record.

CREATE OR REPLACE VIEW public.discovery_call_outreach_review_v1
WITH (security_invoker = true)
AS
SELECT
  dc.founder_id AS user_id,
  au.email,
  p.full_name,
  count(*)::integer AS attempt_count,
  min(dc.created_at) AS first_attempt_at,
  max(dc.created_at) AS latest_attempt_at,
  array_agg(DISTINCT dc.status::text ORDER BY dc.status::text) AS observed_statuses,
  bool_or(dc.credits_refunded) AS any_credits_refunded
FROM public.discovery_calls dc
JOIN auth.users au ON au.id = dc.founder_id
LEFT JOIN public.profiles p ON p.id = dc.founder_id
JOIN public.notification_preferences np
  ON np.user_id = dc.founder_id
 AND np.retention_emails IS TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM public.retention_email_log rel
  WHERE rel.user_id = dc.founder_id
    AND rel.unsubscribed IS TRUE
)
GROUP BY dc.founder_id, au.email, p.full_name;

COMMENT ON VIEW public.discovery_call_outreach_review_v1 IS
  'Consent-filtered, deduplicated review input only. This view does not send or authorize outreach.';

REVOKE ALL ON public.discovery_call_outreach_review_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.discovery_call_outreach_review_v1 TO service_role;
