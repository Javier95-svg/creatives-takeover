-- profiles.last_seen_at, which the retention emails read but production never
-- received (20260330110000 was not applied there).
--
-- Without it claim_inactive_retention_email fails ("column p.last_seen_at does
-- not exist"), so every routine reminder and win-back answers 500 and nothing
-- is sent, and loadProjectFacts quietly loses the profile, so the emails that
-- do go out lose the founder's name, routine goal and days away.
--
-- This is only the column part of 20260330110000: the column, its backfill,
-- the trigger that keeps it in step with last_activity_at and last_active_at,
-- and the index. That migration's re_engagement_emails table and
-- check-inactive-users cron job are left out on purpose; nothing uses them.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

UPDATE public.profiles
SET last_seen_at = COALESCE(last_seen_at, last_activity_at, last_active_at, updated_at)
WHERE last_seen_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_profiles_last_seen_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.last_seen_at := COALESCE(NEW.last_seen_at, NEW.last_activity_at, NEW.last_active_at, NEW.updated_at, now());
  ELSIF NEW.last_activity_at IS DISTINCT FROM OLD.last_activity_at THEN
    NEW.last_seen_at := COALESCE(NEW.last_activity_at, NEW.last_seen_at, OLD.last_seen_at);
  ELSIF NEW.last_active_at IS DISTINCT FROM OLD.last_active_at THEN
    NEW.last_seen_at := COALESCE(NEW.last_active_at, NEW.last_seen_at, OLD.last_seen_at);
  ELSIF NEW.last_seen_at IS NULL THEN
    NEW.last_seen_at := COALESCE(OLD.last_seen_at, NEW.last_activity_at, NEW.last_active_at, NEW.updated_at);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profiles_last_seen_at ON public.profiles;
CREATE TRIGGER sync_profiles_last_seen_at
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profiles_last_seen_at();

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles (last_seen_at DESC);
