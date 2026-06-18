-- Re-enable the all-users bell notification when a new mentor joins the network.
--
-- 20260606180000_denoise_notification_bell.sql dropped this trigger (along with
-- the angel and newspaper broadcasts) to de-noise the bell. Product decision has
-- since reversed that for MENTORS specifically: every user should again receive a
-- bell notification when a new mentor joins. Angels and newspaper articles stay
-- off intentionally.
--
-- The trigger function public.notify_all_users_on_new_mentor_banner() still
-- exists (last defined in 20260513090000 with the /mentorship route + image
-- metadata); only the trigger that fires it was removed, so we just re-attach it.

DROP TRIGGER IF EXISTS on_new_mentor_banner_notify_all_users ON public.mentors;
CREATE TRIGGER on_new_mentor_banner_notify_all_users
AFTER INSERT ON public.mentors
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users_on_new_mentor_banner();
