-- Revenue P0: establish one canonical Stripe Checkout contract.
-- Live Price IDs are intentionally not embedded in source control. Populate all
-- six columns during the production audit before deploying create-checkout.

ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS stripe_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS stripe_price_id_yearly text;

-- Preserve a previously configured monthly price while moving to the explicit
-- interval columns. Yearly remains fail-closed until it is audited and set.
UPDATE public.subscription_tiers
SET stripe_price_id_monthly = stripe_price_id
WHERE tier_name IN ('starter', 'rising', 'pro')
  AND stripe_price_id_monthly IS NULL
  AND stripe_price_id IS NOT NULL;

INSERT INTO public.subscription_tiers (
  tier_name,
  monthly_credits,
  price_cents,
  features
)
VALUES
  ('rookie', 50, 0, '["50 monthly credits", "Message and save mentors"]'::jsonb),
  ('starter', 100, 900, '["100 monthly credits", "Message and save mentors"]'::jsonb),
  ('rising', 250, 2900, '["250 monthly credits", "Message and save mentors"]'::jsonb),
  ('pro', 600, 6500, '["600 monthly credits", "Message and save mentors", "Expert accountability"]'::jsonb)
ON CONFLICT (tier_name) DO UPDATE
SET monthly_credits = EXCLUDED.monthly_credits,
    price_cents = EXCLUDED.price_cents,
    features = EXCLUDED.features;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_tiers_stripe_price_monthly_unique
  ON public.subscription_tiers (stripe_price_id_monthly)
  WHERE stripe_price_id_monthly IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_tiers_stripe_price_yearly_unique
  ON public.subscription_tiers (stripe_price_id_yearly)
  WHERE stripe_price_id_yearly IS NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_subscription_tier_for_stripe_price_v1(
  p_stripe_price_id text,
  p_billing_cycle text
)
RETURNS TABLE (tier_name text, monthly_credits integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT st.tier_name, st.monthly_credits
  FROM public.subscription_tiers st
  WHERE st.tier_name IN ('starter', 'rising', 'pro')
    AND (
      (lower(btrim(COALESCE(p_billing_cycle, 'monthly'))) IN ('year', 'yearly')
        AND st.stripe_price_id_yearly = p_stripe_price_id)
      OR
      (lower(btrim(COALESCE(p_billing_cycle, 'monthly'))) NOT IN ('year', 'yearly')
        AND st.stripe_price_id_monthly = p_stripe_price_id)
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_subscription_tier_for_stripe_price_v1(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_subscription_tier_for_stripe_price_v1(text, text)
  TO service_role;

CREATE TABLE IF NOT EXISTS public.stripe_checkout_sessions (
  stripe_session_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  purchase_type text NOT NULL CHECK (purchase_type IN ('subscription', 'credit_pack')),
  plan text CHECK (plan IS NULL OR plan IN ('starter', 'rising', 'pro')),
  billing_cycle text CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly')),
  pack_id text,
  purchase_source text NOT NULL DEFAULT 'unknown',
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'completed', 'expired', 'payment_failed')),
  terminal_event_id text,
  terminal_event_type text,
  failure_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  terminal_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (purchase_type = 'subscription' AND plan IS NOT NULL AND billing_cycle IS NOT NULL AND pack_id IS NULL)
    OR
    (purchase_type = 'credit_pack' AND pack_id IS NOT NULL AND plan IS NULL AND billing_cycle IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS stripe_checkout_sessions_user_created_idx
  ON public.stripe_checkout_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stripe_checkout_sessions_open_idx
  ON public.stripe_checkout_sessions (created_at)
  WHERE status = 'created';

ALTER TABLE public.stripe_checkout_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_checkout_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.stripe_checkout_sessions TO service_role;

-- Some environments created this table directly before it was captured in
-- migrations. Define the durable delivery ledger here so fresh databases and
-- production upgrades share the same webhook contract.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  customer_id text,
  customer_email text,
  subscription_id text,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_unprocessed_idx
  ON public.stripe_webhook_events (created_at)
  WHERE processed IS NOT TRUE;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stripe_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.stripe_webhook_events TO service_role;

-- Operations can alert on any row returned here. A session is considered stale
-- after two hours; Stripe-hosted Checkout normally expires later, so this catches
-- broken delivery or severe abandonment early without marking it fulfilled.
CREATE OR REPLACE VIEW public.revenue_checkout_alerts_v1
WITH (security_invoker = true)
AS
  SELECT
    'checkout_session_stale'::text AS alert_type,
    stripe_session_id AS reference_id,
    created_at AS detected_at,
    jsonb_build_object(
      'user_id', user_id,
      'purchase_type', purchase_type,
      'plan', plan,
      'billing_cycle', billing_cycle,
      'pack_id', pack_id,
      'purchase_source', purchase_source
    ) AS context
  FROM public.stripe_checkout_sessions
  WHERE status = 'created'
    AND created_at < now() - interval '2 hours'
  UNION ALL
  SELECT
    'checkout_payment_failed'::text,
    stripe_session_id,
    COALESCE(terminal_at, updated_at),
    jsonb_build_object('failure_code', failure_code, 'terminal_event_id', terminal_event_id)
  FROM public.stripe_checkout_sessions
  WHERE status = 'payment_failed'
  UNION ALL
  SELECT
    'webhook_unprocessed'::text,
    event_id,
    created_at,
    jsonb_build_object('event_type', event_type, 'error_message', error_message)
  FROM public.stripe_webhook_events
  WHERE processed IS NOT TRUE
    AND created_at < now() - interval '5 minutes';

REVOKE ALL ON public.revenue_checkout_alerts_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.revenue_checkout_alerts_v1 TO service_role;
