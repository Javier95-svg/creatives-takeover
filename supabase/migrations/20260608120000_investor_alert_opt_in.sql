-- Re-enable new-investor notifications, opt-in only.
--
-- The de-noise migration (20260606180000) dropped the all-users broadcast on
-- new angel investor profiles — it was 97% of bell volume at a 2% read rate.
-- That was the right call for the bell as a whole, but it also means founders
-- who *do* want to hear about new investors now have no way to. Add an
-- explicit opt-in preference; only users who turn it on get pinged.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS investor_updates boolean NOT NULL DEFAULT false;

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
    np.user_id,
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
  FROM public.notification_preferences np
  WHERE np.investor_updates = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_angel_banner_notify_all_users ON public.angel_investors;
CREATE TRIGGER on_new_angel_banner_notify_all_users
AFTER INSERT ON public.angel_investors
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_new_angel_banner();
