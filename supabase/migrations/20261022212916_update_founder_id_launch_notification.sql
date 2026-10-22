-- Founder ID launch notification, revised (Javier, 2026-10-22): one message
-- for everyone, opening their own profile. Mentors are the only exception and
-- keep the earlier message, which opens /founder-id.
-- Updates the rows sent by 20261022212204_notify_founder_id_launch in place,
-- so nobody gets a second notification. Read state is left as it is.
UPDATE public.community_notifications notification
SET metadata = notification.metadata || jsonb_build_object(
  'title', 'Founder ID available now',
  'message', 'Founder ID available now. Set it up and share your project everywhere.',
  'route', '/profile/' || profile.username
)
FROM public.profiles profile
WHERE profile.id = notification.user_id
  AND notification.notification_type = 'platform_update'
  AND COALESCE(notification.metadata->>'slug', '') = 'founder-id-launch-20261022'
  AND COALESCE(profile.user_type, '') <> 'mentor'
  AND profile.username IS NOT NULL
  AND btrim(profile.username) <> '';
