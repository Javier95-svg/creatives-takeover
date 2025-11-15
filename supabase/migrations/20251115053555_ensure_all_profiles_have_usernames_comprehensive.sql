-- =====================================================
-- Comprehensive Migration: Ensure ALL Profiles Have Usernames
-- This migration ensures every profile in the database has a username
-- Format: firstname + lastname (e.g., javieralonso1, carlosrodriguez, aamirkhan)
-- =====================================================

-- Step 1: Generate usernames for all profiles missing them
DO $$
DECLARE
  profile_record RECORD;
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
  generated_count INTEGER := 0;
BEGIN
  -- Process all profiles that don't have a username or have an empty username
  FOR profile_record IN 
    SELECT id, full_name, username 
    FROM public.profiles
    WHERE username IS NULL OR username = '' OR TRIM(username) = ''
  LOOP
    -- Generate username from full_name using same logic as handle_new_user()
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
        
        -- Update the profile with the generated username
        UPDATE public.profiles 
        SET username = final_slug 
        WHERE id = profile_record.id;
        
        generated_count := generated_count + 1;
      ELSE
        -- No valid name, use user ID as fallback
        final_slug := 'user' || SUBSTRING(profile_record.id::TEXT FROM 1 FOR 8);
        counter := 1;
        
        -- Ensure uniqueness
        WHILE EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE username = final_slug 
          AND id != profile_record.id
        ) LOOP
          final_slug := 'user' || SUBSTRING(profile_record.id::TEXT FROM 1 FOR 8) || counter::TEXT;
          counter := counter + 1;
        END LOOP;
        
        UPDATE public.profiles 
        SET username = final_slug 
        WHERE id = profile_record.id;
        
        generated_count := generated_count + 1;
      END IF;
    ELSE
      -- No full_name available, generate from user ID
      final_slug := 'user' || SUBSTRING(profile_record.id::TEXT FROM 1 FOR 8);
      counter := 1;
      
      -- Ensure uniqueness
      WHILE EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = final_slug 
        AND id != profile_record.id
      ) LOOP
        final_slug := 'user' || SUBSTRING(profile_record.id::TEXT FROM 1 FOR 8) || counter::TEXT;
        counter := counter + 1;
      END LOOP;
      
      UPDATE public.profiles 
      SET username = final_slug 
      WHERE id = profile_record.id;
      
      generated_count := generated_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Generated usernames for % profiles', generated_count;
END $$;

-- Step 2: Handle any duplicate usernames that might exist
-- This ensures uniqueness even if there were edge cases
DO $$
DECLARE
  duplicate_record RECORD;
  new_username TEXT;
  counter INTEGER;
  updated_count INTEGER := 0;
BEGIN
  -- Find all duplicate usernames (excluding NULL)
  FOR duplicate_record IN
    SELECT username, array_agg(id ORDER BY created_at) as ids
    FROM public.profiles
    WHERE username IS NOT NULL AND username != ''
    GROUP BY username
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first one (oldest), update the rest
    FOR counter IN 2..array_length(duplicate_record.ids, 1) LOOP
      new_username := duplicate_record.username || counter::TEXT;
      
      -- Ensure the new username is also unique
      WHILE EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = new_username 
        AND id != duplicate_record.ids[counter]
      ) LOOP
        new_username := duplicate_record.username || counter::TEXT || '_' || SUBSTRING(duplicate_record.ids[counter]::TEXT FROM 1 FOR 4);
      END LOOP;
      
      UPDATE public.profiles
      SET username = new_username
      WHERE id = duplicate_record.ids[counter];
      
      updated_count := updated_count + 1;
    END LOOP;
  END LOOP;
  
  IF updated_count > 0 THEN
    RAISE NOTICE 'Resolved % duplicate usernames', updated_count;
  END IF;
END $$;

-- Step 3: Verify all profiles now have usernames
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM public.profiles
  WHERE username IS NULL OR username = '' OR TRIM(username) = '';
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Warning: % profiles still missing usernames', missing_count;
  ELSE
    RAISE NOTICE 'Success: All profiles now have usernames';
  END IF;
END $$;

-- Step 4: Ensure unique constraint exists (should already exist, but make sure)
DO $$
BEGIN
  -- Drop existing constraint if it exists with different name
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_key' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_username_key;
  END IF;
  
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_unique' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

-- Step 5: Ensure index exists for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- =====================================================
-- Migration Complete!
-- =====================================================
-- All profiles should now have unique usernames
-- Profile links like /profile/aamirkhan should work
-- =====================================================

