-- Link Itir Ozdiker's mentor profile to her messaging account so the Message CTA opens DMs

DO $$
DECLARE
  target_user_id UUID := 'c8d3dc54-ba64-46d6-b3e1-6270c1f71f6a';
  target_email TEXT := 'itirozdiker@axisandcostudio.com';
  target_mentor_name TEXT := 'Itir Ozdiker';
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
  WHERE
    regexp_replace(
      translate(lower(name), U&'\0131\00f6', 'io'),
      '[[:space:]]+',
      ' ',
      'g'
    ) = lower(target_mentor_name)
    OR (
      regexp_replace(
        translate(lower(name), U&'\0131\00f6', 'io'),
        '[[:space:]]+',
        ' ',
        'g'
      ) LIKE '%itir%'
      AND regexp_replace(
        translate(lower(name), U&'\0131\00f6', 'io'),
        '[[:space:]]+',
        ' ',
        'g'
      ) LIKE '%ozdiker%'
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
