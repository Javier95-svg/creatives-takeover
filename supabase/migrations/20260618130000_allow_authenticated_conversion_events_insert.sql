-- Allow authenticated users to insert their own conversion events.
--
-- The original conversion-tracking migration (20250115000000) granted INSERT on
-- conversion_events only to the `anon` role. As a result, logged-in users hit a
-- 403 (RLS violation) whenever useConversionTracking fired an insert (the insert
-- runs under the `authenticated` role and no INSERT policy matched it). This was
-- visible in the console as a 403 on /rest/v1/conversion_events, e.g. on
-- /email-templates.
--
-- conversion_funnels already received matching authenticated INSERT/UPDATE
-- policies in a later migration; this brings conversion_events in line.

DROP POLICY IF EXISTS "Allow authenticated conversion event tracking" ON public.conversion_events;

CREATE POLICY "Allow authenticated conversion event tracking"
  ON public.conversion_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
