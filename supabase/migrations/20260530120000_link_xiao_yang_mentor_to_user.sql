-- Link Xiao Yang's mentor profile to their messaging account so the Message CTA opens DMs

DO $$
DECLARE
  target_user_id UUID := '33645e51-d578-4077-bae8-e712f8402d7b';
  target_email   TEXT := 'xiaoyang42732@gmail.com';
  target_name    TEXT := 'Xiao Yang';
  matched_count  INTEGER;
BEGIN
  -- Verify the auth.users record exists and email matches
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
      lower(name) LIKE '%xiao%'
      AND lower(name) LIKE '%yang%'
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
