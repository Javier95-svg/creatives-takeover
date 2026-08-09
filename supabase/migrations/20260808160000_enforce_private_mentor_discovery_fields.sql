-- Later mentor-maintenance migrations may repopulate contact_email. Capture any
-- such address in the private settings table, then enforce column-level privacy.
INSERT INTO public.mentor_discovery_call_settings (
  mentor_id, notification_email, discovery_calls_enabled,
  legacy_provider, legacy_booking_url
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
    legacy_provider = COALESCE(public.mentor_discovery_call_settings.legacy_provider, EXCLUDED.legacy_provider),
    legacy_booking_url = COALESCE(public.mentor_discovery_call_settings.legacy_booking_url, EXCLUDED.legacy_booking_url);

UPDATE public.mentors
SET contact_email = NULL,
    calendly_url = NULL,
    booking_provider = 'manual'
WHERE contact_email IS NOT NULL OR calendly_url IS NOT NULL OR booking_provider <> 'manual';

-- A table-level SELECT grant makes column revokes ineffective, so replace it
-- with an explicit public projection that excludes all scheduling secrets.
REVOKE SELECT ON public.mentors FROM anon, authenticated;
GRANT SELECT (
  id, user_id, name, picture, bio, hourly_rate, hourly_rate_per_hour,
  currency, stripe_connected_account_id, expertise, rating, review_count,
  availability, is_active, is_featured, linkedin_url, twitter_x_url,
  website_url, nationality, universities, created_at, updated_at
) ON public.mentors TO anon, authenticated;

COMMENT ON COLUMN public.mentors.contact_email IS
  'Deprecated and intentionally unreadable to public roles. Use private mentor_discovery_call_settings.';
COMMENT ON COLUMN public.mentors.calendly_url IS
  'Deprecated and intentionally unreadable to public roles. V2 has no external booking fallback.';
COMMENT ON COLUMN public.mentors.booking_provider IS
  'Deprecated and intentionally unreadable to public roles. V2 is provider-independent.';
