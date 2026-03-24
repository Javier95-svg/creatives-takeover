-- Broadcast a one-time bell notification about the refreshed Insighta directories.
INSERT INTO public.community_notifications (
  user_id,
  actor_id,
  notification_type,
  read,
  metadata
)
SELECT
  u.id,
  u.id,
  'platform_update',
  false,
  jsonb_build_object(
    'slug', 'insighta-directory-refresh-20260324',
    'title', 'Insighta directories updated',
    'message', 'VC Search and Accelerator Hunt were refreshed with updated links and profile data.',
    'route', '/insighta',
    'image_url', '/lovable-uploads/new-favicon.png'
  )
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.community_notifications n
  WHERE n.user_id = u.id
    AND n.notification_type = 'platform_update'
    AND COALESCE(n.metadata->>'slug', '') = 'insighta-directory-refresh-20260324'
);
