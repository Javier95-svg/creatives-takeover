-- Phase 1: Remove plaintext exposure by isolating secrets into a locked table with strict RLS

-- Create secure table to hold webhook secrets
CREATE TABLE IF NOT EXISTS public.integration_webhook_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_webhook_id uuid NOT NULL UNIQUE REFERENCES public.integration_webhooks(id) ON DELETE CASCADE,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service role can read/update; no direct inserts/deletes by clients
ALTER TABLE public.integration_webhook_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role can select webhook secrets" ON public.integration_webhook_secrets;
CREATE POLICY "service role can select webhook secrets"
ON public.integration_webhook_secrets
FOR SELECT
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role can update webhook secrets" ON public.integration_webhook_secrets;
CREATE POLICY "service role can update webhook secrets"
ON public.integration_webhook_secrets
FOR UPDATE
USING (auth.role() = 'service_role');

-- Update updated_at automatically
DROP TRIGGER IF EXISTS update_integration_webhook_secrets_updated_at ON public.integration_webhook_secrets;
CREATE TRIGGER update_integration_webhook_secrets_updated_at
BEFORE UPDATE ON public.integration_webhook_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Move any existing secrets and then drop the plaintext column from the main table
INSERT INTO public.integration_webhook_secrets (integration_webhook_id, secret)
SELECT id, webhook_secret
FROM public.integration_webhooks
WHERE webhook_secret IS NOT NULL AND length(webhook_secret) > 0
ON CONFLICT (integration_webhook_id) DO UPDATE
SET secret = EXCLUDED.secret,
    updated_at = now();

-- Remove plaintext column entirely to prevent future exposure
ALTER TABLE public.integration_webhooks DROP COLUMN IF EXISTS webhook_secret;