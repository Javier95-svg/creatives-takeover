-- Fix profile username generation on signup
-- Ensure handle_new_user() always generates username automatically

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

