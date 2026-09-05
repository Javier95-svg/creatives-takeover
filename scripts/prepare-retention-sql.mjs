import { readFileSync, writeFileSync } from 'node:fs';

// Generate one pasteable transaction, including the existing campaign primitives.
const old = readFileSync(new URL('../supabase/migrations/20260810140000_retention_email_quality.sql', import.meta.url), 'utf8');
const primitives = old.slice(0, old.indexOf('-- Restore preference enforcement'));
const migration = readFileSync(new URL('../supabase/migrations/20260904120000_personalized_retention.sql', import.meta.url), 'utf8');
const preflight = `-- Paste this entire file into the CT project's Supabase SQL editor and Run.
-- Repeatable: preserves campaign history and experiment assignments.
-- Delivery is explicitly disabled at the end. This does not deploy Edge functions.
BEGIN;
DO $$
BEGIN
  IF to_regclass('public.retention_email_log') IS NULL
    OR to_regclass('public.profiles') IS NULL
    OR to_regclass('public.mentors') IS NULL
    OR to_regprocedure('public.notif_pref_enabled(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'CT base schema is missing. Apply the existing project migrations before this retention upgrade.';
  END IF;
END;
$$;
ALTER TABLE public.retention_email_log
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed boolean DEFAULT false;
`;
const end = `
-- Keep delivery off until the matching frontend and Edge functions are deployed.
UPDATE public.retention_roadmap_settings SET enabled=false WHERE singleton=true;
COMMIT;
SELECT enabled AS email_delivery_enabled, tracking_started_at
FROM public.retention_roadmap_settings WHERE singleton=true;
`;
writeFileSync(new URL('../docs/personalized-retention-apply.sql', import.meta.url), preflight + primitives + '\n' + migration + end);
console.log('Prepared docs/personalized-retention-apply.sql');
