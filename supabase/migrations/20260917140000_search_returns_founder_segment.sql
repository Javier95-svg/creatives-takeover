-- Returns the Founder/Builder segment so account search can tag every result,
-- the same way it already tags mentors and marketplace providers.
--
-- Read from public.profiles rather than public_profiles, because the segment is
-- not in that view and widening a view used across the app for one badge is a
-- larger change than this needs. The lookup is by primary key.
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
      NULLIF(btrim(service.slug), '') AS service_slug,
      (SELECT pr.founder_segment FROM public.profiles pr WHERE pr.id = p.id) AS founder_segment
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
        'serviceSlug', service_slug,
        'founderSegment', founder_segment
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
