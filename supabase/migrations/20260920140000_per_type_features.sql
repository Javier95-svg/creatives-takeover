-- Per account type features: the home digest, the mentor surfaces, view
-- analytics, investor matches and the notification channels.
--
-- Everything the mentor needs already existed and was blocked by RLS rather
-- than missing. Definer RPCs rather than widened policies: discovery_calls
-- SELECT is load bearing, and list_account_applications is the established
-- shape for "the caller may read exactly their own slice".

-- ---------------------------------------------------------------- entity views
-- Nothing recorded a profile or listing view. Modelled on the existing vc_views
-- triple, with the owner denormalised so "my analytics" is one indexed lookup
-- rather than a join back through three directory tables.
CREATE TABLE IF NOT EXISTS public.entity_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('mentor', 'service', 'investor')),
  entity_id uuid NOT NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Hashed session for signed out visitors. Never a raw IP.
  viewer_key text NOT NULL,
  viewed_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

-- One view per viewer per entity per day. A refresh must not inflate somebody's
-- number, or the whole feature stops being worth showing.
CREATE UNIQUE INDEX IF NOT EXISTS entity_views_once_per_day
  ON public.entity_views (entity_id, viewer_key, viewed_on);
CREATE INDEX IF NOT EXISTS entity_views_owner_day
  ON public.entity_views (owner_user_id, viewed_on DESC) WHERE owner_user_id IS NOT NULL;

ALTER TABLE public.entity_views ENABLE ROW LEVEL SECURITY;

-- Only the owner reads their own analytics. No insert or update policy at all:
-- rows arrive through record_entity_view, so a viewer cannot forge them.
DROP POLICY IF EXISTS "Owners read their own views" ON public.entity_views;
CREATE POLICY "Owners read their own views"
  ON public.entity_views FOR SELECT
  USING (owner_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.record_entity_view(
  p_entity_type text,
  p_entity_id uuid,
  p_viewer_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_owner uuid;
  v_viewer uuid := auth.uid();
BEGIN
  IF p_entity_type NOT IN ('mentor', 'service', 'investor') THEN
    RETURN;
  END IF;

  v_owner := CASE p_entity_type
    WHEN 'mentor'   THEN (SELECT m.user_id FROM public.mentors m WHERE m.id = p_entity_id)
    WHEN 'service'  THEN (SELECT s.delivered_by_user_id FROM public.services s WHERE s.id = p_entity_id)
    WHEN 'investor' THEN (SELECT a.user_id FROM public.angel_investors a WHERE a.id = p_entity_id)
  END;

  -- Nobody inflates their own count by opening their own page.
  IF v_owner IS NOT NULL AND v_owner = v_viewer THEN
    RETURN;
  END IF;

  INSERT INTO public.entity_views (entity_type, entity_id, owner_user_id, viewer_id, viewer_key)
  VALUES (
    p_entity_type,
    p_entity_id,
    v_owner,
    v_viewer,
    -- A signed in viewer is keyed by their id, so they cannot multiply
    -- themselves by clearing storage.
    COALESCE(v_viewer::text, NULLIF(btrim(p_viewer_key), ''), 'anonymous')
  )
  ON CONFLICT (entity_id, viewer_key, viewed_on) DO NOTHING;
END;
$function$;

-- Daily counts for whatever the caller owns.
CREATE OR REPLACE FUNCTION public.entity_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'totalViews', COALESCE(COUNT(*), 0),
    'uniqueViewers', COALESCE(COUNT(DISTINCT v.viewer_key), 0),
    'daily', COALESCE(jsonb_agg(DISTINCT jsonb_build_object('day', v.viewed_on)) FILTER (WHERE v.id IS NOT NULL), '[]'::jsonb),
    'byEntity', COALESCE((
      SELECT jsonb_agg(row)
      FROM (
        SELECT jsonb_build_object('entityType', e.entity_type, 'entityId', e.entity_id, 'views', COUNT(*)) AS row
        FROM public.entity_views e
        WHERE e.owner_user_id = auth.uid()
          AND e.viewed_on >= (now() AT TIME ZONE 'utc')::date - GREATEST(p_days, 1)
        GROUP BY e.entity_type, e.entity_id
      ) grouped
    ), '[]'::jsonb)
  )
  FROM public.entity_views v
  WHERE v.owner_user_id = auth.uid()
    AND v.viewed_on >= (now() AT TIME ZONE 'utc')::date - GREATEST(p_days, 1);
$function$;

-- --------------------------------------------------------------- mentor inbox
-- discovery_calls SELECT is (founder_id = auth.uid() OR admin), so a mentor
-- cannot see the bookings that are addressed to them. This reads exactly the
-- calls belonging to the caller's own mentor rows.
CREATE OR REPLACE FUNCTION public.mentor_bookings(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'createdAt' DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'status', c.status,
      'scheduledFor', c.scheduled_for,
      'createdAt', c.created_at,
      'founderName', COALESCE(p.full_name, p.username),
      'founderUsername', p.username,
      'founderAvatar', p.avatar_url,
      'serviceId', c.service_id
    ) AS row
    FROM public.discovery_calls c
    JOIN public.mentors m ON m.id = c.mentor_id AND m.user_id = auth.uid()
    LEFT JOIN public.profiles p ON p.id = c.founder_id
    WHERE auth.uid() IS NOT NULL
    ORDER BY c.created_at DESC
    LIMIT GREATEST(p_limit, 1)
  ) rows;
$function$;

