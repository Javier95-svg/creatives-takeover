-- Ensure Aamir Khan has the username "aamirkhan"
-- This migration directly sets the username for Aamir Khan following the javieralonso1 pattern

DO $$
DECLARE
  aamir_id UUID;
  aamir_username TEXT;
  counter_var INTEGER;
  final_username_var TEXT;
BEGIN
  -- Find Aamir Khan by full_name
  SELECT id, username INTO aamir_id, aamir_username
  FROM public.profiles
  WHERE LOWER(full_name) LIKE '%aamir%khan%'
     OR LOWER(full_name) = 'aamir khan'
  LIMIT 1;

  -- If Aamir Khan exists and doesn't have username "aamirkhan", set it
  IF aamir_id IS NOT NULL THEN
    -- Check if username is already "aamirkhan"
    IF aamir_username IS NULL OR aamir_username != 'aamirkhan' THEN
      -- Check if "aamirkhan" is already taken by someone else
      IF EXISTS (SELECT 1 FROM public.profiles WHERE username = 'aamirkhan' AND id != aamir_id) THEN
        -- If taken, append a number
        counter_var := 1;
        final_username_var := 'aamirkhan' || counter_var::TEXT;
        WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username_var AND id != aamir_id) LOOP
          counter_var := counter_var + 1;
          final_username_var := 'aamirkhan' || counter_var::TEXT;
        END LOOP;
        
        UPDATE public.profiles
        SET username = final_username_var
        WHERE id = aamir_id;
      ELSE
        -- Username is available, set it directly
        UPDATE public.profiles
        SET username = 'aamirkhan'
        WHERE id = aamir_id;
      END IF;
    END IF;
  END IF;
END $$;

-- Also ensure all profiles without usernames get them generated
UPDATE public.profiles
SET username = CASE
  WHEN full_name IS NOT NULL AND full_name != '' THEN
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(full_name, '^([A-Za-z]+)\s+.*\s+([A-Za-z]+)$', '\1\2'),
          '[^a-z0-9]', '', 'g'
        ),
        '[^a-z0-9]', '', 'g'
      )
    )
  ELSE
    'user' || SUBSTRING(id::TEXT FROM 1 FOR 8)
END
WHERE username IS NULL;

-- Handle duplicates by appending user ID suffix for any remaining conflicts
DO $$
DECLARE
  duplicate_record RECORD;
  new_username TEXT;
  counter INTEGER;
BEGIN
  FOR duplicate_record IN
    SELECT username, array_agg(id ORDER BY created_at) as ids
    FROM public.profiles
    WHERE username IS NOT NULL
    GROUP BY username
    HAVING COUNT(*) > 1
  LOOP
    -- Keep first one, update others
    FOR counter IN 2..array_length(duplicate_record.ids, 1) LOOP
      new_username := duplicate_record.username || SUBSTRING(duplicate_record.ids[counter]::TEXT FROM 1 FOR 6);
      
      -- Ensure uniqueness
      WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username AND id != duplicate_record.ids[counter]) LOOP
        new_username := duplicate_record.username || SUBSTRING(duplicate_record.ids[counter]::TEXT FROM 1 FOR 8);
      END LOOP;
      
      UPDATE public.profiles
      SET username = new_username
      WHERE id = duplicate_record.ids[counter];
    END LOOP;
  END LOOP;
END $$;

