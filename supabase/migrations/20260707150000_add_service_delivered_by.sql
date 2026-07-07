-- Add service delivery attribution for the marketplace.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS delivered_by_name TEXT,
  ADD COLUMN IF NOT EXISTS delivered_by_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS delivered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivered_by_email TEXT;

COMMENT ON COLUMN public.services.delivered_by_name IS 'Display name of the person or team delivering the service.';
COMMENT ON COLUMN public.services.delivered_by_picture_url IS 'Public image URL for the person or team delivering the service.';
COMMENT ON COLUMN public.services.delivered_by_user_id IS 'Platform user account that receives in-app service messages.';
COMMENT ON COLUMN public.services.delivered_by_email IS 'Public contact email for the service provider.';
