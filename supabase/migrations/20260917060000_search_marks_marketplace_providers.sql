-- Marketplace providers get the same treatment mentors received: their listing
-- picture fills in for a missing profile avatar, and search labels them so they
-- are recognisable.
--
-- public.services carries delivered_by_picture_url, the headshot or logo shown
-- on the listing at /marketplace. Of the five active services, four are linked
-- to an account through delivered_by_user_id, and three of those four have no
-- profile avatar: Darya Kablash (Get Marketing), Harsh Ladani (Botpro
-- Solutions) and Crystal Dong (Ops Automation Sprint). Diego Ryse (Shefa Co.)
-- already has one and keeps it.
--
-- Apiceflow has no delivered_by_user_id, so it belongs to no account and cannot
-- be labelled or given a picture here. That is a data gap on the service row,
-- not something this function can resolve.
--
-- Note the label follows the account that receives the direct message, not the
-- trading name. Ops Automation Sprint is delivered by "Jidoka Group" but the
-- messages reach Crystal Dong, so her account carries the badge.
--
-- Avatar precedence is profile, then mentorship, then marketplace. A picture a
-- person chose for their profile always wins.

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
        NULLIF(btrim(mentor.picture), ''),
        NULLIF(btrim(service.picture), '')
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
      mentor.mentor_id IS NOT NULL AS is_mentor,
      service.service_id IS NOT NULL AS is_marketplace
    FROM public.public_profiles p
    LEFT JOIN LATERAL (
      SELECT m.id AS mentor_id, m.picture
      FROM public.mentors m
      WHERE m.user_id = p.id
        AND COALESCE(m.is_active, true)
      ORDER BY m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST, m.id
      LIMIT 1
    ) mentor ON true
    LEFT JOIN LATERAL (
      SELECT s.id AS service_id, s.delivered_by_picture_url AS picture
      FROM public.services s
      WHERE s.delivered_by_user_id = p.id
        AND COALESCE(s.is_active, true)
      ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.id
      LIMIT 1
    ) service ON true
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
        'isMentor', is_mentor,
        'isMarketplace', is_marketplace
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

-- v1 is the fallback path. It has no badge fields, but it shows the same
-- avatars, so it gets the same picture chain.
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
        NULLIF(btrim(mentor.picture), ''),
        NULLIF(btrim(service.picture), '')
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
    LEFT JOIN LATERAL (
      SELECT s.delivered_by_picture_url AS picture
      FROM public.services s
      WHERE s.delivered_by_user_id = p.id AND COALESCE(s.is_active, true)
      ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST, s.id
      LIMIT 1
    ) service ON true
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
