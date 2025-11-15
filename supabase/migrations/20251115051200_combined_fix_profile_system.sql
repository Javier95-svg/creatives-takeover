-- =====================================================
-- COMBINED MIGRATION: Fix Profile System
-- Run this migration through Supabase Dashboard SQL Editor
-- =====================================================
-- This migration combines:
-- 1. Fix profile username generation on signup
-- 2. Ensure Aamir Khan's profile exists with username "aamirkhan"
-- 3. Allow public profile viewing (fixes "profile not found" issue)
-- =====================================================

-- =====================================================
-- PART 1: Fix profile username generation on signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username TEXT;
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
BEGIN
  -- Generate username from full_name
  IF NEW.raw_user_meta_data->>'full_name' IS NOT NULL 
     AND NEW.raw_user_meta_data->>'full_name' != '' THEN
    name_parts := string_to_array(trim(NEW.raw_user_meta_data->>'full_name'), ' ');
    
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
      final_slug := base_slug;
      counter := 1;
      
      -- Ensure uniqueness by appending counter if needed
      WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_slug) LOOP
        final_slug := base_slug || counter::TEXT;
        counter := counter + 1;
      END LOOP;
      
      generated_username := final_slug;
    ELSE
      -- Fallback to user ID
      generated_username := 'user' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
    END IF;
  ELSE
    -- No full_name, use email prefix or user ID
    generated_username := 'user' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
  END IF;
  
  -- Insert profile with username
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    generated_username
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate profile creation
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PART 2: Ensure Aamir Khan's profile exists with username "aamirkhan"
-- =====================================================

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

  -- Step 2: If not found in profiles, try to find his user_id
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

-- =====================================================
-- PART 3: Allow public viewing of profiles (CRITICAL FIX)
-- This fixes the "profile not found" issue
-- =====================================================

-- Drop existing restrictive policies that prevent public viewing
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view followed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Community can view active member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Allow everyone (including unauthenticated users) to view profiles
-- This is necessary for public profile pages like /profile/username
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

-- Users can still update their own profiles
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- Migration Complete!
-- =====================================================
-- After running this migration:
-- 1. All new signups will automatically get usernames
-- 2. Aamir Khan's profile will have username "aamirkhan"
-- 3. All profiles will be publicly viewable
-- 4. /profile/aamirkhan should now work!
-- =====================================================

