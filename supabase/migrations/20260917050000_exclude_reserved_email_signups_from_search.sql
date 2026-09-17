-- Two internal test accounts still reached people search because they hold real
-- auth records, so the signup requirement alone did not catch them:
--   ICP E2E / icpe2e                      icp.e2e.34324298@example.com
--   pentest-rls-test-7382 / pentestrlstest7382  pentest-rls-test-7382@sharklasers.com
--
-- example.com is reserved by RFC 2606 and can never receive mail, and
-- sharklasers.com is a throwaway inbox service. An account registered at either
-- is a test fixture, never a person, so it has no place in a directory that
-- offers Message and Connect.
--
-- Matching on the domain alone is deliberate. Local part heuristics such as
-- '%test%' would catch real addresses, and both targets are already caught here
-- without guessing at names.
--
-- The remaining ICP and stress test rows (copilottest, copilottest1,
-- stresstest17710350333321396, Test) have no auth record at all and are already
-- excluded by the signup requirement in 20260916160000.

CREATE OR REPLACE FUNCTION public.is_reserved_or_disposable_email(p_email text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $function$
  SELECT COALESCE(
    split_part(lower(btrim(p_email)), '@', 2) IN (
      -- RFC 2606 / RFC 6761 reserved, cannot receive mail
      'example.com', 'example.org', 'example.net', 'invalid', 'localhost', 'test',
      -- throwaway inbox services
      'sharklasers.com', 'guerrillamail.com', 'mailinator.com', 'yopmail.com',
      'tempmail.com', '10minutemail.com', 'trashmail.com', 'getnada.com',
      'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'temp-mail.org',
      'throwawaymail.com', 'mohmal.com', 'spamgourmet.com'
    ),
    false
  );
$function$;

COMMENT ON FUNCTION public.is_reserved_or_disposable_email(text) IS
  'True when an address belongs to a reserved or throwaway mail domain, meaning the account is a test fixture rather than a person.';

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
