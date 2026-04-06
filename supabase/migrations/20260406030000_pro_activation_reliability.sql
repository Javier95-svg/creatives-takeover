-- Reliable Pro activation onboarding via a durable outbox.

CREATE TABLE IF NOT EXISTS public.pro_activation_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  startup_name TEXT,
  subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_event_id TEXT NOT NULL,
  stripe_event_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 6 CHECK (max_attempts >= 1),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_activation_outbox_status_due
  ON public.pro_activation_outbox(status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_pro_activation_outbox_user_created
  ON public.pro_activation_outbox(user_id, created_at DESC);

ALTER TABLE public.pro_activation_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for pro activation outbox" ON public.pro_activation_outbox;
CREATE POLICY "Service role only for pro activation outbox"
  ON public.pro_activation_outbox
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS pro_activation_outbox_set_updated_at ON public.pro_activation_outbox;
CREATE TRIGGER pro_activation_outbox_set_updated_at
BEFORE UPDATE ON public.pro_activation_outbox
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.enqueue_pro_activation_outbox(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_startup_name TEXT,
  p_subscription_id TEXT,
  p_stripe_customer_id TEXT,
  p_stripe_event_id TEXT,
  p_stripe_event_type TEXT,
  p_idempotency_key TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_stripe_event_id IS NULL OR btrim(p_stripe_event_id) = '' THEN
    RAISE EXCEPTION 'Stripe event ID is required';
  END IF;

  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  INSERT INTO public.pro_activation_outbox (
    user_id,
    email,
    full_name,
    startup_name,
    subscription_id,
    stripe_customer_id,
    stripe_event_id,
    stripe_event_type,
    idempotency_key,
    payload
  ) VALUES (
    p_user_id,
    NULLIF(btrim(COALESCE(p_email, '')), ''),
    NULLIF(btrim(COALESCE(p_full_name, '')), ''),
    NULLIF(btrim(COALESCE(p_startup_name, '')), ''),
    NULLIF(btrim(COALESCE(p_subscription_id, '')), ''),
    NULLIF(btrim(COALESCE(p_stripe_customer_id, '')), ''),
    p_stripe_event_id,
    p_stripe_event_type,
    p_idempotency_key,
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (idempotency_key) DO UPDATE
  SET payload = public.pro_activation_outbox.payload
  RETURNING id INTO v_row_id;

  RETURN v_row_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_due_pro_activation_outbox(p_limit INTEGER DEFAULT 25)
RETURNS SETOF public.pro_activation_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective_limit INTEGER := GREATEST(1, LEAST(COALESCE(p_limit, 25), 100));
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT q.id
    FROM public.pro_activation_outbox q
    WHERE q.attempts < q.max_attempts
      AND (
        (q.status IN ('pending', 'failed') AND q.next_attempt_at <= now())
        OR (q.status = 'sending' AND COALESCE(q.last_attempt_at, q.updated_at, q.created_at) < now() - interval '15 minutes')
      )
    ORDER BY q.next_attempt_at ASC, q.created_at ASC
    LIMIT v_effective_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.pro_activation_outbox q
  SET
    status = 'sending',
    attempts = q.attempts + 1,
    last_attempt_at = now(),
    last_error = NULL,
    next_attempt_at = now()
  FROM due
  WHERE q.id = due.id
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_pro_activation_outbox(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_pro_activation_outbox(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.enqueue_pro_activation_outbox(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_pro_activation_outbox(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.claim_due_pro_activation_outbox(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_due_pro_activation_outbox(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.claim_due_pro_activation_outbox(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_pro_activation_outbox(INTEGER) TO service_role;

COMMENT ON TABLE public.pro_activation_outbox IS 'Durable delivery queue for Pro onboarding activation events.';
COMMENT ON FUNCTION public.enqueue_pro_activation_outbox(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB)
IS 'Persists one durable Pro onboarding activation event keyed by Stripe event and user/subscription identity.';
COMMENT ON FUNCTION public.claim_due_pro_activation_outbox(INTEGER)
IS 'Claims pending, failed, or stale-sending Pro activation events for asynchronous delivery with retry.';