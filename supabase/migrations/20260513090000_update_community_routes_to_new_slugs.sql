-- Move community-facing notification routes to the new public slugs.
-- Historical migrations keep the original routes for auditability; this forward
-- migration updates live notification metadata and trigger-generated routes.

UPDATE public.community_notifications
SET metadata = jsonb_set(
  metadata,
  '{route}',
  to_jsonb(
    CASE
      WHEN metadata->>'route' LIKE '/community/co-founders%' THEN regexp_replace(metadata->>'route', '^/community/co-founders', '/co-founder')
      WHEN metadata->>'route' LIKE '/community/angels%' THEN regexp_replace(metadata->>'route', '^/community/angels', '/investors')
      WHEN metadata->>'route' LIKE '/community%' THEN regexp_replace(metadata->>'route', '^/community', '/mentorship')
      ELSE metadata->>'route'
    END
  ),
  true
)
WHERE metadata ? 'route'
  AND metadata->>'route' LIKE '/community%';

CREATE OR REPLACE FUNCTION public.notify_all_users_on_new_mentor_banner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  v_actor_id := COALESCE(NEW.user_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.community_notifications (
    user_id,
    actor_id,
    notification_type,
    read,
    metadata
  )
  SELECT
    u.id,
    v_actor_id,
    'mentor_banner_created',
    false,
    jsonb_build_object(
      'mentor_id', NEW.id,
      'mentor_name', NEW.name,
      'picture', NEW.picture,
      'image_url', NEW.picture,
      'route', '/mentorship'
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_all_users_on_new_angel_banner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.community_notifications (
    user_id,
    actor_id,
    notification_type,
    read,
    metadata
  )
  SELECT
    u.id,
    v_actor_id,
    'angel_banner_created',
    false,
    jsonb_build_object(
      'angel_id', NEW.id,
      'name', NEW.name,
      'firm_name', NEW.firm_name,
      'picture', NEW.picture,
      'image_url', NEW.picture,
      'route', '/investors'
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_all_users_on_new_cofounder_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;

  v_actor_id := COALESCE(NEW.user_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.community_notifications (
    user_id,
    actor_id,
    notification_type,
    read,
    metadata
  )
  SELECT
    u.id,
    v_actor_id,
    'cofounder_post_created',
    false,
    jsonb_build_object(
      'cofounder_post_id', NEW.id,
      'project_name', NEW.project_name,
      'stage', NEW.stage,
      'route', '/co-founder'
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;
