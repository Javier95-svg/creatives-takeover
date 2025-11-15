-- =====================================================
-- Fix Fallback Usernames to Name-Based
-- This migration fixes profiles that have fallback usernames
-- (starting with 'user_') to use name-based usernames instead
-- Example: user_96efce7e... -> aamirkhan
-- 
-- Enhanced to:
-- - Extract UUID from username if in format user_<UUID>
-- - Handle profiles with missing full_name
-- - Directly fix Aamir Khan's profile even without full_name
-- =====================================================

-- Step 1: Fix all profiles with fallback usernames (starting with 'user_')
DO $$
DECLARE
  profile_record RECORD;
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
  updated_count INTEGER := 0;
  extracted_uuid TEXT;
  uuid_from_username UUID;
  profile_by_uuid RECORD;
BEGIN
  -- Process all profiles that have fallback usernames (starting with 'user_')
  FOR profile_record IN 
    SELECT id, full_name, username 
    FROM public.profiles
    WHERE username LIKE 'user_%' OR (username LIKE 'user%' AND LENGTH(username) > 10)
  LOOP
    -- Try to extract UUID from username if it's in format user_<UUID>
    IF profile_record.username LIKE 'user_%' THEN
      extracted_uuid := SUBSTRING(profile_record.username FROM 6); -- Skip 'user_'
      
      -- Try to parse as UUID and find profile by ID
      BEGIN
        uuid_from_username := extracted_uuid::UUID;
        
        -- If the username UUID matches the profile ID, we can trust it
        IF profile_record.id = uuid_from_username THEN
          -- Profile ID matches UUID in username, this is a fallback username
          RAISE NOTICE 'Found profile with UUID-based fallback username: %', profile_record.id;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- Not a valid UUID format, continue with normal processing
          NULL;
      END;
    END IF;
    
    -- Regenerate username if they have a valid full_name
    IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
      name_parts := string_to_array(trim(profile_record.full_name), ' ');
      
      IF array_length(name_parts, 1) >= 2 THEN
        -- Extract first and last name
        first_name := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
        last_name := lower(regexp_replace(name_parts[array_length(name_parts, 1)], '[^a-z0-9]', '', 'g'));
        base_slug := first_name || last_name;
      ELSIF array_length(name_parts, 1) = 1 THEN
        -- Single name
        base_slug := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
      ELSE
        base_slug := NULL;
      END IF;
      
      IF base_slug IS NOT NULL AND base_slug != '' THEN
        -- Ensure uniqueness by checking existing usernames
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
        
        -- Update the profile with the name-based username
        UPDATE public.profiles 
        SET username = final_slug 
        WHERE id = profile_record.id;
        
        updated_count := updated_count + 1;
        RAISE NOTICE 'Updated profile % from % to %', profile_record.id, profile_record.username, final_slug;
      END IF;
    ELSE
      -- No full_name available, but we might be able to identify the user
      -- Check if this is Aamir Khan by checking if UUID matches known patterns
      -- or if we can find the user in other tables
      IF profile_record.username = 'user_96efce7e-9c78-4561-a0fa-e88e8f5cc964' THEN
        -- This is Aamir Khan - set full_name and username
        -- First check if aamirkhan is available
        final_slug := 'aamirkhan';
        IF EXISTS (SELECT 1 FROM public.profiles WHERE username = 'aamirkhan' AND id != profile_record.id) THEN
          counter := 1;
          final_slug := 'aamirkhan' || counter::TEXT;
          WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_slug AND id != profile_record.id) LOOP
            counter := counter + 1;
            final_slug := 'aamirkhan' || counter::TEXT;
          END LOOP;
        END IF;
        
        -- Update with both full_name and username
        UPDATE public.profiles
        SET full_name = 'Aamir Khan',
            username = final_slug
        WHERE id = profile_record.id;
        
        updated_count := updated_count + 1;
        RAISE NOTICE 'Updated Aamir Khan profile (no full_name) from % to %', profile_record.username, final_slug;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Updated % profiles from fallback usernames to name-based usernames', updated_count;
END $$;

-- Step 2: Verify the fix worked
DO $$
DECLARE
  remaining_fallback_count INTEGER;
  aamir_username TEXT;
BEGIN
  -- Count remaining fallback usernames
  SELECT COUNT(*) INTO remaining_fallback_count
  FROM public.profiles
  WHERE (username LIKE 'user_%' OR username LIKE 'user%')
    AND full_name IS NOT NULL 
    AND full_name != '';
  
  IF remaining_fallback_count > 0 THEN
    RAISE WARNING 'Warning: % profiles still have fallback usernames despite having full_name', remaining_fallback_count;
  ELSE
    RAISE NOTICE 'Success: All profiles with full_name now have name-based usernames';
  END IF;
  
  -- Check specifically for Aamir Khan
  SELECT username INTO aamir_username
  FROM public.profiles
  WHERE LOWER(full_name) LIKE '%aamir%khan%'
     OR LOWER(full_name) = 'aamir khan'
  LIMIT 1;
  
  IF aamir_username IS NOT NULL THEN
    IF aamir_username LIKE 'user_%' OR aamir_username LIKE 'user%' THEN
      RAISE WARNING 'Aamir Khan still has fallback username: %', aamir_username;
    ELSE
      RAISE NOTICE 'Aamir Khan username: %', aamir_username;
    END IF;
  END IF;
END $$;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- All profiles with fallback usernames (starting with 'user_')
-- that have a valid full_name should now have name-based usernames
-- Example: /profile/aamirkhan should now work
-- =====================================================

