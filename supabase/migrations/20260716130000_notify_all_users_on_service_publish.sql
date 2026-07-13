-- Notify every account when a Marketplace service becomes available.
-- Covers both services created as active and drafts activated later. The
-- service_id metadata guard makes delivery idempotent per account/service.

CREATE OR REPLACE FUNCTION public.notify_all_users_on_service_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_provider_name text;
  v_message text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
    AND NOT (NEW.is_active = true AND OLD.is_active IS DISTINCT FROM true)
  THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    NEW.delivered_by_user_id,
    auth.uid(),
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
  )
  INTO v_actor_id;

  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_provider_name := COALESCE(
    NULLIF(TRIM(NEW.delivered_by_name), ''),
    'Creatives Takeover'
  );
  v_message := format(
    '%s by %s available now at Marketplace',
    NEW.name,
    v_provider_name
  );

  INSERT INTO public.community_notifications (
    user_id,
    actor_id,
    notification_type,
    read,
    metadata
  )
  SELECT
    account.id,
    v_actor_id,
    'platform_update',
    false,
    jsonb_strip_nulls(jsonb_build_object(
      'slug', 'marketplace-service-' || NEW.id::text,
      'title', NEW.name || ' is available',
      'message', v_message,
      'route', '/marketplace/' || NEW.slug,
      'service_id', NEW.id,
      'service_slug', NEW.slug,
      'service_name', NEW.name,
      'provider_name', v_provider_name,
      'picture', COALESCE(NULLIF(NEW.delivered_by_picture_url, ''), NULLIF(NEW.banner_url, '')),
      'image_url', COALESCE(NULLIF(NEW.delivered_by_picture_url, ''), NULLIF(NEW.banner_url, ''))
    ))
  FROM auth.users account
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.community_notifications existing
    WHERE existing.user_id = account.id
      AND existing.notification_type = 'platform_update'
      AND existing.metadata->>'service_id' = NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_all_users_on_service_publish
  ON public.services;

CREATE TRIGGER notify_all_users_on_service_publish
AFTER INSERT OR UPDATE OF is_active
ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_service_publish();

REVOKE ALL ON FUNCTION public.notify_all_users_on_service_publish()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.notify_all_users_on_service_publish() IS
  'Creates one Marketplace bell notification per account when a service is first published.';

-- Backfill active services that were published before the trigger existed.
-- The original Get Marketing launch rows already include service_id, so they
-- are retained without sending that announcement twice.
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
  COALESCE(service.delivered_by_user_id, platform_actor.id, account.id),
  'platform_update',
  false,
  jsonb_strip_nulls(jsonb_build_object(
    'slug', 'marketplace-service-' || service.id::text,
    'title', service.name || ' is available',
    'message', format(
      '%s by %s available now at Marketplace',
      service.name,
      COALESCE(NULLIF(TRIM(service.delivered_by_name), ''), 'Creatives Takeover')
    ),
    'route', '/marketplace/' || service.slug,
    'service_id', service.id,
    'service_slug', service.slug,
    'service_name', service.name,
    'provider_name', COALESCE(NULLIF(TRIM(service.delivered_by_name), ''), 'Creatives Takeover'),
    'picture', COALESCE(NULLIF(service.delivered_by_picture_url, ''), NULLIF(service.banner_url, '')),
    'image_url', COALESCE(NULLIF(service.delivered_by_picture_url, ''), NULLIF(service.banner_url, ''))
  ))
FROM public.services service
CROSS JOIN auth.users account
CROSS JOIN platform_actor
WHERE service.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.community_notifications existing
    WHERE existing.user_id = account.id
      AND existing.notification_type = 'platform_update'
      AND existing.metadata->>'service_id' = service.id::text
  );
