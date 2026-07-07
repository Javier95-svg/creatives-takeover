-- Restore Deby Cadmilema's mentor profile visibility in /mentorship.
-- If the existing mentor row is present, keep its profile details and only
-- reactivate/link it. If it was hard-deleted, rebuild a minimal admin-editable
-- mentor row from the linked user profile.

ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS contact_email TEXT;

DO $$
DECLARE
  target_user_id UUID := '3eb8b857-bd58-4913-8238-f8b3de94693c';
  target_email   TEXT := 'detorrescad@gmail.com';
  target_name    TEXT := 'Deby Cadmilema';
  matched_count  INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = target_user_id
      AND lower(email) = lower(target_email)
  ) THEN
    RAISE EXCEPTION
      'Could not verify auth.users record for % with UID %',
      target_email,
      target_user_id;
  END IF;

  UPDATE public.mentors
  SET
    is_active = true,
    user_id = target_user_id,
    contact_email = target_email,
    updated_at = now()
  WHERE
    user_id = target_user_id
    OR lower(trim(regexp_replace(name, '[[:space:]]+', ' ', 'g'))) = lower(target_name)
    OR (
      lower(name) LIKE '%deby%'
      AND lower(name) LIKE '%cadmilema%'
    );

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  IF matched_count > 1 THEN
    RAISE EXCEPTION 'Multiple mentors (% rows) matched %, aborting for safety', matched_count, target_name;
  END IF;

  IF matched_count = 0 THEN
    INSERT INTO public.mentors (
      user_id,
      name,
      picture,
      bio,
      hourly_rate,
      hourly_rate_per_hour,
      currency,
      expertise,
      is_active,
      is_featured,
      contact_email,
      linkedin_url,
      website_url,
      booking_provider
    )
    SELECT
      target_user_id,
      target_name,
      NULLIF(TRIM(COALESCE(p.avatar_url, '')), ''),
      COALESCE(
        NULLIF(TRIM(p.bio), ''),
        'Deby Cadmilema is available as a Creatives Takeover mentor. Full profile details can be completed by an admin.'
      ),
      0,
      0,
      'USD',
      ARRAY['Startup Mentorship'],
      true,
      false,
      target_email,
      NULLIF(TRIM(COALESCE(p.linkedin_url, '')), ''),
      NULLIF(TRIM(COALESCE(p.website_url, '')), ''),
      'manual'
    FROM (SELECT 1) seed
    LEFT JOIN public.profiles p ON p.id = target_user_id;

    RAISE NOTICE 'Created minimal mentor profile for % linked to user % (%)', target_name, target_user_id, target_email;
  ELSE
    RAISE NOTICE 'Restored mentor profile for % linked to user % (%)', target_name, target_user_id, target_email;
  END IF;
END $$;
