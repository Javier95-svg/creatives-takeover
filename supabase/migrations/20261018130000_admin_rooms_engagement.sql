-- Rooms engagement for /admin/adoption: proof that people talk to each other.
--
-- Members are every account outside the team (team = @creatives-takeover.com
-- or the admin role). Founders and builders are counted apart from mentors
-- and other members, because they are who Rooms is for. Hidden posts and
-- replies never count.
--
-- * participants: members who posted or replied (founders and builders, and others)
-- * replyRate: posts at least 48 hours old that got a reply from someone else
--   within 48 hours, and the median hours to that first reply
-- * depth: threads with a reply where two or more other people replied, or
--   the author answered back
-- * returnAfterReply: authors who came back within 7 days of their first
--   reply (visited the platform, posted or replied). Replies younger than 7
--   days count only once the author is back.
-- * memberShare: posts and replies by members rather than the team
-- * weekly: the last 8 weeks, for a chart

CREATE OR REPLACE FUNCTION public.admin_rooms_engagement(p_days integer DEFAULT 30)
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

  WITH people AS (
    SELECT u.id AS user_id,
      (u.email ILIKE '%@creatives-takeover.com'
        OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role::text = 'admin')) AS team,
      COALESCE(p.user_type, '') IN ('founder', 'builder') AS founder_or_builder
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
  ),
  posts AS (
    SELECT cp.id, cp.user_id, cp.created_at, people.team, people.founder_or_builder
    FROM public.community_posts cp JOIN people USING (user_id)
    WHERE cp.hidden_at IS NULL
  ),
  replies AS (
    SELECT c.id, c.post_id, c.user_id, c.created_at, people.team, people.founder_or_builder
    FROM public.post_comments c JOIN people USING (user_id)
    JOIN posts ON posts.id = c.post_id
    WHERE c.hidden_at IS NULL
  ),
  contributions AS (
    SELECT user_id, created_at, team, founder_or_builder FROM posts
    UNION ALL
    SELECT user_id, created_at, team, founder_or_builder FROM replies
  ),
  threads AS (
    SELECT posts.id, posts.user_id, posts.created_at, posts.team,
      (SELECT min(r.created_at) FROM replies r WHERE r.post_id = posts.id AND r.user_id <> posts.user_id) AS first_reply_at,
      (SELECT count(DISTINCT r.user_id) FROM replies r WHERE r.post_id = posts.id AND r.user_id <> posts.user_id) AS other_repliers,
      EXISTS (
        SELECT 1 FROM replies mine
        WHERE mine.post_id = posts.id AND mine.user_id = posts.user_id
          AND mine.created_at > (SELECT min(r.created_at) FROM replies r WHERE r.post_id = posts.id AND r.user_id <> posts.user_id)
      ) AS author_answered
    FROM posts
  ),
  returns AS (
    SELECT t.id, t.first_reply_at,
      EXISTS (
        SELECT 1 FROM public.section_activity_days s
        WHERE s.user_id = t.user_id
          AND s.day BETWEEN (t.first_reply_at AT TIME ZONE 'UTC')::date AND (t.first_reply_at AT TIME ZONE 'UTC')::date + 7
      ) OR EXISTS (
        SELECT 1 FROM contributions c
        WHERE c.user_id = t.user_id AND c.created_at > t.first_reply_at AND c.created_at <= t.first_reply_at + interval '7 days'
      ) AS returned
    FROM threads t
    WHERE t.first_reply_at IS NOT NULL AND NOT t.team
  ),
  weeks AS (
    SELECT generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') AS week
  )
  SELECT jsonb_build_object(
    'generatedAt', now(),
    'days', v_days,
    'participants', jsonb_build_object(
      'foundersBuilders', (SELECT count(DISTINCT user_id) FROM contributions WHERE NOT team AND founder_or_builder AND created_at >= v_since),
      'others', (SELECT count(DISTINCT user_id) FROM contributions WHERE NOT team AND NOT founder_or_builder AND created_at >= v_since),
      'foundersBuildersAll', (SELECT count(DISTINCT user_id) FROM contributions WHERE NOT team AND founder_or_builder),
      'othersAll', (SELECT count(DISTINCT user_id) FROM contributions WHERE NOT team AND NOT founder_or_builder)
    ),
    'posts', jsonb_build_object(
      'recent', (SELECT count(*) FROM posts WHERE created_at >= v_since),
      'all', (SELECT count(*) FROM posts)
    ),
    'replies', jsonb_build_object(
      'recent', (SELECT count(*) FROM replies WHERE created_at >= v_since),
      'all', (SELECT count(*) FROM replies)
    ),
    'replyRate', (
      SELECT jsonb_build_object(
        'eligible', count(*),
        'replied', count(*) FILTER (WHERE first_reply_at <= created_at + interval '48 hours'),
        'medianHours', round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM first_reply_at - created_at) / 3600)
          FILTER (WHERE first_reply_at IS NOT NULL))::numeric, 1)
      )
      FROM threads
      WHERE created_at >= v_since AND created_at <= now() - interval '48 hours'
    ),
    'depth', (
      SELECT jsonb_build_object(
        'threads', count(*),
        'deep', count(*) FILTER (WHERE other_repliers >= 2 OR author_answered)
      )
      FROM threads
      WHERE created_at >= v_since AND first_reply_at IS NOT NULL
    ),
    'returnAfterReply', (
      SELECT jsonb_build_object(
        'eligible', count(*) FILTER (WHERE returned OR first_reply_at <= now() - interval '7 days'),
        'returned', count(*) FILTER (WHERE returned)
      )
      FROM returns
      WHERE first_reply_at >= v_since
    ),
    'memberShare', jsonb_build_object(
      'members', (SELECT count(*) FROM contributions WHERE NOT team AND created_at >= v_since),
      'team', (SELECT count(*) FROM contributions WHERE team AND created_at >= v_since)
    ),
    'weekly', (
      SELECT jsonb_agg(jsonb_build_object(
        'week', to_char(w.week, 'YYYY-MM-DD'),
        'foundersBuilders', (SELECT count(DISTINCT c.user_id) FROM contributions c
          WHERE NOT c.team AND c.founder_or_builder AND c.created_at >= w.week AND c.created_at < w.week + interval '1 week'),
        'others', (SELECT count(DISTINCT c.user_id) FROM contributions c
          WHERE NOT c.team AND NOT c.founder_or_builder AND c.created_at >= w.week AND c.created_at < w.week + interval '1 week'),
        'posts', (SELECT count(*) FROM posts p WHERE p.created_at >= w.week AND p.created_at < w.week + interval '1 week'),
        'replies', (SELECT count(*) FROM replies r WHERE r.created_at >= w.week AND r.created_at < w.week + interval '1 week')
      ) ORDER BY w.week)
      FROM weeks w
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_rooms_engagement(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_rooms_engagement(integer) TO authenticated;
