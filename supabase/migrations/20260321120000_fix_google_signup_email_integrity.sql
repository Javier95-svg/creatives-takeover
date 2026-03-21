-- Repair known Gmail corruption cases and keep subscriber emails aligned with auth.users.
-- Root-cause audit from the repo:
-- 1. Google OAuth client flow never rewrites the email.
-- 2. The current auth signup trigger copies NEW.email as-is.
-- 3. Therefore any dotted Gmail mutation is backend data drift outside the current code path.
-- This migration fixes the known rows and adds a guard so downstream copies stay exact.

CREATE OR REPLACE FUNCTION public.sync_subscriber_email_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscribers
  SET
    email = NEW.email,
    updated_at = now()
  WHERE user_id = NEW.id
    AND email IS DISTINCT FROM NEW.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed_sync_subscriber ON auth.users;
CREATE TRIGGER on_auth_user_email_changed_sync_subscriber
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_subscriber_email_from_auth_user();

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
        ('a.shle.y.jmo.o.dy2@gmail.com', 'ashleyjmoody2@gmail.com'),
        ('bon.ne.r.c.am.er.on1@gmail.com', 'bonnercameron1@gmail.com'),
        ('co.r.yr.u.sh.i.ng28@gmail.com', 'coryrushing28@gmail.com'),
        ('f.ranc.is.col.opez.00.95@gmail.com', 'franciscolopez0095@gmail.com'),
        ('ih.o.zudus897@gmail.com', 'ihozudus897@gmail.com'),
        ('k.e.ll.e7.7.7@gmail.com', 'kelle777@gmail.com'),
        ('kuco.r.ah.uf.2.93@gmail.com', 'kucorahuf293@gmail.com'),
        ('mi.ki.e.sam.ford@gmail.com', 'mikiesamford@gmail.com'),
        ('t.i.ar.at.ill.m.a.n.33@gmail.com', 'tiaratillman33@gmail.com')
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
