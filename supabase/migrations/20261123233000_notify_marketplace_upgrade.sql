-- One-time all-account announcement of the upgraded Marketplace (2026-11-23),
-- in the bell as a platform_update, like 20261025140000_notify_startup_pedia_launch.
--
-- The redesign shipped the same day: directory layout with category filters,
-- partner pitch decks, free in-app messages, and the partner questionnaire.
-- Safe to re-run: an account that already has this slug is skipped.
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
    'slug', 'marketplace-upgrade-20261123',
    'title', 'Upgraded: Marketplace',
    'message', 'The Marketplace has been upgraded. Browse our partner companies by category, read their pitch decks and message them for free.',
    'route', '/marketplace',
    'image_url', 'https://creatives-takeover.com/favicon-192x192.png'
  )
FROM auth.users account
CROSS JOIN platform_actor
WHERE NOT EXISTS (
  SELECT 1
  FROM public.community_notifications existing
  WHERE existing.user_id = account.id
    AND existing.notification_type = 'platform_update'
    AND COALESCE(existing.metadata->>'slug', '') = 'marketplace-upgrade-20261123'
);
