-- Link Victoria Okakwu's mentor profile to her messaging account so the Message CTA opens DMs

DO $$
DECLARE
  target_user_id UUID := '40771f20-767b-44a8-9e36-0bdb344458a4';
  target_email TEXT := 'ifeyinwaokakwu@gmail.com';
  matched_count INTEGER;
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
  SET user_id = target_user_id
  WHERE lower(name) = lower('Victoria Okakwu')
     OR (
       lower(name) LIKE '%victoria%'
       AND lower(name) LIKE '%okakwu%'
     );

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  IF matched_count = 0 THEN
    RAISE EXCEPTION 'No mentor found matching Victoria Okakwu';
  END IF;

  IF matched_count > 1 THEN
    RAISE EXCEPTION 'Multiple mentors (% rows) matched Victoria Okakwu, aborting for safety', matched_count;
  END IF;

  RAISE NOTICE 'Linked Victoria Okakwu to user % (%)', target_user_id, target_email;
END $$;
