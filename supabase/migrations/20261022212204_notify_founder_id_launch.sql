-- One-time all-account announcement of Founder ID (2026-10-22), in the bell
-- as a platform_update, like earlier launches (20260716160000_notify_gtm_strategist_upgrade).
--
-- Founder ID belongs to founder and builder accounts (src/lib/founderId.ts), so
-- the message differs by account type:
-- - founder, builder (or no type yet): their own Founder ID, where the
--   "Complete your Founder ID" checklist waits;
-- - mentor, marketplace, investor: the /founder-id page, since they have none.
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
  CASE
    WHEN profile.user_type IS NULL OR profile.user_type IN ('founder', 'builder') THEN
      jsonb_build_object(
        'slug', 'founder-id-launch-20261022',
        'title', 'Your Founder ID is ready',
        'message', 'Your Founder ID is ready: one link for your project, your links and your updates. Complete it and share it.',
        'route', CASE
          WHEN profile.username IS NOT NULL AND btrim(profile.username) <> ''
            THEN '/profile/' || profile.username
          ELSE '/founder-id'
        END,
        'image_url', 'https://creatives-takeover.com/favicon-192x192.png'
      )
    ELSE
      jsonb_build_object(
        'slug', 'founder-id-launch-20261022',
        'title', 'Founder ID',
        'message', 'Founders now have a Founder ID: one link for their project, support and updates. See how it works.',
        'route', '/founder-id',
        'image_url', 'https://creatives-takeover.com/favicon-192x192.png'
      )
  END
FROM auth.users account
LEFT JOIN public.profiles profile ON profile.id = account.id
CROSS JOIN platform_actor
WHERE NOT EXISTS (
  SELECT 1
  FROM public.community_notifications existing
  WHERE existing.user_id = account.id
    AND existing.notification_type = 'platform_update'
    AND COALESCE(existing.metadata->>'slug', '') = 'founder-id-launch-20261022'
);
