-- Update profile usernames to use full name format (firstname + lastname, lowercase, no spaces)
-- Preserve existing custom usernames that don't match the old pattern

DO $$
DECLARE
  profile_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  existing_username TEXT;
  is_custom_username BOOLEAN;
BEGIN
  FOR profile_record IN 
    SELECT id, full_name, username 
    FROM public.profiles
  LOOP
    existing_username := profile_record.username;
    
    -- Check if username is already in the desired format or is a custom username
    -- Custom usernames are those that don't match the old pattern (contains digits/suffixes that aren't part of name)
    -- or are explicitly set by users (like javieralonso1)
    is_custom_username := FALSE;
    
    IF existing_username IS NOT NULL THEN
      -- Check if username ends with digits (likely old generated format or custom)
      -- But also check if it matches what would be generated from full_name
      IF existing_username ~ '[0-9]+$' THEN
        -- Check if this matches what we'd generate from full_name
        IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
          name_parts := string_to_array(trim(profile_record.full_name), ' ');
          IF array_length(name_parts, 1) >= 2 THEN
            first_name := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
            last_name := lower(regexp_replace(name_parts[array_length(name_parts, 1)], '[^a-z0-9]', '', 'g'));
            base_slug := first_name || last_name;
            
            -- If existing username starts with the expected slug pattern, it might be old format
            -- Otherwise, treat as custom username
            IF NOT (existing_username LIKE base_slug || '%') THEN
              is_custom_username := TRUE;
            END IF;
          END IF;
        ELSE
          -- No full_name, so any username with numbers is likely custom
          is_custom_username := TRUE;
        END IF;
      ELSE
        -- Username doesn't end with numbers, might be already in correct format or custom
        -- Check if it matches expected pattern from full_name
        IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
          name_parts := string_to_array(trim(profile_record.full_name), ' ');
          IF array_length(name_parts, 1) >= 2 THEN
            first_name := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
            last_name := lower(regexp_replace(name_parts[array_length(name_parts, 1)], '[^a-z0-9]', '', 'g'));
            base_slug := first_name || last_name;
            
            -- If it matches expected format, keep it; otherwise treat as custom
            IF existing_username != base_slug AND NOT (existing_username LIKE base_slug || '%') THEN
              -- Might be custom, but let's be conservative - only preserve if clearly custom
              -- (e.g., contains numbers in middle, special patterns, etc.)
              IF existing_username ~ '[0-9]' THEN
                is_custom_username := TRUE;
              END IF;
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
    
    -- Skip if custom username should be preserved
    IF is_custom_username THEN
      CONTINUE;
    END IF;
    
    -- Generate new slug from full_name
    IF profile_record.full_name IS NOT NULL AND profile_record.full_name != '' THEN
      name_parts := string_to_array(trim(profile_record.full_name), ' ');
      
      IF array_length(name_parts, 1) >= 2 THEN
        first_name := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
        last_name := lower(regexp_replace(name_parts[array_length(name_parts, 1)], '[^a-z0-9]', '', 'g'));
        base_slug := first_name || last_name;
      ELSIF array_length(name_parts, 1) = 1 THEN
        -- Single name part
        base_slug := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
      ELSE
        -- Empty or invalid name
        base_slug := NULL;
      END IF;
      
      IF base_slug IS NOT NULL AND base_slug != '' THEN
        -- Ensure uniqueness by appending counter if needed
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
      END IF;
    ELSE
      -- No full_name available - generate from user ID as fallback
      IF existing_username IS NULL THEN
        final_slug := 'user' || SUBSTRING(profile_record.id::TEXT FROM 1 FOR 8);
        
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
      END IF;
    END IF;
  END LOOP;
END $$;

