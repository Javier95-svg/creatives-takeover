BEGIN;

LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;

-- Numbers are public identifiers, allocated once and never recycled.
CREATE SEQUENCE IF NOT EXISTS public.founder_number_seq
  AS integer MINVALUE 1 MAXVALUE 999999 START WITH 1 NO CYCLE;
REVOKE ALL ON SEQUENCE public.founder_number_seq FROM PUBLIC, anon, authenticated;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS founder_number integer;
UPDATE public.profiles SET founder_number = nextval('public.founder_number_seq')
WHERE founder_number IS NULL;
ALTER TABLE public.profiles ALTER COLUMN founder_number SET NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_founder_number_range;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_founder_number_range
  CHECK (founder_number BETWEEN 1 AND 999999);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_founder_number_unique
  ON public.profiles(founder_number);

CREATE OR REPLACE FUNCTION public.assign_permanent_founder_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Ignore client-supplied values, including attempts to claim another ID.
    NEW.founder_number := nextval('public.founder_number_seq');
  ELSIF NEW.founder_number IS DISTINCT FROM OLD.founder_number THEN
    RAISE EXCEPTION 'Founder ID numbers cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_permanent_founder_number() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS assign_permanent_founder_number ON public.profiles;
CREATE TRIGGER assign_permanent_founder_number
BEFORE INSERT OR UPDATE OF founder_number ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_permanent_founder_number();

-- Append to the existing projection without changing its column order or
-- rewriting any computed fields, including the public-stage privacy gate.
DO $$
DECLARE existing_definition text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'public_profiles'
      AND column_name = 'founder_number'
  ) THEN
    existing_definition := rtrim(pg_get_viewdef('public.public_profiles'::regclass, true), E';\n ');
    EXECUTE format(
      'CREATE OR REPLACE VIEW public.public_profiles AS SELECT current_profile.*, p.founder_number FROM (%s) current_profile JOIN public.profiles p ON p.id = current_profile.id',
      existing_definition
    );
  END IF;
END;
$$;
GRANT SELECT ON public.public_profiles TO anon, authenticated;
COMMENT ON COLUMN public.profiles.founder_number IS
  'Unique permanent public account number, displayed as six digits on Founder ID share cards.';

NOTIFY pgrst, 'reload schema';
COMMIT;
