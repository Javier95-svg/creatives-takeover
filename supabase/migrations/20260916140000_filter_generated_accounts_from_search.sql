-- Machine generated signup accounts were surfacing in the workspace account
-- search and in Messages > + New. They carry a random string as a display name
-- and a matching flat lowercase handle, e.g.
--   "WIIxKGHXXlHFmbEPsIOsT fgFzozZAcvyTKNfaDPWBJ" / wiixkghxxlhfmbepsiostfgfzozzacvytknfadpwbj
-- A search for two common letters returned mostly these: "xs" matched 7 of them
-- and no real person at all.
--
-- The accounts are left in place. This only keeps them out of people search.

-- Two signals have to agree before an account is treated as generated:
--   1. the display name switches case inside a word, which typed names do not
--   2. the handle is one long unbroken run of lowercase letters
-- Requiring both is what protects real names that legitimately carry an inner
-- capital: John McKeown, Joe DaBro and DiegoOrdo12 all keep their handles,
-- which are far shorter than the 24 character floor.
CREATE OR REPLACE FUNCTION public.looks_like_generated_account(
  p_full_name text,
  p_username text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $function$
  SELECT COALESCE(p_full_name ~ '[a-z][A-Z]', false)
     AND COALESCE(p_username ~ '^[a-z]+$', false)
     AND COALESCE(length(p_username) > 24, false);
$function$;

COMMENT ON FUNCTION public.looks_like_generated_account(text, text) IS
  'True when a profile name and handle look machine generated rather than typed by a person. Used to keep such accounts out of people search.';

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

-- The client falls back to v1 when v2 is unavailable, so it needs the same
-- filter or the accounts reappear on that path.
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
