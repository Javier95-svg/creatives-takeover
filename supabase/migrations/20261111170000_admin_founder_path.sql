-- Admin view of how far real founders get along the validation path
-- (Phase 6 of the 2026-11-11 capability plan).
--
-- The 2026-11-11 audit found no non-admin account had completed any step past
-- the ICP. To prove the path end to end with recruited founders, the admin
-- adoption page needs, per founder, which steps they reached:
--
--   icp            an ICP draft saved
--   published      a PMF survey, waitlist, demo/launch page or MVP app published
--   response       a first outside response: survey answer, waitlist or demo
--                  signup (not the owner's own view), or an MVP lead form entry
--   pmf_score      a PMF Lab score
--   gtm_plan       a GTM plan saved
--   play_active    a GTM play started (active or completed)
--   proof_10       a First Customer Proof sprint with 10 or more contacts
--   traction_week  a Traction Engine week logged
--
-- Steps are counted independently (a founder can skip one), and each founder
-- row also carries the furthest step reached in path order. Accounts: founders
-- and builders, excluding admins and @creatives-takeover.com addresses.
-- Optional filters: one cohort (cohort_members), and accounts created since a
-- date. Admin only; raises 42501 otherwise.

CREATE OR REPLACE FUNCTION public.admin_founder_path_v1(
  p_cohort_id uuid DEFAULT NULL,
  p_since timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  WITH accounts AS (
    SELECT u.id AS user_id, u.email, u.created_at, p.full_name, p.username
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE COALESCE(p.user_type, 'founder') IN ('founder', 'builder')
      AND COALESCE(u.email, '') NOT ILIKE '%@creatives-takeover.com'
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text = 'admin')
      AND (p_since IS NULL OR u.created_at >= p_since)
      AND (p_cohort_id IS NULL OR EXISTS (
        SELECT 1 FROM public.cohort_members m WHERE m.cohort_id = p_cohort_id AND m.user_id = u.id))
  ),
  reached AS (
    SELECT
      a.*,
      EXISTS (SELECT 1 FROM public.icp_analysis_results x WHERE x.user_id = a.user_id) AS icp,
      (
        EXISTS (SELECT 1 FROM public.pmf_surveys x WHERE x.user_id = a.user_id AND x.status = 'published')
        OR EXISTS (SELECT 1 FROM public.waitlist_pages x WHERE x.user_id = a.user_id AND x.published_at IS NOT NULL)
        OR EXISTS (SELECT 1 FROM public.demo_studio_projects x WHERE x.owner_id = a.user_id AND x.launch_published)
        OR EXISTS (SELECT 1 FROM public.mvp_projects x WHERE x.user_id = a.user_id AND x.deployment_status = 'deployed')
      ) AS published,
      (
        EXISTS (SELECT 1 FROM public.pmf_survey_responses r JOIN public.pmf_surveys s ON s.id = r.survey_id WHERE s.user_id = a.user_id)
        OR EXISTS (SELECT 1 FROM public.waitlist_signups r JOIN public.waitlist_pages w ON w.id = r.waitlist_page_id WHERE w.user_id = a.user_id)
        OR EXISTS (SELECT 1 FROM public.demo_studio_signups r JOIN public.demo_studio_projects d ON d.id = r.project_id WHERE d.owner_id = a.user_id AND COALESCE(r.owner_view, false) = false)
        OR EXISTS (SELECT 1 FROM public.mvp_app_leads r WHERE r.user_id = a.user_id)
      ) AS response,
      EXISTS (SELECT 1 FROM public.pmf_analysis_results x WHERE x.user_id = a.user_id AND x.pmf_score IS NOT NULL) AS pmf_score,
      EXISTS (SELECT 1 FROM public.gtm_plans x WHERE x.user_id = a.user_id) AS gtm_plan,
      EXISTS (SELECT 1 FROM public.gtm_plays x WHERE x.user_id = a.user_id AND x.status IN ('active', 'completed')) AS play_active,
      EXISTS (
        SELECT 1 FROM public.first_customer_sprints s
        WHERE s.founder_id = a.user_id
          AND (SELECT count(*) FROM public.first_customer_sprint_contacts c WHERE c.sprint_id = s.id) >= 10
      ) AS proof_10,
      EXISTS (SELECT 1 FROM public.traction_engine_weekly_logs x WHERE x.user_id = a.user_id) AS traction_week
    FROM accounts a
  ),
  scored AS (
    SELECT r.*,
      CASE
        WHEN r.traction_week THEN 8 WHEN r.proof_10 THEN 7 WHEN r.play_active THEN 6 WHEN r.gtm_plan THEN 5
        WHEN r.pmf_score THEN 4 WHEN r.response THEN 3 WHEN r.published THEN 2 WHEN r.icp THEN 1 ELSE 0
      END AS furthest
    FROM reached r
  )
  SELECT jsonb_build_object(
    'generatedAt', now(),
    'cohortId', p_cohort_id,
    'since', p_since,
    'accounts', (SELECT count(*) FROM scored),
    'steps', jsonb_build_array(
      jsonb_build_object('step', 'icp', 'founders', (SELECT count(*) FROM scored WHERE icp)),
      jsonb_build_object('step', 'published', 'founders', (SELECT count(*) FROM scored WHERE published)),
      jsonb_build_object('step', 'response', 'founders', (SELECT count(*) FROM scored WHERE response)),
      jsonb_build_object('step', 'pmf_score', 'founders', (SELECT count(*) FROM scored WHERE pmf_score)),
      jsonb_build_object('step', 'gtm_plan', 'founders', (SELECT count(*) FROM scored WHERE gtm_plan)),
      jsonb_build_object('step', 'play_active', 'founders', (SELECT count(*) FROM scored WHERE play_active)),
      jsonb_build_object('step', 'proof_10', 'founders', (SELECT count(*) FROM scored WHERE proof_10)),
      jsonb_build_object('step', 'traction_week', 'founders', (SELECT count(*) FROM scored WHERE traction_week))
    ),
    'founders', COALESCE((
      SELECT jsonb_agg(row ORDER BY (row->>'furthest')::int DESC, row->>'signedUpAt' DESC)
      FROM (
        SELECT jsonb_build_object(
          'userId', s.user_id,
          'name', COALESCE(NULLIF(s.full_name, ''), s.username, split_part(s.email, '@', 1)),
          'email', s.email,
          'signedUpAt', s.created_at,
          'furthest', s.furthest,
          'reached', jsonb_build_object(
            'icp', s.icp, 'published', s.published, 'response', s.response, 'pmf_score', s.pmf_score,
            'gtm_plan', s.gtm_plan, 'play_active', s.play_active, 'proof_10', s.proof_10,
            'traction_week', s.traction_week)
        ) AS row
        FROM scored s
        WHERE s.furthest > 0 OR p_cohort_id IS NOT NULL
        ORDER BY s.furthest DESC, s.created_at DESC
        LIMIT 100
      ) listed
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_founder_path_v1(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_founder_path_v1(uuid, timestamptz) TO authenticated, service_role;
