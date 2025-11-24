-- Enforce subscription tier requirement for publishing prompt chains
-- Only Creator, Professional, and Enterprise tier users can publish prompt chains

-- Create function to check if user has permission to publish
CREATE OR REPLACE FUNCTION public.can_publish_prompt_chain(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
BEGIN
  -- Get user's subscription tier from subscribers table
  SELECT COALESCE(subscription_tier, 'free') INTO user_tier
  FROM public.subscribers
  WHERE subscribers.user_id = user_id_param
  LIMIT 1;

  -- If no subscription record found, default to free
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;

  -- Only Creator, Professional, and Enterprise tiers can publish
  RETURN user_tier IN ('creator', 'professional', 'enterprise');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to prevent publishing for free tier users
CREATE OR REPLACE FUNCTION public.check_prompt_chain_publish_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check when trying to set published = true
  IF NEW.published = true AND (OLD.published IS NULL OR OLD.published = false) THEN
    -- Check if user has permission to publish
    IF NOT public.can_publish_prompt_chain(NEW.user_id) THEN
      RAISE EXCEPTION 'Upgrade to Creator or Professional plan to publish prompt chains. Your current subscription tier does not allow publishing.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce publishing permission
DROP TRIGGER IF EXISTS enforce_prompt_chain_publish_permission ON public.custom_prompt_chains;
CREATE TRIGGER enforce_prompt_chain_publish_permission
  BEFORE INSERT OR UPDATE ON public.custom_prompt_chains
  FOR EACH ROW
  EXECUTE FUNCTION public.check_prompt_chain_publish_permission();

-- Add comment explaining the enforcement
COMMENT ON FUNCTION public.can_publish_prompt_chain IS 'Checks if a user has permission to publish prompt chains based on their subscription tier';
COMMENT ON FUNCTION public.check_prompt_chain_publish_permission IS 'Trigger function that prevents free tier users from publishing prompt chains';

