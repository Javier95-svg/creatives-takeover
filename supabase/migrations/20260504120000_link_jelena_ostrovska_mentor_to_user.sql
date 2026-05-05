DO $$
DECLARE
  target_user_id UUID := 'be9930e2-5f4b-4a62-80d9-bd1f00c05bfe';
  target_email TEXT := 'jelenaostrovskaya@gmail.com';
  target_mentor_name TEXT := 'Jelena Ostrovska';
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
  WHERE lower(name) = lower(target_mentor_name);

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  IF matched_count = 0 THEN
    RAISE EXCEPTION 'No mentor found matching %', target_mentor_name;
  END IF;

  IF matched_count > 1 THEN
    RAISE EXCEPTION 'Multiple mentors (% rows) matched %, aborting for safety', matched_count, target_mentor_name;
  END IF;

  RAISE NOTICE 'Linked mentor % to user % (%)', target_mentor_name, target_user_id, target_email;
END $$;
