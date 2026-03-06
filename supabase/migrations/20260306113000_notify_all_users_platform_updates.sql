-- Notify all user accounts about key platform updates:
-- 1) New mentor banner (/community)
-- 2) New angel investor banner (/community/angels)
-- 3) New co-founder post (/community/co-founders)
-- 4) Newly published newspaper article (/newspaper)

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
      'route', '/community'
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_mentor_banner_notify_all_users ON public.mentors;
CREATE TRIGGER on_new_mentor_banner_notify_all_users
AFTER INSERT ON public.mentors
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_new_mentor_banner();

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
      'route', '/community/angels'
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_angel_banner_notify_all_users ON public.angel_investors;
CREATE TRIGGER on_new_angel_banner_notify_all_users
AFTER INSERT ON public.angel_investors
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_new_angel_banner();

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
      'route', '/community/co-founders'
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_cofounder_post_notify_all_users ON public.cofounder_posts;
CREATE TRIGGER on_new_cofounder_post_notify_all_users
AFTER INSERT ON public.cofounder_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_new_cofounder_post();

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
      'route', '/newspaper/' || NEW.slug
    )
  FROM auth.users u;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_newspaper_publish_notify_all_users ON public.stories_articles;
CREATE TRIGGER on_newspaper_publish_notify_all_users
AFTER INSERT OR UPDATE ON public.stories_articles
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_newspaper_publish();
