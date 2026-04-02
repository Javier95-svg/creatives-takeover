DO $$
DECLARE
  target_user_id UUID := '681858ab-db84-4930-9bd0-5db759ec5ea4';
  target_email TEXT := 'felicitymukunju@gmail.com';
  target_mentor_name TEXT := 'Felicity Mukunju';
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
    RAISE EXCEPTION 'No mentor found with name %', target_mentor_name;
  END IF;

  RAISE NOTICE 'Linked mentor % to user % (%)', target_mentor_name, target_user_id, target_email;
END $$;
