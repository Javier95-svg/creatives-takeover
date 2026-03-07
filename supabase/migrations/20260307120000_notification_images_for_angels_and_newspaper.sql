-- Ensure platform update notifications use content images instead of actor avatar.
-- 1) Angel investor banner -> use angel profile picture
-- 2) Newspaper article publish -> use article banner image

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
      'route', '/community/angels'
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_all_users_on_newspaper_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  -- Notify on insert only when already published.
  IF TG_OP = 'INSERT' AND NEW.status IS DISTINCT FROM 'published' THEN
    RETURN NEW;
  END IF;

  -- Notify on updates only for draft -> published transitions.
  IF TG_OP = 'UPDATE' AND NOT (NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published') THEN
    RETURN NEW;
  END IF;

  v_actor_id := COALESCE(NEW.author_id, auth.uid());
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
    'newspaper_article_published',
    false,
    jsonb_build_object(
      'article_id', NEW.id,
      'title', NEW.title,
      'slug', NEW.slug,
      'banner_image_url', NEW.banner_image_url,
      'image_url', NEW.banner_image_url,
      'route', '/newspaper/' || NEW.slug
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;
