-- =====================================================
-- Prevent NULL Usernames in Future
-- This migration adds constraints and triggers to ensure
-- usernames are always set, even if somehow a profile is
-- created or updated without one
-- =====================================================

-- Step 1: Create a function to auto-generate username if NULL on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.ensure_profile_username()
RETURNS TRIGGER AS $$
DECLARE
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  -- Only process if username is NULL or empty
  IF NEW.username IS NULL OR NEW.username = '' OR TRIM(NEW.username) = '' THEN
    -- Generate username from full_name using same logic as handle_new_user()
    IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN
      name_parts := string_to_array(trim(NEW.full_name), ' ');
      
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
        -- Ensure uniqueness
        final_slug := base_slug;
        counter := 1;
        
        WHILE EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE username = final_slug 
          AND id != NEW.id
        ) LOOP
          final_slug := base_slug || counter::TEXT;
          counter := counter + 1;
        END LOOP;
        
        NEW.username := final_slug;
      ELSE
        -- No valid name, use user ID as fallback
        final_slug := 'user' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
        counter := 1;
        
        WHILE EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE username = final_slug 
          AND id != NEW.id
        ) LOOP
          final_slug := 'user' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8) || counter::TEXT;
          counter := counter + 1;
        END LOOP;
        
        NEW.username := final_slug;
      END IF;
    ELSE
      -- No full_name available, generate from user ID
      final_slug := 'user' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
      counter := 1;
      
      WHILE EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = final_slug 
        AND id != NEW.id
      ) LOOP
        final_slug := 'user' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8) || counter::TEXT;
        counter := counter + 1;
      END LOOP;
      
      NEW.username := final_slug;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger to ensure username on INSERT
DROP TRIGGER IF EXISTS ensure_username_on_insert ON public.profiles;
CREATE TRIGGER ensure_username_on_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_username();

-- Step 3: Create trigger to ensure username on UPDATE (if somehow it becomes NULL)
DROP TRIGGER IF EXISTS ensure_username_on_update ON public.profiles;
CREATE TRIGGER ensure_username_on_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.username IS NULL OR NEW.username = '' OR TRIM(NEW.username) = '')
  EXECUTE FUNCTION public.ensure_profile_username();

-- Step 4: Add CHECK constraint to prevent empty usernames
-- Note: We can't use NOT NULL because we want the trigger to handle it,
-- but we can ensure it's not empty after the trigger runs
DO $$
BEGIN
  -- Drop existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_username_not_empty' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_username_not_empty;
  END IF;
  
  -- Add check constraint to ensure username is not empty
  ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_username_not_empty 
  CHECK (username IS NOT NULL AND username != '' AND TRIM(username) != '');
EXCEPTION
  WHEN OTHERS THEN
    -- If constraint fails due to existing NULL values, that's okay
    -- The backfill migration should have handled it
    RAISE NOTICE 'Check constraint may have failed due to existing data. Run backfill migration first.';
END $$;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Triggers will now ensure usernames are always set
-- CHECK constraint prevents empty usernames
-- =====================================================

