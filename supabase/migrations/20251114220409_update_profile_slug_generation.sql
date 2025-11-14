-- Update profile username generation to use slug pattern
-- Pattern: lowercase, remove spaces only, keep special characters (ñ, é, etc.)
-- Examples: "Carlos Rodriguez" -> "carlosrodriguez", "Javier Peña" -> "javierpeña"

-- Create a function to generate profile slug from full_name
CREATE OR REPLACE FUNCTION generate_profile_slug(full_name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF full_name IS NULL OR full_name = '' THEN
    RETURN NULL;
  END IF;
  
  -- Convert to lowercase and remove spaces only (keep all other characters)
  RETURN LOWER(REGEXP_REPLACE(full_name, '\s+', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing usernames to use the new pattern
UPDATE public.profiles 
SET username = generate_profile_slug(full_name)
WHERE full_name IS NOT NULL AND full_name != '';

-- Handle duplicate usernames by appending unique suffix
DO $$
DECLARE
  profile_record RECORD;
  base_username TEXT;
  final_username TEXT;
  counter INTEGER;
BEGIN
  FOR profile_record IN 
    SELECT id, username, full_name 
    FROM public.profiles 
    WHERE username IS NOT NULL
    ORDER BY created_at
  LOOP
    base_username := generate_profile_slug(profile_record.full_name);
    
    IF base_username IS NULL THEN
      CONTINUE;
    END IF;
    
    final_username := base_username;
    counter := 1;
    
    -- Check if this username already exists for a different user
    WHILE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE username = final_username 
      AND id != profile_record.id
    ) LOOP
      final_username := base_username || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Update the profile with unique username
    UPDATE public.profiles 
    SET username = final_username 
    WHERE id = profile_record.id;
  END LOOP;
END $$;

-- Create a trigger function to auto-generate username on insert/update
CREATE OR REPLACE FUNCTION auto_generate_username()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  final_username TEXT;
  counter INTEGER;
BEGIN
  -- Only generate if username is not set or full_name changed
  IF NEW.username IS NULL OR (OLD.full_name IS DISTINCT FROM NEW.full_name AND NEW.username = generate_profile_slug(OLD.full_name)) THEN
    new_username := generate_profile_slug(NEW.full_name);
    
    IF new_username IS NOT NULL THEN
      final_username := new_username;
      counter := 1;
      
      -- Ensure uniqueness
      WHILE EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = final_username 
        AND id != NEW.id
      ) LOOP
        final_username := new_username || counter;
        counter := counter + 1;
      END LOOP;
      
      NEW.username := final_username;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_generate_username ON public.profiles;

-- Create trigger to auto-generate username
CREATE TRIGGER trigger_auto_generate_username
  BEFORE INSERT OR UPDATE OF full_name ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_username();

-- Create index on username for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

