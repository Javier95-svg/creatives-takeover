-- Notify only founders who said during onboarding that they are actively
-- looking for a co-founder. The notification is delivered through the
-- existing community_notifications bell and links back to /co-founder.

DROP TRIGGER IF EXISTS on_new_cofounder_post_notify_all_users
  ON public.cofounder_posts;

-- The discontinued marketplace experience also emitted match notifications
-- from this trigger. Remove it so each new post produces one relevant bell
-- notification instead of duplicate or obsolete marketplace notifications.
DROP TRIGGER IF EXISTS sync_cofounder_marketplace_dashboard_task_v1
  ON public.cofounder_posts;

CREATE OR REPLACE FUNCTION public.notify_active_cofounder_seekers_on_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
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
    recipient.id,
    NEW.user_id,
    'cofounder_post_created',
    false,
    jsonb_build_object(
      'cofounder_post_id', NEW.id,
      'project_name', NEW.project_name,
      'stage', NEW.stage,
      'route', '/co-founder',
      'message', 'A founder published a new co-founder post: ' || NEW.project_name
    )
  FROM public.profiles recipient
  WHERE recipient.id <> NEW.user_id
    AND recipient.user_preferences->>'cofounderSituation' = 'actively_looking'
    AND NOT EXISTS (
      SELECT 1
      FROM public.community_notifications existing
      WHERE existing.user_id = recipient.id
        AND existing.notification_type = 'cofounder_post_created'
        AND existing.metadata->>'cofounder_post_id' = NEW.id::text
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_active_cofounder_seekers_on_new_post
  ON public.cofounder_posts;

CREATE TRIGGER notify_active_cofounder_seekers_on_new_post
AFTER INSERT
ON public.cofounder_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_active_cofounder_seekers_on_new_post();

REVOKE ALL ON FUNCTION public.notify_active_cofounder_seekers_on_new_post()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.notify_active_cofounder_seekers_on_new_post() IS
  'Creates one bell notification for each onboarding user actively looking for a co-founder when a different user publishes an active co-founder post.';
