-- Use auth.users.id as the canonical identity for subscribers and subscription updates.
-- Email remains a synced attribute copied from auth.users.email, never the primary identity key.

-- 1) Deduplicate subscribers by user_id before enforcing uniqueness.
WITH ranked AS (
  SELECT
    id,
    user_id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.subscribers
  WHERE user_id IS NOT NULL
)
DELETE FROM public.subscribers s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- 2) Deduplicate orphaned subscribers by email as a secondary cleanup.
WITH ranked AS (
  SELECT
    id,
    lower(email) AS email_key,
    row_number() OVER (
      PARTITION BY lower(email)
      ORDER BY (user_id IS NOT NULL) DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.subscribers
)
DELETE FROM public.subscribers s
USING ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- 3) Ensure subscriber emails reflect auth.users.email exactly.
UPDATE public.subscribers s
SET
  email = u.email,
  updated_at = now()
FROM auth.users u
WHERE s.user_id = u.id
  AND s.email IS DISTINCT FROM u.email;

-- 4) Enforce canonical identity and keep email uniqueness.
DO $$
BEGIN
  ALTER TABLE public.subscribers
    ADD CONSTRAINT subscribers_user_id_key UNIQUE (user_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END;
$$;

-- 5) Tighten RLS to identity-based access only.
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid());

-- 6) Rebuild subscriber creation to key by user_id and pull email from auth.users.
CREATE OR REPLACE FUNCTION public.create_subscriber_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
  SELECT
    NEW.id,
    au.email,
    false,
    'free'
  FROM auth.users au
  WHERE au.id = NEW.id
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_after_insert_create_subscriber ON public.profiles;
CREATE TRIGGER trg_profile_after_insert_create_subscriber
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_subscriber_for_profile();

-- 7) Ensure auth.users email changes create or update the subscriber row by user_id.
CREATE OR REPLACE FUNCTION public.sync_subscriber_email_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
  VALUES (NEW.id, NEW.email, false, 'free')
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 8) Canonical subscription updater now accepts user_id, not email.
CREATE OR REPLACE FUNCTION public.update_user_subscription_tier(
  target_user_id UUID,
  new_tier TEXT,
  is_subscribed BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier_credits INTEGER;
  current_user_email TEXT;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  SELECT u.email
  INTO current_user_email
  FROM auth.users u
  WHERE u.id = target_user_id;

  IF current_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found for ID: %', target_user_id;
  END IF;

  SELECT monthly_credits
  INTO tier_credits
  FROM public.subscription_tiers
  WHERE tier_name = new_tier;

  IF tier_credits IS NULL THEN
    RAISE EXCEPTION 'Invalid subscription tier: %', new_tier;
  END IF;

  INSERT INTO public.subscribers (
    user_id,
    email,
    subscribed,
    subscription_tier,
    updated_at
  )
  VALUES (
    target_user_id,
    current_user_email,
    is_subscribed,
    new_tier,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    subscribed = EXCLUDED.subscribed,
    subscription_tier = EXCLUDED.subscription_tier,
    updated_at = now();

  UPDATE public.user_credits
  SET
    subscription_tier = new_tier,
    last_credit_grant = CASE
      WHEN is_subscribed AND subscription_tier != new_tier THEN now()
      ELSE last_credit_grant
    END
  WHERE user_id = target_user_id;

  IF is_subscribed AND EXISTS (
    SELECT 1
    FROM public.user_credits
    WHERE user_id = target_user_id
      AND (last_credit_grant IS NULL OR last_credit_grant < date_trunc('month', now()))
  ) THEN
    UPDATE public.user_credits
    SET
      balance = balance + tier_credits,
      last_credit_grant = now()
    WHERE user_id = target_user_id;

    INSERT INTO public.credit_transactions (
      user_id,
      amount,
      tx_type,
      reason,
      feature
    )
    VALUES (
      target_user_id,
      tier_credits,
      'grant',
      'Subscription tier upgrade credit allocation',
      'Subscription - ' || new_tier
    );
  END IF;
END;
$$;
