-- Discovery Call V2 keeps mentor notification details and legacy provider URLs
-- outside the publicly readable mentors table.

CREATE TABLE IF NOT EXISTS public.mentor_discovery_call_settings (
  mentor_id UUID PRIMARY KEY REFERENCES public.mentors(id) ON DELETE CASCADE,
  notification_email TEXT NOT NULL,
  discovery_calls_enabled BOOLEAN NOT NULL DEFAULT false,
  legacy_provider TEXT CHECK (
    legacy_provider IS NULL OR legacy_provider IN (
      'calendly', 'koalendar', 'google_calendar', 'cal_com', 'other'
    )
  ),
  legacy_booking_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mentor_discovery_settings_email_check CHECK (
    notification_email = lower(btrim(notification_email))
    AND notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  CONSTRAINT mentor_discovery_settings_url_check CHECK (
    legacy_booking_url IS NULL OR legacy_booking_url ~* '^https://'
  )
);

CREATE INDEX IF NOT EXISTS mentor_discovery_settings_enabled_idx
  ON public.mentor_discovery_call_settings (discovery_calls_enabled)
  WHERE discovery_calls_enabled;

ALTER TABLE public.mentor_discovery_call_settings ENABLE ROW LEVEL SECURITY;

-- No client role receives a policy. Admin access is mediated by the
-- authenticated discovery-call-service function, which performs its own admin
-- check and uses the service role only after authorization succeeds.
DROP POLICY IF EXISTS "Admins can read mentor discovery settings"
  ON public.mentor_discovery_call_settings;
DROP POLICY IF EXISTS "Admins can manage mentor discovery settings"
  ON public.mentor_discovery_call_settings;

CREATE OR REPLACE FUNCTION public.set_mentor_discovery_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.notification_email := lower(btrim(NEW.notification_email));
  NEW.legacy_booking_url := NULLIF(btrim(COALESCE(NEW.legacy_booking_url, '')), '');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mentor_discovery_settings_updated_at
  ON public.mentor_discovery_call_settings;
CREATE TRIGGER mentor_discovery_settings_updated_at
  BEFORE INSERT OR UPDATE ON public.mentor_discovery_call_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_mentor_discovery_settings_updated_at();

-- Backfill only mentors with a usable address. Calls stay disabled until an
-- administrator explicitly opts the mentor into the new workflow.
INSERT INTO public.mentor_discovery_call_settings (
  mentor_id,
  notification_email,
  discovery_calls_enabled,
  legacy_provider,
  legacy_booking_url
)
SELECT
  m.id,
  lower(btrim(m.contact_email)),
  false,
  CASE
    WHEN lower(COALESCE(m.calendly_url, '')) LIKE '%calendar.google.%'
      OR lower(COALESCE(m.calendly_url, '')) LIKE '%google.com/calendar%' THEN 'google_calendar'
    WHEN lower(COALESCE(m.calendly_url, '')) LIKE '%cal.com/%' THEN 'cal_com'
    WHEN lower(COALESCE(m.calendly_url, '')) LIKE '%koalendar.com/%' THEN 'koalendar'
    WHEN lower(COALESCE(m.calendly_url, '')) LIKE '%calendly.com/%' THEN 'calendly'
    WHEN NULLIF(btrim(COALESCE(m.calendly_url, '')), '') IS NOT NULL THEN 'other'
    ELSE NULL
  END,
  NULLIF(btrim(COALESCE(m.calendly_url, '')), '')
FROM public.mentors m
WHERE lower(btrim(COALESCE(m.contact_email, ''))) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
ON CONFLICT (mentor_id) DO UPDATE
SET notification_email = EXCLUDED.notification_email,
    legacy_provider = COALESCE(
      public.mentor_discovery_call_settings.legacy_provider,
      EXCLUDED.legacy_provider
    ),
    legacy_booking_url = COALESCE(
      public.mentor_discovery_call_settings.legacy_booking_url,
      EXCLUDED.legacy_booking_url
    );

-- Public clients need only a boolean. Security-definer prevents the private
-- email and retained URL from leaking through the mentors RLS policy.
CREATE OR REPLACE FUNCTION public.get_mentor_discovery_call_availability(p_mentor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentors m
    JOIN public.mentor_discovery_call_settings s ON s.mentor_id = m.id
    WHERE m.id = p_mentor_id
      AND COALESCE(m.is_active, false)
      AND s.discovery_calls_enabled
      AND s.notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_mentor_discovery_call_availability_bulk(p_mentor_ids UUID[])
RETURNS TABLE (mentor_id UUID, discovery_call_available BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT requested.mentor_id,
         COALESCE(m.is_active, false)
           AND COALESCE(s.discovery_calls_enabled, false)
           AND COALESCE(s.notification_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$', false)
  FROM unnest(COALESCE(p_mentor_ids, ARRAY[]::UUID[])) AS requested(mentor_id)
  LEFT JOIN public.mentors m ON m.id = requested.mentor_id
  LEFT JOIN public.mentor_discovery_call_settings s ON s.mentor_id = requested.mentor_id;
$$;

REVOKE ALL ON TABLE public.mentor_discovery_call_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.mentor_discovery_call_settings TO service_role;

REVOKE ALL ON FUNCTION public.get_mentor_discovery_call_availability(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mentor_discovery_call_availability(UUID)
  TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_mentor_discovery_call_availability_bulk(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mentor_discovery_call_availability_bulk(UUID[])
  TO anon, authenticated, service_role;

COMMENT ON COLUMN public.mentors.contact_email IS
  'Deprecated public-table field. Discovery Call V2 uses mentor_discovery_call_settings.notification_email.';
COMMENT ON COLUMN public.mentors.calendly_url IS
  'Deprecated public-table field. Retained provider URLs live in private mentor_discovery_call_settings.';
COMMENT ON COLUMN public.mentors.booking_provider IS
  'Deprecated public-table field. Discovery Call V2 does not depend on external providers.';