-- Update the handle_new_user function to generate username in new format
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
      first_name := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
      last_name := lower(regexp_replace(name_parts[array_length(name_parts, 1)], '[^a-z0-9]', '', 'g'));
      base_slug := first_name || last_name;
    ELSIF array_length(name_parts, 1) = 1 THEN
      base_slug := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
    ELSE
      base_slug := NULL;
    END IF;
    
    IF base_slug IS NOT NULL AND base_slug != '' THEN
      final_slug := base_slug;
      counter := 1;
      
      -- Ensure uniqueness
      WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_slug) LOOP
        final_slug := base_slug || counter::TEXT;
        counter := counter + 1;
      END LOOP;
      
      generated_username := final_slug;
    ELSE
      generated_username := 'user' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
    END IF;
  ELSE
    -- Fallback to email username or user ID
    generated_username := 'user' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
  END IF;
  
  INSERT INTO public.profiles (id, full_name, avatar_url, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    generated_username
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all profiles have a username (fallback for any that were missed)
UPDATE public.profiles
SET username = COALESCE(
  username,
  CASE 
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      LOWER(REGEXP_REPLACE(
        REGEXP_REPLACE(full_name, '^([A-Za-z]+)\s+.*\s+([A-Za-z]+)$', '\1\2'),
        '[^a-z0-9]', '', 'g'
      ))
    ELSE 'user' || SUBSTRING(id::TEXT FROM 1 FOR 8)
  END
)
WHERE username IS NULL;

-- Handle any remaining duplicates by appending user ID suffix
WITH duplicates AS (
  SELECT username, array_agg(id ORDER BY created_at) as ids
  FROM public.profiles 
  WHERE username IS NOT NULL
  GROUP BY username 
  HAVING COUNT(*) > 1
)
UPDATE public.profiles p
SET username = p.username || SUBSTRING(p.id::TEXT FROM 1 FOR 6)
FROM duplicates d
WHERE p.username = d.username 
  AND p.id = ANY(d.ids[2:]);

-- Ensure unique constraint exists
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

-- Create function to update username when full_name changes
CREATE OR REPLACE FUNCTION public.update_profile_username_on_name_change()
RETURNS TRIGGER AS $$
DECLARE
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER;
  current_username TEXT;
  expected_slug TEXT;
BEGIN
  -- Only update if full_name changed and is not null
  IF NEW.full_name IS DISTINCT FROM OLD.full_name 
     AND NEW.full_name IS NOT NULL 
     AND NEW.full_name != '' THEN
    
    -- Check if current username looks like it might be custom
    current_username := COALESCE(NEW.username, OLD.username);
    
    -- Generate expected slug from new full_name
    name_parts := string_to_array(trim(NEW.full_name), ' ');
    
    IF array_length(name_parts, 1) >= 2 THEN
      first_name := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
      last_name := lower(regexp_replace(name_parts[array_length(name_parts, 1)], '[^a-z0-9]', '', 'g'));
      expected_slug := first_name || last_name;
    ELSIF array_length(name_parts, 1) = 1 THEN
      expected_slug := lower(regexp_replace(name_parts[1], '[^a-z0-9]', '', 'g'));
    ELSE
      expected_slug := NULL;
    END IF;
    
    -- Only update username if:
    -- 1. Username is NULL, OR
    -- 2. Current username doesn't match expected format (might be old auto-generated)
    -- Don't update if username appears to be custom (preserve existing custom usernames)
    IF expected_slug IS NOT NULL AND expected_slug != '' THEN
      IF current_username IS NULL THEN
        -- No username, generate new one
        base_slug := expected_slug;
        final_slug := base_slug;
        counter := 1;
        
        WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_slug AND id != NEW.id) LOOP
          final_slug := base_slug || counter::TEXT;
          counter := counter + 1;
        END LOOP;
        
        NEW.username := final_slug;
      ELSIF current_username IS NOT NULL THEN
        -- Check if username matches expected format (with optional numeric suffix)
        -- Build regex pattern: expected_slug optionally followed by numbers
        -- If it doesn't match, update it (preserve custom usernames that match pattern)
        IF current_username !~ ('^' || expected_slug || '([0-9]+)?$') THEN
          -- Current username doesn't match expected format - update to new format
          base_slug := expected_slug;
          final_slug := base_slug;
          counter := 1;
          
          WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_slug AND id != NEW.id) LOOP
            final_slug := base_slug || counter::TEXT;
            counter := counter + 1;
          END LOOP;
          
          NEW.username := final_slug;
        END IF;
        -- If username matches expected format, preserve it
      END IF;
      -- If username matches expected format or appears custom, preserve it
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update username on profile update
DROP TRIGGER IF EXISTS update_profile_username_trigger ON public.profiles;
CREATE TRIGGER update_profile_username_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.full_name IS DISTINCT FROM OLD.full_name)
  EXECUTE FUNCTION public.update_profile_username_on_name_change();

