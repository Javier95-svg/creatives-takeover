-- Link Laura Sabina Cabrera's mentor profile to her messaging account so the Message CTA opens DMs

DO $$
DECLARE
  target_user_id UUID := 'f59c54c5-f07e-4976-8fe9-ae42555375c3';
  target_email   TEXT := 'laurarachelwk@gmail.com';
  target_name    TEXT := 'Laura Sabina Cabrera';
  matched_count  INTEGER;
BEGIN
  -- Verify the auth.users record exists and email matches.
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = target_user_id
      AND lower(email) = lower(target_email)
  ) THEN
    RAISE EXCEPTION
      'Could not verify auth.users record for % with UID %',
      target_email, target_user_id;
  END IF;

  UPDATE public.mentors
  SET user_id = target_user_id
  WHERE
    lower(regexp_replace(name, '[[:space:]]+', ' ', 'g')) = lower(target_name)
    OR (
      lower(name) LIKE '%laura%'
      AND lower(name) LIKE '%sabina%'
      AND lower(name) LIKE '%cabrera%'
    );

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  IF matched_count = 0 THEN
    RAISE EXCEPTION 'No mentor found matching %', target_name;
  END IF;

  IF matched_count > 1 THEN
    RAISE EXCEPTION 'Multiple mentors (% rows) matched %, aborting for safety', matched_count, target_name;
  END IF;

  RAISE NOTICE 'Linked mentor % to user % (%)', target_name, target_user_id, target_email;
END $$;
