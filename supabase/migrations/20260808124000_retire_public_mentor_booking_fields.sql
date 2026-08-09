-- Values were backfilled into mentor_discovery_call_settings in 120000. Clear
-- public contact/URL data only after every V2 code path reads the private table.
UPDATE public.mentors
SET contact_email = NULL,
    calendly_url = NULL,
    booking_provider = 'manual'
WHERE contact_email IS NOT NULL OR calendly_url IS NOT NULL OR booking_provider <> 'manual';
