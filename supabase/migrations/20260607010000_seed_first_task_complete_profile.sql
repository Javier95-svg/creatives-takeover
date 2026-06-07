-- Retention/onboarding: the first task every new founder sees is to complete
-- their startup profile — the action that makes the rest of the platform tailor
-- itself to them. Seeded as a high-priority daily task on profile creation.
--
-- Isolated AFTER INSERT trigger on profiles (wrapped so it can never roll back
-- the signup), mirroring create_user_credits_for_profile / create_subscriber_for_profile.

CREATE OR REPLACE FUNCTION public.seed_first_task_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(COALESCE(email, '')) INTO v_email FROM auth.users WHERE id = NEW.id;

  -- Skip the admin bootstrap account.
  IF v_email = 'admin@creatives-takeover.com' THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.daily_tasks (
      user_id, task_date, task_text, task_description,
      deadline_time, priority, task_source, source_route
    )
    VALUES (
      NEW.id,
      current_date,
      'Complete your startup profile',
      'Add your startup name, stage, industry and positioning so the platform can tailor your tools, tasks and mentor matches to you.',
      (current_date + interval '3 days')::timestamptz,
      'high',
      'platform',
      '/dashboard'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG '[seed_first_task_for_profile] non-fatal failure user=% msg=%', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_seed_first_task ON public.profiles;
CREATE TRIGGER trg_profile_seed_first_task
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_first_task_for_profile();

-- Backfill the existing test account so it's visible immediately (idempotent).
INSERT INTO public.daily_tasks (
  user_id, task_date, task_text, task_description, deadline_time, priority, task_source, source_route
)
SELECT
  au.id, current_date, 'Complete your startup profile',
  'Add your startup name, stage, industry and positioning so the platform can tailor your tools, tasks and mentor matches to you.',
  (current_date + interval '3 days')::timestamptz, 'high', 'platform', '/dashboard'
FROM auth.users au
WHERE au.email = 'javier@creatives-takeover.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.daily_tasks t
    WHERE t.user_id = au.id AND t.task_text = 'Complete your startup profile'
  );
