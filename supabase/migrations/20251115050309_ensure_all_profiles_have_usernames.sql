-- Ensure all existing profiles have usernames
-- This migration specifically handles Aamir Khan and all other profiles without usernames

-- First, ensure Aamir Khan specifically gets "aamirkhan" username
DO $$
DECLARE
  aamir_id UUID;
  aamir_username TEXT;
  counter_var INTEGER;
  final_username_var TEXT;
BEGIN
  -- Find Aamir Khan by full_name (try various spellings/cases)
  SELECT id, username INTO aamir_id, aamir_username
  FROM public.profiles
  WHERE LOWER(full_name) LIKE '%aamir%khan%'
     OR LOWER(full_name) = 'aamir khan'
     OR LOWER(TRIM(full_name)) LIKE 'aamir%khan%'
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

-- Now ensure all other profiles without usernames get them generated
DO $$
DECLARE
  profile_record RECORD;
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  FOR profile_record IN 
    SELECT id, full_name, username 
    FROM public.profiles
    WHERE username IS NULL OR username = ''
  LOOP
    -- Generate username from full_name
    IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
      name_parts := string_to_array(trim(profile_record.full_name), ' ');
      
      IF array_length(name_parts, 1) >= 2 THEN
        first_name := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
        last_name := lower(regexp_replace(name_parts[array_length(name_parts, 1)], '[^a-z0-9]', '', 'g'));
        base_slug := first_name || last_name;
      ELSIF array_length(name_parts, 1) = 1 THEN
        base_slug := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
      ELSE
        base_slug := NULL;
      END IF;
      
      IF base_slug IS NOT NULL AND base_slug != '' THEN
        -- Ensure uniqueness
        final_slug := base_slug;
        counter := 1;
        
        WHILE EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE username = final_slug 
          AND id != profile_record.id
        ) LOOP
          final_slug := base_slug || counter::TEXT;
          counter := counter + 1;
        END LOOP;
        
        -- Update the profile with new username
        UPDATE public.profiles 
        SET username = final_slug 
        WHERE id = profile_record.id;
      ELSE
        -- No valid name, use user ID
        UPDATE public.profiles 
        SET username = 'user' || SUBSTRING(profile_record.id::TEXT FROM 1 FOR 8)
        WHERE id = profile_record.id;
      END IF;
    ELSE
      -- No full_name available, generate from user ID
      UPDATE public.profiles 
      SET username = 'user' || SUBSTRING(profile_record.id::TEXT FROM 1 FOR 8)
      WHERE id = profile_record.id;
    END IF;
  END LOOP;
END $$;

-- Handle any duplicate usernames by appending user ID suffix
DO $$
DECLARE
  duplicate_record RECORD;
  new_username TEXT;
  counter INTEGER;
BEGIN
  FOR duplicate_record IN
    SELECT username, array_agg(id ORDER BY created_at) as ids
    FROM public.profiles
    WHERE username IS NOT NULL AND username != ''
    GROUP BY username
    HAVING COUNT(*) > 1
  LOOP
    -- Keep first one (oldest), update others
    FOR counter IN 2..array_length(duplicate_record.ids, 1) LOOP
      new_username := duplicate_record.username || SUBSTRING(duplicate_record.ids[counter]::TEXT FROM 1 FOR 6);
      
      -- Ensure uniqueness
      WHILE EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = new_username 
        AND id != duplicate_record.ids[counter]
      ) LOOP
        new_username := duplicate_record.username || SUBSTRING(duplicate_record.ids[counter]::TEXT FROM 1 FOR 8);
      END LOOP;
      
      UPDATE public.profiles
      SET username = new_username
      WHERE id = duplicate_record.ids[counter];
    END LOOP;
  END LOOP;
END $$;

-- Ensure username constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_unique'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

