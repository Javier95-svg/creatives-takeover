-- One-time all-user announcement for the upgraded GTM Strategist.
WITH platform_actor AS (
  SELECT COALESCE(
    (
      SELECT account.id
      FROM auth.users account
      WHERE lower(COALESCE(account.email, '')) = 'admin@creatives-takeover.com'
      ORDER BY account.created_at ASC
      LIMIT 1
    ),
    (
      SELECT account.id
      FROM auth.users account
      ORDER BY account.created_at ASC
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
  account.id,
  COALESCE(platform_actor.id, account.id),
  'platform_update',
  false,
  jsonb_build_object(
    'slug', 'gtm-strategist-upgrade-20260716',
    'title', 'GTM Strategist upgraded',
    'message', 'GTM Strategist upgraded. Available now.',
    'route', '/go-to-market',
    'image_url', 'https://creatives-takeover.com/favicon-192x192.png'
  )
FROM auth.users account
CROSS JOIN platform_actor
WHERE NOT EXISTS (
  SELECT 1
  FROM public.community_notifications existing
  WHERE existing.user_id = account.id
    AND existing.notification_type = 'platform_update'
    AND COALESCE(existing.metadata->>'slug', '') = 'gtm-strategist-upgrade-20260716'
);
