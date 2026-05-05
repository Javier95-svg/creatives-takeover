DO $$
DECLARE
  target_user_id UUID := '127434fb-f706-44a5-b230-ac1b9b17dc8c';
  target_email TEXT := 'danielkazani@gmail.com';
  target_mentor_name TEXT := 'Daniel Kazani';
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
  WHERE lower(name) = lower(target_mentor_name)
    OR (
      lower(name) LIKE '%daniel%'
      AND lower(name) LIKE '%kazani%'
    );

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  IF matched_count = 0 THEN
    RAISE EXCEPTION 'No mentor found matching %', target_mentor_name;
  END IF;

  IF matched_count > 1 THEN
    RAISE EXCEPTION 'Multiple mentors (% rows) matched %, aborting for safety', matched_count, target_mentor_name;
  END IF;

  RAISE NOTICE 'Linked mentor % to user % (%)', target_mentor_name, target_user_id, target_email;
END $$;
