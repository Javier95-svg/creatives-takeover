-- New-signup notice for the admins, sent by the server (2026-11-17).
--
-- The notice used to be sent from the new member's browser on their first
-- sign-in (notify-admin), so anyone who never confirmed their email, closed
-- the tab or blocked the call was never reported. Now every new account
-- (email, Google, LinkedIn, X) queues one notice in auth_email_outbox, and
-- auth-email-worker sends it to the admins with retries, reading the account
-- at send time so the notice says whether it is confirmed yet.
--
-- Fail-open: if queuing fails, the signup still goes through (a warning is
-- logged). If the signup itself is rolled back, so is the notice.

CREATE OR REPLACE FUNCTION public.queue_admin_signup_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.is_anonymous, false) THEN
    RETURN NEW;
  END IF;
  BEGIN
    INSERT INTO public.auth_email_outbox (user_id, email_action_type, payload)
    VALUES (
      NEW.id,
      'admin_new_signup',
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'provider', NEW.raw_app_meta_data->>'provider',
        'full_name', COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        'created_at', NEW.created_at
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'queue_admin_signup_notice skipped: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_admin_signup_notice() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_admin_notice ON auth.users;
CREATE TRIGGER on_auth_user_created_admin_notice
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.queue_admin_signup_notice();
