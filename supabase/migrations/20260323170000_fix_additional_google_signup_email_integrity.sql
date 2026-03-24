-- Repair additional dotted Gmail corruption cases reported after the initial March 21 fix.
-- This follows the same guarded pattern: update auth.users first, then sync public.subscribers.

DO $$
DECLARE
  email_fix RECORD;
  target_user_id UUID;
  conflicting_user_id UUID;
  conflicting_subscriber_id UUID;
BEGIN
  FOR email_fix IN
    SELECT *
    FROM (
      VALUES
        ('a.nad.efe.d.3.3@gmail.com', 'anadefed33@gmail.com'),
        ('a.qo.su.j.ul.av44@gmail.com', 'aqosujulav44@gmail.com'),
        ('erik..kot.e.r.b.a@gmail.com', 'erikkoterba@gmail.com'),
        ('jo.sh.u.a.da.ri.lek@gmail.com', 'joshuadarilek@gmail.com')
    ) AS fixes(old_email, new_email)
  LOOP
    SELECT u.id
    INTO target_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(email_fix.old_email)
    LIMIT 1;

    IF target_user_id IS NULL THEN
      RAISE NOTICE '[EMAIL_FIX] No auth.users row found for %', email_fix.old_email;
      CONTINUE;
    END IF;

    SELECT u.id
    INTO conflicting_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(email_fix.new_email)
      AND u.id <> target_user_id
    LIMIT 1;

    IF conflicting_user_id IS NOT NULL THEN
      RAISE EXCEPTION
        '[EMAIL_FIX] Cannot update auth.users email % -> % because target email is already used by user %',
        email_fix.old_email,
        email_fix.new_email,
        conflicting_user_id;
    END IF;

    SELECT s.id
    INTO conflicting_subscriber_id
    FROM public.subscribers s
    WHERE lower(s.email) = lower(email_fix.new_email)
      AND (s.user_id IS NULL OR s.user_id <> target_user_id)
    LIMIT 1;

    IF conflicting_subscriber_id IS NOT NULL THEN
      RAISE EXCEPTION
        '[EMAIL_FIX] Cannot update subscriber email % -> % because target email is already used by subscriber row %',
        email_fix.old_email,
        email_fix.new_email,
        conflicting_subscriber_id;
    END IF;

    BEGIN
      UPDATE auth.users
      SET
        email = email_fix.new_email,
        updated_at = now()
      WHERE id = target_user_id
        AND email IS DISTINCT FROM email_fix.new_email;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE WARNING
          '[EMAIL_FIX] Could not update auth.users for % -> % due to insufficient_privilege. Apply this step with service-role access or in Supabase Dashboard.',
          email_fix.old_email,
          email_fix.new_email;
        CONTINUE;
      WHEN OTHERS THEN
        RAISE;
    END;

    UPDATE public.subscribers
    SET
      email = email_fix.new_email,
      updated_at = now()
    WHERE user_id = target_user_id
      AND email IS DISTINCT FROM email_fix.new_email;

    RAISE NOTICE '[EMAIL_FIX] Updated % -> % for user %', email_fix.old_email, email_fix.new_email, target_user_id;
  END LOOP;
END;
$$;
