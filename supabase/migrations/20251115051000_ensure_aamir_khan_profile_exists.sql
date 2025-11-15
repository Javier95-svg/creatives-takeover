-- Ensure Aamir Khan's profile exists and has username "aamirkhan"
-- This migration finds Aamir Khan from community posts if needed and creates/updates his profile

DO $$
DECLARE
  aamir_user_id UUID;
  aamir_profile_id UUID;
  aamir_username TEXT;
  counter_var INTEGER;
  final_username_var TEXT;
BEGIN
  -- Step 1: Try to find Aamir Khan's profile directly
  SELECT id, username INTO aamir_profile_id, aamir_username
  FROM public.profiles
  WHERE LOWER(full_name) LIKE '%aamir%khan%'
     OR LOWER(full_name) = 'aamir khan'
     OR LOWER(TRIM(full_name)) LIKE 'aamir%khan%'
     OR username = 'aamirkhan'
  LIMIT 1;

  -- Step 2: If not found in profiles, try to find his user_id from community_posts
  IF aamir_profile_id IS NULL THEN
    -- Check all profiles for any match with "aamir" or "khan"
    SELECT id INTO aamir_user_id
    FROM public.profiles
    WHERE (
      LOWER(COALESCE(full_name, '')) LIKE '%aamir%' 
      OR LOWER(COALESCE(full_name, '')) LIKE '%khan%'
      OR LOWER(COALESCE(full_name, '')) LIKE '%aamir khan%'
    )
    LIMIT 1;
  ELSE
    -- Profile exists, get the user_id
    aamir_user_id := aamir_profile_id;
  END IF;

  -- Step 3: If we found a user_id, ensure profile exists and has correct username
  IF aamir_user_id IS NOT NULL THEN
    -- Check if profile exists
    SELECT id, username INTO aamir_profile_id, aamir_username
    FROM public.profiles
    WHERE id = aamir_user_id;
    
    IF aamir_profile_id IS NULL THEN
      -- Profile doesn't exist, create it
      INSERT INTO public.profiles (id, full_name, username)
      VALUES (aamir_user_id, 'Aamir Khan', 'aamirkhan')
      ON CONFLICT (id) DO UPDATE SET username = 'aamirkhan', full_name = COALESCE(profiles.full_name, 'Aamir Khan');
    ELSE
      -- Profile exists, update username if needed
      IF aamir_username IS NULL OR aamir_username != 'aamirkhan' THEN
        -- Check if "aamirkhan" is already taken by someone else
        IF EXISTS (SELECT 1 FROM public.profiles WHERE username = 'aamirkhan' AND id != aamir_user_id) THEN
          -- If taken, append a number
          counter_var := 1;
          final_username_var := 'aamirkhan' || counter_var::TEXT;
          WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username_var AND id != aamir_user_id) LOOP
            counter_var := counter_var + 1;
            final_username_var := 'aamirkhan' || counter_var::TEXT;
          END LOOP;
          
          UPDATE public.profiles
          SET username = final_username_var
          WHERE id = aamir_user_id;
        ELSE
          -- Username is available, set it directly
          UPDATE public.profiles
          SET username = 'aamirkhan',
              full_name = COALESCE(full_name, 'Aamir Khan')
          WHERE id = aamir_user_id;
        END IF;
      END IF;
    END IF;
  ELSE
    -- Step 4: If we still haven't found Aamir Khan, check all profiles more broadly
    -- and try to match any profile that might be him
    FOR aamir_profile_id, aamir_username IN 
      SELECT id, username 
      FROM public.profiles
      WHERE (
        LOWER(COALESCE(full_name, '')) LIKE '%aamir%'
        OR LOWER(COALESCE(full_name, '')) LIKE '%khan%'
      )
      AND (username IS NULL OR username != 'aamirkhan')
      LIMIT 1
    LOOP
      -- Update this profile to have username "aamirkhan"
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = 'aamirkhan' AND id != aamir_profile_id) THEN
        UPDATE public.profiles
        SET username = 'aamirkhan',
            full_name = COALESCE(full_name, 'Aamir Khan')
        WHERE id = aamir_profile_id;
      END IF;
    END LOOP;
  END IF;
END $$;

-- Final check: Ensure at least one profile has username "aamirkhan"
-- If no profile exists with this username, create a placeholder or update the first match
DO $$
DECLARE
  profile_with_username UUID;
  any_profile_with_aamir UUID;
BEGIN
  -- Check if any profile has username "aamirkhan"
  SELECT id INTO profile_with_username
  FROM public.profiles
  WHERE username = 'aamirkhan'
  LIMIT 1;
  
  -- If no profile has "aamirkhan" username, find any profile with "Aamir" in name
  IF profile_with_username IS NULL THEN
    SELECT id INTO any_profile_with_aamir
    FROM public.profiles
    WHERE LOWER(COALESCE(full_name, '')) LIKE '%aamir%khan%'
       OR LOWER(COALESCE(full_name, '')) LIKE '%aamir%'
    LIMIT 1;
    
    -- If found, set username
    IF any_profile_with_aamir IS NOT NULL THEN
      UPDATE public.profiles
      SET username = 'aamirkhan',
          full_name = COALESCE(full_name, 'Aamir Khan')
      WHERE id = any_profile_with_aamir;
    END IF;
  END IF;
END $$;

