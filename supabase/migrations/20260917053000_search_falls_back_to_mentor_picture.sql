-- Mentors keep a picture on their mentorship listing that is separate from the
-- profile avatar, and 31 of the 54 active mentors have the former but not the
-- latter. In people search those 31 collapsed to a grey initial even though a
-- photo of them was already on file and shown at /mentorship. Daiana Tokpayeva
-- is the case that surfaced it.
--
-- Falling back to mentors.picture when the profile avatar is missing makes them
-- recognisable in search without asking anyone to re-upload anything. The
-- profile avatar still wins whenever it is set, so a mentor who has deliberately
-- chosen a different profile picture keeps it.
--
-- The client already reads avatarUrl straight off this function, so no frontend
-- change is needed. The pictures are Supabase storage URLs on the project's own
-- origin, the same ones /mentorship renders.
--
-- The EXISTS that computed is_mentor becomes a LEFT JOIN LATERAL so the mentor
-- row is touched once instead of twice. is_mentor keeps its exact meaning: an
-- active mentor row exists, whether or not it carries a picture. The LIMIT 1
-- with a deterministic order keeps the result stable if a user ever holds more
-- than one active mentor row.

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
      COALESCE(
        NULLIF(btrim(p.avatar_url), ''),
        NULLIF(btrim(mentor.picture), '')
      ) AS avatar_url,
      COALESCE(
        p.positioning_line,
        p.startup_tagline,
        p.creative_niche
      ) AS headline,
      public.are_users_connected(
        auth.uid(),
        p.id
      ) AS connected,
      mentor.mentor_id IS NOT NULL AS is_mentor
    FROM public.public_profiles p
    LEFT JOIN LATERAL (
      SELECT m.id AS mentor_id, m.picture
      FROM public.mentors m
      WHERE m.user_id = p.id
        AND COALESCE(m.is_active, true)
      ORDER BY m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST, m.id
      LIMIT 1
    ) mentor ON true
    WHERE auth.uid() IS NOT NULL
      AND p.id <> auth.uid()
      AND length(
        trim(COALESCE(p_query, ''))
      ) >= 2
      AND EXISTS (
        SELECT 1
        FROM auth.users au
        WHERE au.id = p.id
          AND NOT public.is_reserved_or_disposable_email(au.email)
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

-- v1 is the fallback path and shows the same avatars, so it gets the same rule.
CREATE OR REPLACE FUNCTION public.search_message_recipients_v1(p_query text, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH candidates AS (
    SELECT p.id, p.full_name, p.username,
      COALESCE(
        NULLIF(btrim(p.avatar_url), ''),
        NULLIF(btrim(mentor.picture), '')
      ) AS avatar_url,
      public.are_users_connected(auth.uid(), p.id) connected
    FROM public.public_profiles p
    LEFT JOIN LATERAL (
      SELECT m.picture
      FROM public.mentors m
      WHERE m.user_id = p.id AND COALESCE(m.is_active, true)
      ORDER BY m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST, m.id
      LIMIT 1
    ) mentor ON true
    WHERE auth.uid() IS NOT NULL AND p.id <> auth.uid()
      AND COALESCE(trim(p_query), '') <> ''
      AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id
        AND NOT public.is_reserved_or_disposable_email(au.email))
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
