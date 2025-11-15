-- =====================================================
-- Directly Fix Aamir's Username
-- This migration directly fixes Aamir Khan's profile username
-- from user_96efce7e-9c78-4561-a0fa-e88e8f5cc964 to aamirkhan
-- Uses multiple methods to find the profile
-- =====================================================

DO $$
DECLARE
  aamir_profile_id UUID;
  aamir_username TEXT;
  aamir_full_name TEXT;
  extracted_uuid UUID;
  counter_var INTEGER;
  final_username_var TEXT;
  found_profile BOOLEAN := false;
BEGIN
  -- Method 1: Find by exact username
  SELECT id, username, full_name INTO aamir_profile_id, aamir_username, aamir_full_name
  FROM public.profiles
  WHERE username = 'user_96efce7e-9c78-4561-a0fa-e88e8f5cc964'
  LIMIT 1;
  
  IF aamir_profile_id IS NOT NULL THEN
    found_profile := true;
    RAISE NOTICE 'Found Aamir profile by exact username match: %', aamir_profile_id;
  END IF;
  
  -- Method 2: Extract UUID from username and find by profile ID
  IF NOT found_profile THEN
    BEGIN
      extracted_uuid := '96efce7e-9c78-4561-a0fa-e88e8f5cc964'::UUID;
      
      SELECT id, username, full_name INTO aamir_profile_id, aamir_username, aamir_full_name
      FROM public.profiles
      WHERE id = extracted_uuid
      LIMIT 1;
      
      IF aamir_profile_id IS NOT NULL THEN
        found_profile := true;
        RAISE NOTICE 'Found Aamir profile by UUID: %', aamir_profile_id;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not parse UUID from username';
    END;
  END IF;
  
  -- Method 3: Find by full_name patterns (aamir, khan, aamir khan)
  IF NOT found_profile THEN
    SELECT id, username, full_name INTO aamir_profile_id, aamir_username, aamir_full_name
    FROM public.profiles
    WHERE LOWER(COALESCE(full_name, '')) LIKE '%aamir%khan%'
       OR LOWER(COALESCE(full_name, '')) = 'aamir khan'
       OR LOWER(TRIM(COALESCE(full_name, ''))) LIKE 'aamir%khan%'
       OR (LOWER(COALESCE(full_name, '')) LIKE '%aamir%' AND LOWER(COALESCE(full_name, '')) LIKE '%khan%')
    LIMIT 1;
    
    IF aamir_profile_id IS NOT NULL THEN
      found_profile := true;
      RAISE NOTICE 'Found Aamir profile by name pattern: %', aamir_profile_id;
    END IF;
  END IF;
  
  -- Method 4: Find by username pattern (any profile with user_ prefix that might be Aamir)
  IF NOT found_profile THEN
    SELECT id, username, full_name INTO aamir_profile_id, aamir_username, aamir_full_name
    FROM public.profiles
    WHERE username LIKE 'user_%'
      AND (
        LOWER(COALESCE(full_name, '')) LIKE '%aamir%'
        OR LOWER(COALESCE(full_name, '')) LIKE '%khan%'
        OR username = 'user_96efce7e-9c78-4561-a0fa-e88e8f5cc964'
      )
    LIMIT 1;
    
    IF aamir_profile_id IS NOT NULL THEN
      found_profile := true;
      RAISE NOTICE 'Found Aamir profile by username pattern: %', aamir_profile_id;
    END IF;
  END IF;
  
  -- If we found the profile, update it
  IF found_profile AND aamir_profile_id IS NOT NULL THEN
    -- Ensure full_name is set
    IF aamir_full_name IS NULL OR aamir_full_name = '' THEN
      UPDATE public.profiles
      SET full_name = 'Aamir Khan'
      WHERE id = aamir_profile_id;
      aamir_full_name := 'Aamir Khan';
      RAISE NOTICE 'Set full_name to "Aamir Khan" for profile %', aamir_profile_id;
    END IF;
    
    -- Check if username is already "aamirkhan"
    IF aamir_username IS NULL OR aamir_username != 'aamirkhan' THEN
      -- Check if "aamirkhan" is already taken by someone else
      IF EXISTS (SELECT 1 FROM public.profiles WHERE username = 'aamirkhan' AND id != aamir_profile_id) THEN
        -- If taken, append a number
        counter_var := 1;
        final_username_var := 'aamirkhan' || counter_var::TEXT;
        WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username_var AND id != aamir_profile_id) LOOP
          counter_var := counter_var + 1;
          final_username_var := 'aamirkhan' || counter_var::TEXT;
        END LOOP;
        
        UPDATE public.profiles
        SET username = final_username_var
        WHERE id = aamir_profile_id;
        
        RAISE NOTICE 'Updated Aamir profile username to % (aamirkhan was taken)', final_username_var;
      ELSE
        -- Username is available, set it directly
        UPDATE public.profiles
        SET username = 'aamirkhan'
        WHERE id = aamir_profile_id;
        
        RAISE NOTICE 'Updated Aamir profile username to aamirkhan';
      END IF;
    ELSE
      RAISE NOTICE 'Aamir profile already has username aamirkhan';
    END IF;
  ELSE
    RAISE WARNING 'Could not find Aamir Khan profile with any method';
  END IF;
END $$;

-- Verification: Check if Aamir's username was fixed
DO $$
DECLARE
  aamir_username TEXT;
  aamir_id UUID;
BEGIN
  -- Check by the old username
  SELECT id, username INTO aamir_id, aamir_username
  FROM public.profiles
  WHERE username = 'user_96efce7e-9c78-4561-a0fa-e88e8f5cc964'
  LIMIT 1;
  
  IF aamir_id IS NOT NULL THEN
    RAISE WARNING 'Profile with old username still exists: %', aamir_id;
  END IF;
  
  -- Check by name
  SELECT id, username INTO aamir_id, aamir_username
  FROM public.profiles
  WHERE LOWER(COALESCE(full_name, '')) LIKE '%aamir%khan%'
     OR username = 'aamirkhan'
  LIMIT 1;
  
  IF aamir_id IS NOT NULL THEN
    IF aamir_username = 'aamirkhan' OR aamir_username LIKE 'aamirkhan%' THEN
      RAISE NOTICE 'SUCCESS: Aamir Khan profile found with username: %', aamir_username;
    ELSE
      RAISE WARNING 'Aamir Khan profile found but username is: %', aamir_username;
    END IF;
  ELSE
    RAISE WARNING 'Could not find Aamir Khan profile after migration';
  END IF;
END $$;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Aamir Khan's profile should now have username "aamirkhan"
-- Profile link /profile/aamirkhan should work
-- =====================================================

