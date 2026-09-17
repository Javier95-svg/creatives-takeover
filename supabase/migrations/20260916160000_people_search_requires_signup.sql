-- People search was listing profiles that belong to nobody. Searching "carlos"
-- returned CarlosRodriguez, CarlosRodriguez1 and CarlosRodriguez2, and "ja"
-- returned JavierAlonso, javieralonso1, javieralonso2 and javieralonsoc23a9bb6.
-- Of the nine profiles carrying those two names, only two have an auth.users
-- row: javier (admin@creatives-takeover.com) and javieralonso3
-- (javier@creatives-takeover.com). The rest have no auth record and no email.
--
-- public.profiles has no foreign key to auth.users, so rows can be written for
-- people who never signed up, and 84 of 352 profiles are in that state. Such an
-- account cannot sign in, which means it can never read a message or accept a
-- connection. Offering Message and Connect against it is always a dead end.
--
-- Requiring the auth record is the rule that matches what a person means by a
-- real account, and it is stronger than any name heuristic: a duplicate that
-- copies a real person's name exactly is still excluded.
--
-- These functions are SECURITY DEFINER and owned by postgres, so they can read
-- auth.users. auth.users.id is the primary key, so the EXISTS is an index
-- lookup. The accounts are not deleted, only kept out of search.

CREATE OR REPLACE FUNCTION public.search_message_recipients_v2(p_query text, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH candidates AS (
    SELECT
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      COALESCE(
        p.positioning_line,
        p.startup_tagline,
        p.creative_niche
      ) AS headline,
      public.are_users_connected(
        auth.uid(),
        p.id
      ) AS connected,
      EXISTS (
        SELECT 1
        FROM public.mentors m
        WHERE m.user_id = p.id
          AND COALESCE(m.is_active, true)
      ) AS is_mentor
    FROM public.public_profiles p
    WHERE auth.uid() IS NOT NULL
      AND p.id <> auth.uid()
      AND length(
        trim(COALESCE(p_query, ''))
      ) >= 2
      AND EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id = p.id
      )
      AND COALESCE(btrim(p.full_name), '') <> ''
      AND COALESCE(btrim(p.username), '') <> ''
      AND NOT public.looks_like_generated_account(
        p.full_name,
        p.username
      )
      AND (
        p.full_name ILIKE
          '%' || trim(p_query) || '%'
        OR p.username ILIKE
          '%' || trim(p_query) || '%'
        OR p.startup_name ILIKE
          '%' || trim(p_query) || '%'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.user_blocks b
        WHERE (
          b.blocker_id = auth.uid()
          AND b.blocked_id = p.id
        )
        OR (
          b.blocked_id = auth.uid()
          AND b.blocker_id = p.id
        )
      )
    ORDER BY
      connected DESC,
      is_mentor DESC,
      p.full_name NULLS LAST,
      p.id
    LIMIT LEAST(
      GREATEST(
        COALESCE(p_limit, 20),
        1
      ),
      30
    )
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'fullName', full_name,
        'username', username,
        'avatarUrl', avatar_url,
        'headline', headline,
        'connected', connected,
        'isMentor', is_mentor
      )
      ORDER BY
        connected DESC,
        is_mentor DESC,
        full_name NULLS LAST
    ),
    '[]'::jsonb
  )
  FROM candidates;
$function$;

-- The client falls back to v1, so it carries the same rule.
CREATE OR REPLACE FUNCTION public.search_message_recipients_v1(p_query text, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH candidates AS (
    SELECT p.id, p.full_name, p.username, p.avatar_url,
      public.are_users_connected(auth.uid(), p.id) connected
    FROM public.public_profiles p
    WHERE auth.uid() IS NOT NULL AND p.id <> auth.uid()
      AND COALESCE(trim(p_query), '') <> ''
      AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)
      AND COALESCE(btrim(p.full_name), '') <> ''
      AND COALESCE(btrim(p.username), '') <> ''
      AND NOT public.looks_like_generated_account(p.full_name, p.username)
      AND (p.full_name ILIKE '%' || trim(p_query) || '%' OR p.username ILIKE '%' || trim(p_query) || '%')
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE
        (b.blocker_id = auth.uid() AND b.blocked_id = p.id) OR (b.blocker_id = p.id AND b.blocked_id = auth.uid()))
    ORDER BY connected DESC, p.full_name NULLS LAST, p.id LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 30)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'fullName', full_name, 'username', username, 'avatarUrl', avatar_url, 'connected', connected
  ) ORDER BY connected DESC, full_name NULLS LAST), '[]'::jsonb) FROM candidates;
$function$;
