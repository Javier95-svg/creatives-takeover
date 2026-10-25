-- One-time all-account announcement of Startup Pedia (2026-10-25), in the
-- bell as a platform_update, like 20261022212204_notify_founder_id_launch.
--
-- Startup Pedia sits in the workspace Bonus section for founders, builders,
-- mentors and marketplace accounts. Investor accounts have no Bonus section,
-- so their copy does not point there.
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
    'slug', 'startup-pedia-launch-20261025',
    'title', 'New section: Startup Pedia',
    'message', CASE
      WHEN profile.user_type = 'investor'
        THEN 'New section: Startup Pedia is now available. Plain-English startup terms, metrics and how-to guides.'
      ELSE 'New section: Startup Pedia is now available in Bonus. Plain-English startup terms, metrics and how-to guides.'
    END,
    'route', '/startup-pedia',
    'image_url', 'https://creatives-takeover.com/favicon-192x192.png'
  )
FROM auth.users account
LEFT JOIN public.profiles profile ON profile.id = account.id
CROSS JOIN platform_actor
WHERE NOT EXISTS (
  SELECT 1
  FROM public.community_notifications existing
  WHERE existing.user_id = account.id
    AND existing.notification_type = 'platform_update'
    AND COALESCE(existing.metadata->>'slug', '') = 'startup-pedia-launch-20261025'
);
