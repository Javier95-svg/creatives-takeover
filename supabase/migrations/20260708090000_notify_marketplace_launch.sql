-- One-time all-user Marketplace launch notifications.
-- Uses the existing platform_update notification type so the bell, realtime
-- toast, route handling, image handling, and web push bridge keep working.

WITH platform_actor AS (
  SELECT COALESCE(
    (
      SELECT u.id
      FROM auth.users u
      WHERE lower(COALESCE(u.email, '')) = 'admin@creatives-takeover.com'
      ORDER BY u.created_at ASC
      LIMIT 1
    ),
    (
      SELECT u.id
      FROM auth.users u
      ORDER BY u.created_at ASC
      LIMIT 1
    )
  ) AS id
)
INSERT INTO public.community_notifications (
  user_id,
  actor_id,
  notification_type,
  read,
  metadata
)
SELECT
  u.id,
  COALESCE((SELECT id FROM platform_actor), u.id),
  'platform_update',
  false,
  jsonb_build_object(
    'slug', 'marketplace-launch',
    'title', 'Marketplace is live',
    'message', 'New section released: Marketplace is now live.',
    'route', '/marketplace',
    'image_url', 'https://creatives-takeover.com/favicon-192x192.png'
  )
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.community_notifications n
  WHERE n.user_id = u.id
    AND n.notification_type = 'platform_update'
    AND COALESCE(n.metadata->>'slug', '') = 'marketplace-launch'
);

WITH platform_actor AS (
  SELECT COALESCE(
    (
      SELECT u.id
      FROM auth.users u
      WHERE lower(COALESCE(u.email, '')) = 'admin@creatives-takeover.com'
      ORDER BY u.created_at ASC
      LIMIT 1
    ),
    (
      SELECT u.id
      FROM auth.users u
      ORDER BY u.created_at ASC
      LIMIT 1
    )
  ) AS id
),
service_row AS (
  SELECT
    s.id,
    s.name,
    s.slug,
    s.delivered_by_name,
    s.delivered_by_picture_url,
    s.banner_url
  FROM public.services s
  WHERE s.slug = 'get-marketing'
    AND COALESCE(s.is_active, true) = true
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
  LIMIT 1
)
INSERT INTO public.community_notifications (
  user_id,
  actor_id,
  notification_type,
  read,
  metadata
)
SELECT
  u.id,
  COALESCE((SELECT id FROM platform_actor), u.id),
  'platform_update',
  false,
  jsonb_build_object(
    'slug', 'marketplace-get-marketing-darya',
    'title', 'Get Marketing is available',
    'message', 'Get Marketing by Darya Kablash available now at Marketplace.',
    'route', '/marketplace/get-marketing',
    'service_id', s.id,
    'service_slug', s.slug,
    'service_name', s.name,
    'provider_name', COALESCE(NULLIF(s.delivered_by_name, ''), 'Darya Kablash'),
    'picture', COALESCE(NULLIF(s.delivered_by_picture_url, ''), NULLIF(s.banner_url, '')),
    'image_url', COALESCE(NULLIF(s.delivered_by_picture_url, ''), NULLIF(s.banner_url, ''))
  )
FROM service_row s
CROSS JOIN auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.community_notifications n
  WHERE n.user_id = u.id
    AND n.notification_type = 'platform_update'
    AND COALESCE(n.metadata->>'slug', '') = 'marketplace-get-marketing-darya'
);
