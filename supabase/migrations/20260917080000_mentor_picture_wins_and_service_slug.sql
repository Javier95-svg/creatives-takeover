-- Two corrections to people search.
--
-- 1. The mentorship picture now beats the profile avatar for mentors.
--
-- The previous rule only fell back when the profile avatar was empty, which
-- missed Daniel Kazani. His avatar_url is a Google OAuth URL that returns HTTP
-- 200, so it counted as present, but it serves Google's generated initial
-- avatar: a coloured circle with a letter, 1034 bytes. His real mentorship
-- photo is 54 KB. A URL being reachable does not make it a photograph, and that
-- cannot be judged from SQL, so precedence is the answer rather than detection.
--
-- All 54 active mentors have a mentorship picture, so none loses an image by
-- this change. 21 switch from a profile avatar to their mentorship photo, and
-- 12 of the current profile avatars are Google OAuth URLs. The mentorship
-- picture is the one they uploaded for their public mentor listing and the one
-- /mentorship already shows, so search now matches that page.
--
-- Marketplace keeps the profile avatar ahead of the listing picture. Only Diego
-- Ryse has both, and nobody has reported it looking wrong.
--
-- 2. The service slug is returned so a provider can link to their listing.
--
-- services.slug is what /marketplace/:slug resolves, for example get-marketing
-- for Darya Kablash. It is returned rather than derived so the link always
-- matches the row.

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
        NULLIF(btrim(mentor.picture), ''),
        NULLIF(btrim(p.avatar_url), ''),
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
      NULLIF(btrim(mentor.name), '') AS mentor_name,
      service.service_id IS NOT NULL AS is_marketplace,
      NULLIF(btrim(service.slug), '') AS service_slug
    FROM public.public_profiles p
    LEFT JOIN LATERAL (
      SELECT m.id AS mentor_id, m.picture, m.name
      FROM public.mentors m
      WHERE m.user_id = p.id
        AND COALESCE(m.is_active, true)
      ORDER BY m.updated_at DESC NULLS LAST, m.created_at DESC NULLS LAST, m.id
      LIMIT 1
    ) mentor ON true
    LEFT JOIN LATERAL (
      SELECT s.id AS service_id, s.delivered_by_picture_url AS picture, s.slug
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
        'mentorName', mentor_name,
        'isMarketplace', is_marketplace,
        'serviceSlug', service_slug
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
