-- Grant Professional tier access to admin@creatives-takeover.com
-- This ensures the developer has full access to all features for testing and review

-- Update handle_new_user trigger to set professional tier for admin email
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
  is_admin BOOLEAN;
  admin_tier TEXT;
BEGIN
  -- Check if this is the admin account
  is_admin := (LOWER(NEW.email) = 'admin@creatives-takeover.com');
  admin_tier := CASE WHEN is_admin THEN 'professional' ELSE 'free' END;
  
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
  
  -- Insert profile with username and subscription tier
  INSERT INTO public.profiles (id, full_name, avatar_url, username, subscription_tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    generated_username,
    admin_tier
  )
  ON CONFLICT (id) DO UPDATE SET
    subscription_tier = CASE WHEN is_admin THEN 'professional' ELSE profiles.subscription_tier END;
  
  -- Also initialize user_credits for admin (normal credits, but professional tier for feature access)
  IF is_admin THEN
    INSERT INTO public.user_credits (user_id, balance, subscription_tier, monthly_quota)
    VALUES (
      NEW.id,
      5, -- Normal free credits (admin gets feature access, not extra credits)
      'professional', -- Professional tier for feature access
      5
    )
    ON CONFLICT (user_id) DO UPDATE SET
      subscription_tier = 'professional';
    
    -- Insert into subscribers table to mark as subscribed
    INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
    VALUES (
      NEW.id,
      NEW.email,
      true,
      'professional'
    )
    ON CONFLICT (email) DO UPDATE SET
      subscribed = true,
      subscription_tier = 'professional';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing admin account if it exists
UPDATE public.profiles
SET subscription_tier = 'professional'
WHERE id IN (
  SELECT id FROM auth.users WHERE LOWER(email) = 'admin@creatives-takeover.com'
)
AND subscription_tier != 'professional';

-- Update user_credits for existing admin account
UPDATE public.user_credits
SET subscription_tier = 'professional'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE LOWER(email) = 'admin@creatives-takeover.com'
)
AND subscription_tier != 'professional';

-- Update subscribers table for existing admin account
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
SELECT 
  id,
  email,
  true,
  'professional'
FROM auth.users
WHERE LOWER(email) = 'admin@creatives-takeover.com'
ON CONFLICT (email) DO UPDATE SET
  subscribed = true,
  subscription_tier = 'professional';

