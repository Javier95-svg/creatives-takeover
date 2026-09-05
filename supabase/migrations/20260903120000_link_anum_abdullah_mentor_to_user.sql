-- Link Anum Abdullah's mentor profile to her messaging account so the Message CTA opens DMs.

DO $$
DECLARE
  target_user_id UUID := '22021695-1a80-41fa-a676-73ca4c636dab';
  target_email   TEXT := 'anum.abdullah.598@gmail.com';
  target_name    TEXT := 'Anum Abdullah';
  matched_count  INTEGER;
BEGIN
  -- Prevent a typo or stale UID from linking a public mentor profile to the wrong account.
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
  WHERE lower(trim(regexp_replace(name, '[[:space:]]+', ' ', 'g'))) = lower(target_name);

  GET DIAGNOSTICS matched_count = ROW_COUNT;

  IF matched_count = 0 THEN
    RAISE EXCEPTION 'No mentor found matching %', target_name;
  END IF;

  IF matched_count > 1 THEN
    RAISE EXCEPTION 'Multiple mentors (% rows) matched %, aborting for safety', matched_count, target_name;
  END IF;

  RAISE NOTICE 'Linked mentor % to user % (%)', target_name, target_user_id, target_email;
END $$;
