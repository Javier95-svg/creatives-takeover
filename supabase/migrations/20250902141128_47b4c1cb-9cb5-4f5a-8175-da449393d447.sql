-- Phase 1: Credits Infrastructure
-- 1) Enum for transaction types
DO $$ BEGIN
  CREATE TYPE public.credit_tx_type AS ENUM ('grant', 'deduct', 'purchase', 'refund', 'adjustment', 'reset');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Core tables
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  monthly_quota integer NOT NULL DEFAULT 0,
  last_reset_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL, -- positive for grants/purchases, negative for deductions
  tx_type public.credit_tx_type NOT NULL,
  reason text,
  feature text,
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_tx_user_created ON public.credit_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_type ON public.credit_transactions (tx_type);

-- 4) Timestamps trigger for user_credits
DROP TRIGGER IF EXISTS trg_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER trg_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Enable Row Level Security
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- 6) RLS Policies
-- user_credits: users manage their own balance row
DROP POLICY IF EXISTS "Users can view their credit balance" ON public.user_credits;
CREATE POLICY "Users can view their credit balance"
ON public.user_credits FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their credit row" ON public.user_credits;
CREATE POLICY "Users can insert their credit row"
ON public.user_credits FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credit row" ON public.user_credits;
CREATE POLICY "Users can update their own credit row"
ON public.user_credits FOR UPDATE
USING (auth.uid() = user_id);

-- credit_transactions: users can log and view their own
DROP POLICY IF EXISTS "Users can view their credit transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their credit transactions"
ON public.credit_transactions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their credit transactions" ON public.credit_transactions;
CREATE POLICY "Users can insert their credit transactions"
ON public.credit_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 7) Profiles quick-access columns
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credit_balance integer NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_credit_reset_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- 8) Sync profile.credit_balance with user_credits.balance
CREATE OR REPLACE FUNCTION public.sync_profile_credit_balance()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles 
    SET credit_balance = NEW.balance,
        updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_profile_credit_balance ON public.user_credits;
CREATE TRIGGER trg_sync_profile_credit_balance
AFTER INSERT OR UPDATE ON public.user_credits
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_credit_balance();

-- 9) Initialize user_credits for existing profiles
INSERT INTO public.user_credits (user_id, balance, monthly_quota, last_reset_at)
SELECT p.id, COALESCE(p.credit_balance, 0), 0, COALESCE(p.last_credit_reset_at, now())
FROM public.profiles p
LEFT JOIN public.user_credits uc ON uc.user_id = p.id
WHERE uc.user_id IS NULL;

-- 10) Auto-create user_credits row upon new profile creation
CREATE OR REPLACE FUNCTION public.create_user_credits_for_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, monthly_quota, last_reset_at)
  VALUES (NEW.id, COALESCE(NEW.credit_balance, 0), 0, COALESCE(NEW.last_credit_reset_at, now()))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_profile_after_insert_create_user_credits ON public.profiles;
CREATE TRIGGER trg_profile_after_insert_create_user_credits
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_user_credits_for_profile();