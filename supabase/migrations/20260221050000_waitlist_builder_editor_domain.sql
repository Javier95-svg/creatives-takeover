-- Waitlist Builder editor v2: custom form fields storage

ALTER TABLE public.waitlist_signups
  ADD COLUMN IF NOT EXISTS custom_fields JSONB;

UPDATE public.waitlist_signups
SET custom_fields = '[]'::jsonb
WHERE custom_fields IS NULL;

ALTER TABLE public.waitlist_signups
  ALTER COLUMN custom_fields SET DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS waitlist_signups_custom_fields_gin
  ON public.waitlist_signups USING GIN (custom_fields);
