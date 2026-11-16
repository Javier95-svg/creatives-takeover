-- Customer research: published email addresses and phone numbers by plan.
--
-- Emails and phones move to their own column, which signed-in users cannot
-- read directly. gtm_prospect_contact_access_v1 hands them out by plan:
--   Pro: every lead.
--   Rising: the best half of each search (by fit score, rounded up).
--   Other plans: none, with counts of what is available.
-- A search is a research run plus the runs that added companies to it.

BEGIN;

ALTER TABLE public.gtm_prospect_companies
  ADD COLUMN IF NOT EXISTS contact_details JSONB NOT NULL DEFAULT '{"emails":[],"phones":[]}'::jsonb;

-- Published enquiry addresses found before this change move to the new column.
UPDATE public.gtm_prospect_companies
   SET contact_details = jsonb_build_object(
         'emails', COALESCE((SELECT jsonb_agg(jsonb_build_object('value', route->>'value', 'sourceUrl', route->>'sourceUrl'))
                               FROM jsonb_array_elements(contact_routes) route WHERE route->>'kind' = 'generic_email'), '[]'::jsonb),
         'phones', '[]'::jsonb),
       contact_routes = COALESCE((SELECT jsonb_agg(route) FROM jsonb_array_elements(contact_routes) route WHERE route->>'kind' <> 'generic_email'), '[]'::jsonb)
 WHERE contact_routes @> '[{"kind":"generic_email"}]'::jsonb;

-- Signed-in users read every column except contact_details.
REVOKE SELECT ON public.gtm_prospect_companies FROM authenticated;
GRANT SELECT (id, run_id, user_id, project_id, domain, name, description, location, size_band, industry, fit_score, fit_tier,
  criteria, contact_routes, suggested_roles, blocked, status, feedback, pipeline_entry_id, last_checked_at, created_at, updated_at,
  contact_id, signals) ON public.gtm_prospect_companies TO authenticated;

CREATE OR REPLACE FUNCTION public.gtm_prospect_contact_access_v1(p_prospect_ids UUID[])
RETURNS TABLE (prospect_id UUID, contact_details JSONB, unlocked BOOLEAN, emails_available INTEGER, phones_available INTEGER, plan TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user UUID := auth.uid();
  v_plan TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501'; END IF;
  v_plan := public.get_user_normalized_subscription_tier(v_user);
  RETURN QUERY
  WITH mine AS (
    SELECT p.id, p.fit_score, p.created_at, p.contact_details AS details,
           COALESCE(CASE WHEN r.kind <> 'initial' THEN r.parent_run_id END, r.id, p.id) AS search_id
      FROM public.gtm_prospect_companies p
      LEFT JOIN public.gtm_research_runs r ON r.id = p.run_id
     WHERE p.user_id = v_user
  ), ranked AS (
    SELECT m.*, row_number() OVER (PARTITION BY m.search_id ORDER BY m.fit_score DESC, m.created_at, m.id) AS rank_in_search,
           count(*) OVER (PARTITION BY m.search_id) AS total
      FROM mine m
     WHERE m.search_id IN (SELECT search_id FROM mine WHERE id = ANY(p_prospect_ids))
  )
  SELECT ranked.id,
         CASE WHEN access.ok THEN ranked.details ELSE NULL END,
         access.ok,
         COALESCE(jsonb_array_length(ranked.details->'emails'), 0),
         COALESCE(jsonb_array_length(ranked.details->'phones'), 0),
         v_plan
    FROM ranked
   CROSS JOIN LATERAL (SELECT (v_plan = 'pro' OR (v_plan = 'rising' AND ranked.rank_in_search <= ceil(ranked.total / 2.0))) AS ok) access
   WHERE ranked.id = ANY(p_prospect_ids);
END;
$$;
REVOKE ALL ON FUNCTION public.gtm_prospect_contact_access_v1(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gtm_prospect_contact_access_v1(UUID[]) TO authenticated;

COMMIT;