-- Who saved you and who reached out. Both tables are readable only by the actor
-- today, which is right for them and useless for the person on the other side.
CREATE OR REPLACE FUNCTION public.mentor_interest(p_limit integer DEFAULT 25)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'saves', COALESCE((
      SELECT jsonb_agg(row ORDER BY row->>'savedAt' DESC)
      FROM (
        SELECT jsonb_build_object(
          'savedAt', s.created_at,
          'name', COALESCE(p.full_name, p.username),
          'username', p.username,
          'avatar', p.avatar_url
        ) AS row
        FROM public.mentor_saves s
        JOIN public.mentors m ON m.id = s.mentor_id AND m.user_id = auth.uid()
        LEFT JOIN public.profiles p ON p.id = s.user_id
        ORDER BY s.created_at DESC
        LIMIT GREATEST(p_limit, 1)
      ) saves
    ), '[]'::jsonb),
    'contacts', COALESCE((
      SELECT jsonb_agg(row ORDER BY row->>'occurredAt' DESC)
      FROM (
        SELECT jsonb_build_object(
          'occurredAt', e.occurred_at,
          'interaction', e.interaction_type,
          'name', COALESCE(p.full_name, p.username),
          'username', p.username,
          'avatar', p.avatar_url
        ) AS row
        FROM public.social_interaction_events e
        LEFT JOIN public.profiles p ON p.id = e.actor_user_id
        WHERE e.counterparty_user_id = auth.uid()
        ORDER BY e.occurred_at DESC
        LIMIT GREATEST(p_limit, 1)
      ) contacts
    ), '[]'::jsonb)
  );
$function$;

-- ------------------------------------------------------------ investor matches
-- Founders whose sector and stage overlap what the caller backs, ranked by how
-- much. Profile and project fields only, never an email address, and only
-- approved founders and builders.
CREATE OR REPLACE FUNCTION public.investor_matches(p_limit integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH me AS (
    SELECT
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(p.role_profile->'sectors')), '{}') AS sectors,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(p.role_profile->'stages')), '{}') AS stages
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.user_type = 'investor' AND p.approval_status = 'approved'
  )
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'score')::int DESC, row->>'name'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'userId', f.id,
      'name', COALESCE(f.full_name, f.username),
      'username', f.username,
      'avatar', f.avatar_url,
      'sectors', f.startup_industry,
      'stage', f.assigned_stage,
      'projectTitle', pr.title,
      'projectSummary', pr.idea_summary,
      'score', (
        SELECT COUNT(*) FROM unnest(COALESCE(f.startup_industry, '{}'::text[])) s
        WHERE s = ANY (me.sectors)
      )
    ) AS row
    FROM public.profiles f
    JOIN me ON true
    LEFT JOIN LATERAL (
      SELECT p2.title, p2.idea_summary
      FROM public.projects p2
      WHERE p2.user_id = f.id AND p2.archived_at IS NULL
      ORDER BY p2.created_at DESC
      LIMIT 1
    ) pr ON true
    WHERE f.user_type IN ('founder', 'builder')
      AND f.approval_status = 'approved'
      AND f.id <> auth.uid()
      AND pr.title IS NOT NULL
      AND (
        cardinality(me.sectors) = 0
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(f.startup_industry, '{}'::text[])) s
          WHERE s = ANY (me.sectors)
        )
      )
    LIMIT GREATEST(p_limit, 1)
  ) rows;
$function$;

-- ---------------------------------------------------------------- home digest
-- The counts behind the per type home chips and focus lines. One call, and it
-- returns only what the caller's own type needs.
CREATE OR REPLACE FUNCTION public.account_home_digest()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'pendingRequests', CASE WHEN p.user_type = 'mentor' THEN (
      SELECT COUNT(*) FROM public.discovery_calls c
      JOIN public.mentors m ON m.id = c.mentor_id AND m.user_id = p.id
      WHERE c.status = 'pending_mentor_response'
    ) END,
    'newSaves', CASE WHEN p.user_type = 'mentor' THEN (
      SELECT COUNT(*) FROM public.mentor_saves s
      JOIN public.mentors m ON m.id = s.mentor_id AND m.user_id = p.id
      WHERE s.created_at > now() - interval '30 days'
    ) END,
    'newEnquiries', CASE WHEN p.user_type = 'marketplace' THEN (
      SELECT COUNT(*) FROM public.social_interaction_events e
      WHERE e.counterparty_user_id = p.id AND e.occurred_at > now() - interval '30 days'
    ) END,
    'newMatches', CASE WHEN p.user_type = 'investor' AND p.approval_status = 'approved' THEN (
      SELECT jsonb_array_length(public.investor_matches(30))
    ) END,
    'profileViews', CASE WHEN p.user_type IN ('mentor', 'marketplace', 'investor') THEN (
      SELECT COUNT(*) FROM public.entity_views v
      WHERE v.owner_user_id = p.id AND v.viewed_on > (now() AT TIME ZONE 'utc')::date - 30
    ) END,
    'unreadMessages', (
      SELECT COALESCE((public.get_workspace_header_counts()->>'unreadMessages')::int, 0)
    )
  ))
  FROM public.profiles p
  WHERE p.id = auth.uid();
$function$;

-- ------------------------------------------------------ notification channels
-- notification_preferences already carries a boolean per channel and
-- notif_pref_enabled already reads it, so a new channel is a column plus a CASE
-- branch rather than a parallel system.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS discovery_call_request_in_app_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS discovery_call_request_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS listing_enquiry_in_app_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS listing_enquiry_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS investor_match_in_app_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS investor_match_email_enabled boolean NOT NULL DEFAULT true;

GRANT EXECUTE ON FUNCTION public.record_entity_view(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.entity_analytics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_bookings(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mentor_interest(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.investor_matches(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_home_digest() TO authenticated;
