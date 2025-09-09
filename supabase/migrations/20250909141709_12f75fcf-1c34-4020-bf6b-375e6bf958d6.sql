-- Enable pgsodium for field-level encryption
create extension if not exists pgsodium;

-- Create an encryption key for webhook secrets if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pgsodium.keys WHERE name = 'integration_webhook_secrets_key'
  ) THEN
    PERFORM pgsodium.create_key(name => 'integration_webhook_secrets_key');
  END IF;
END;
$$;

-- Secrets table holding only encrypted material, separate from main table
CREATE TABLE IF NOT EXISTS public.integration_webhook_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_webhook_id uuid NOT NULL UNIQUE REFERENCES public.integration_webhooks(id) ON DELETE CASCADE,
  secret_ciphertext bytea NOT NULL,
  secret_nonce bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: lock down secrets so only service_role can read/update
ALTER TABLE public.integration_webhook_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only service role can select webhook secrets" ON public.integration_webhook_secrets;
CREATE POLICY "Only service role can select webhook secrets"
ON public.integration_webhook_secrets
FOR SELECT
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Only service role can update webhook secrets" ON public.integration_webhook_secrets;
CREATE POLICY "Only service role can update webhook secrets"
ON public.integration_webhook_secrets
FOR UPDATE
USING (auth.role() = 'service_role');

-- No INSERT/DELETE policies -> users cannot write directly; writes happen via SECURITY DEFINER trigger

-- Update updated_at on changes
DROP TRIGGER IF EXISTS update_integration_webhook_secrets_updated_at ON public.integration_webhook_secrets;
CREATE TRIGGER update_integration_webhook_secrets_updated_at
BEFORE UPDATE ON public.integration_webhook_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function to transparently encrypt and move plaintext secret from integration_webhooks
CREATE OR REPLACE FUNCTION public.encrypt_and_move_webhook_secret()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_nonce bytea;
  v_key uuid;
  v_cipher bytea;
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.webhook_secret IS NOT NULL AND length(NEW.webhook_secret) > 0 THEN
    v_key := (SELECT key_id FROM pgsodium.keys WHERE name = 'integration_webhook_secrets_key' LIMIT 1);
    v_nonce := pgsodium.crypto_aead_det_noncegen();
    v_cipher := pgsodium.crypto_aead_det_encrypt(
      convert_to(NEW.webhook_secret, 'utf8'),
      ''::bytea,
      v_nonce,
      v_key
    );

    INSERT INTO public.integration_webhook_secrets (integration_webhook_id, secret_ciphertext, secret_nonce)
    VALUES (NEW.id, v_cipher, v_nonce)
    ON CONFLICT (integration_webhook_id) DO UPDATE
      SET secret_ciphertext = EXCLUDED.secret_ciphertext,
          secret_nonce = EXCLUDED.secret_nonce,
          updated_at = now();

    -- remove plaintext from the row
    NEW.webhook_secret := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to the main table
DROP TRIGGER IF EXISTS trg_encrypt_move_webhook_secret ON public.integration_webhooks;
CREATE TRIGGER trg_encrypt_move_webhook_secret
BEFORE INSERT OR UPDATE OF webhook_secret ON public.integration_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_and_move_webhook_secret();

-- Helper to retrieve plaintext (service_role only)
CREATE OR REPLACE FUNCTION public.get_webhook_secret(p_integration_webhook_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_cipher bytea;
  v_nonce bytea;
  v_key uuid;
BEGIN
  -- Hard block non-service roles
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT secret_ciphertext, secret_nonce
  INTO v_cipher, v_nonce
  FROM public.integration_webhook_secrets
  WHERE integration_webhook_id = p_integration_webhook_id;

  IF v_cipher IS NULL THEN
    RETURN NULL;
  END IF;

  v_key := (SELECT key_id FROM pgsodium.keys WHERE name = 'integration_webhook_secrets_key' LIMIT 1);
  RETURN convert_from(
    pgsodium.crypto_aead_det_decrypt(v_cipher, ''::bytea, v_nonce, v_key),
    'utf8'
  );
END;
$$;

-- One-time migration of any existing plaintext secrets
WITH to_encrypt AS (
  SELECT id, webhook_secret, pgsodium.crypto_aead_det_noncegen() AS nonce
  FROM public.integration_webhooks
  WHERE webhook_secret IS NOT NULL AND length(webhook_secret) > 0
)
INSERT INTO public.integration_webhook_secrets (integration_webhook_id, secret_ciphertext, secret_nonce)
SELECT id,
       pgsodium.crypto_aead_det_encrypt(convert_to(webhook_secret, 'utf8'), ''::bytea, nonce, (SELECT key_id FROM pgsodium.keys WHERE name = 'integration_webhook_secrets_key' LIMIT 1)),
       nonce
FROM to_encrypt
ON CONFLICT (integration_webhook_id) DO UPDATE
SET secret_ciphertext = EXCLUDED.secret_ciphertext,
    secret_nonce = EXCLUDED.secret_nonce,
    updated_at = now();

-- Null out any plaintext remnants
UPDATE public.integration_webhooks SET webhook_secret = NULL WHERE webhook_secret IS NOT NULL;