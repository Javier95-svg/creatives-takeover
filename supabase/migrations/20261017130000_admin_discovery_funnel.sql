-- Customer Discovery funnel for /admin/adoption.
--
-- Where founders drop between finding people and talking to them:
-- found -> contacted -> replied (booked or said no) -> booked -> interviewed,
-- in founders and in people, for the last p_days days and all time. Also the
-- inputs to the list (paid searches, Rooms questions and their replies) and
-- whether follow-up reminders reach the founder.
--
-- A person counts at a step once they reach it or any later one, so a person
-- logged as interviewed without being marked contacted still counts as
-- contacted. A step's date is the earliest date they reached it or later.
-- Internal accounts are excluded, as in admin_adoption_metrics().

CREATE OR REPLACE FUNCTION public.admin_discovery_funnel(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 30), 7), 365);
  v_since timestamptz := now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 30), 7), 365));
  v_result jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  WITH accounts AS (
    SELECT u.id AS user_id
    FROM auth.users u
    WHERE u.email NOT ILIKE '%@creatives-takeover.com'
      AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text = 'admin')
  ),
  leads AS (
    SELECT l.user_id, l.source,
      l.first_seen_at AS found_at,
      LEAST(l.contacted_at, l.interview_scheduled_at, l.interviewed_at) AS contacted_at,
      LEAST(l.interview_scheduled_at, l.interviewed_at, said_no.at) AS replied_at,
      LEAST(l.interview_scheduled_at, l.interviewed_at) AS booked_at,
      l.interviewed_at
    FROM public.pmf_discovery_leads l
    JOIN accounts a USING (user_id)
    LEFT JOIN LATERAL (
      SELECT min(act.occurred_at) AS at
      FROM public.pmf_discovery_lead_activities act
      WHERE act.lead_id = l.id AND act.metadata->>'reason' = 'said_no'
    ) said_no ON true
  ),
  step_names (step, step_order) AS (
    VALUES ('found', 1), ('contacted', 2), ('replied', 3), ('booked', 4), ('interviewed', 5)
  ),
  reached AS (
    SELECT v.step, leads.user_id, v.at
    FROM leads
    CROSS JOIN LATERAL (VALUES
      ('found', leads.found_at), ('contacted', leads.contacted_at), ('replied', leads.replied_at),
      ('booked', leads.booked_at), ('interviewed', leads.interviewed_at)
    ) v(step, at)
    WHERE v.at IS NOT NULL
  ),
  steps AS (
    SELECT n.step, n.step_order,
      count(DISTINCT r.user_id) FILTER (WHERE r.at >= v_since) AS founders,
      count(r.user_id) FILTER (WHERE r.at >= v_since) AS people,
      count(DISTINCT r.user_id) AS founders_all,
      count(r.user_id) AS people_all
    FROM step_names n
    LEFT JOIN reached r ON r.step = n.step
    GROUP BY n.step, n.step_order
  ),
  searches AS (
    SELECT d.user_id, d.created_at
    FROM public.pmf_customer_discovery d JOIN accounts a USING (user_id)
  ),
  questions AS (
    SELECT p.id, p.user_id, p.created_at
    FROM public.community_posts p JOIN accounts a USING (user_id)
    WHERE p.source_data @> '{"origin": "pmf_discovery"}'::jsonb
  ),
  replies AS (
    SELECT c.created_at
    FROM public.post_comments c
    JOIN questions q ON q.id = c.post_id
    WHERE c.user_id <> q.user_id AND c.hidden_at IS NULL
  ),
  reminders AS (
    SELECT c.created_at, c.in_app_delivered_at, c.email_delivered_at
    FROM public.user_return_cues c JOIN accounts a USING (user_id)
    WHERE c.reason_key = 'discovery_follow_up_due'
  ),
  users_of_tool AS (
    SELECT user_id, created_at AS at FROM searches
    UNION ALL SELECT user_id, created_at FROM questions
    UNION ALL SELECT user_id, found_at FROM leads
  )
  SELECT jsonb_build_object(
    'generatedAt', now(),
    'days', v_days,
    'founders', jsonb_build_object(
      'recent', (SELECT count(DISTINCT user_id) FROM users_of_tool WHERE at >= v_since),
      'all', (SELECT count(DISTINCT user_id) FROM users_of_tool)
    ),
    'steps', (SELECT jsonb_agg(jsonb_build_object(
      'step', step, 'founders', founders, 'people', people, 'foundersAll', founders_all, 'peopleAll', people_all
    ) ORDER BY step_order) FROM steps),
    'searches', jsonb_build_object(
      'recent', (SELECT count(*) FROM searches WHERE created_at >= v_since),
      'all', (SELECT count(*) FROM searches)
    ),
    'roomsQuestions', jsonb_build_object(
      'recent', (SELECT count(*) FROM questions WHERE created_at >= v_since),
      'all', (SELECT count(*) FROM questions)
    ),
    'roomsReplies', jsonb_build_object(
      'recent', (SELECT count(*) FROM replies WHERE created_at >= v_since),
      'all', (SELECT count(*) FROM replies)
    ),
    'addedFromRooms', jsonb_build_object(
      'recent', (SELECT count(*) FROM leads WHERE source = 'platform' AND found_at >= v_since),
      'all', (SELECT count(*) FROM leads WHERE source = 'platform')
    ),
    'followUpsSet', jsonb_build_object(
      'recent', (SELECT count(*) FROM reminders WHERE created_at >= v_since),
      'all', (SELECT count(*) FROM reminders)
    ),
    'followUpsDelivered', jsonb_build_object(
      'recent', (SELECT count(*) FROM reminders WHERE in_app_delivered_at >= v_since),
      'all', (SELECT count(*) FROM reminders WHERE in_app_delivered_at IS NOT NULL)
    ),
    'followUpsEmailed', jsonb_build_object(
      'recent', (SELECT count(*) FROM reminders WHERE email_delivered_at >= v_since),
      'all', (SELECT count(*) FROM reminders WHERE email_delivered_at IS NOT NULL)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_discovery_funnel(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_discovery_funnel(integer) TO authenticated;
