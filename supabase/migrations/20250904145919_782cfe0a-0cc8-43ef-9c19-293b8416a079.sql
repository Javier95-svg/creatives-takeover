-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.refresh_expired_trends()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark expired trends as inactive
  UPDATE trends 
  SET is_active = false 
  WHERE expires_at < now() AND is_active = true;
END;
$$;