-- Monetization infrastructure: tips, payouts, paid events, premium content
-- Row Level Security enabled for all tables

-- Tips table
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  note TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paid events table
CREATE TABLE IF NOT EXISTS public.paid_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  event_date TIMESTAMPTZ,
  max_participants INTEGER,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'live', 'completed', 'cancelled')),
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Premium content sales table
CREATE TABLE IF NOT EXISTS public.premium_content_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('course', 'ebook', 'template', 'video', 'other')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  stripe_payout_id TEXT,
  stripe_transfer_id TEXT,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stripe Connect accounts table (for onboarding)
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT UNIQUE NOT NULL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  onboarding_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily earnings aggregate table (for charts/analytics)
CREATE TABLE IF NOT EXISTS public.earnings_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  tips_cents INTEGER NOT NULL DEFAULT 0,
  events_cents INTEGER NOT NULL DEFAULT 0,
  content_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tips_to_user ON public.tips(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_from_user ON public.tips(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_status ON public.tips(status);
CREATE INDEX IF NOT EXISTS idx_paid_events_host ON public.paid_events(host_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_premium_content_creator ON public.premium_content_sales(creator_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON public.payouts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_earnings_daily_user_date ON public.earnings_daily(user_id, date DESC);

-- Enable RLS
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paid_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_content_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings_daily ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tips
CREATE POLICY "Users can view tips sent to them"
  ON public.tips FOR SELECT
  USING (auth.uid() = to_user_id);

CREATE POLICY "Users can view tips sent by them"
  ON public.tips FOR SELECT
  USING (auth.uid() = from_user_id OR from_user_id IS NULL);

CREATE POLICY "Users can create tips"
  ON public.tips FOR INSERT
  WITH CHECK (auth.uid() = from_user_id OR from_user_id IS NULL);

-- RLS Policies for paid_events
CREATE POLICY "Users can view their own events"
  ON public.paid_events FOR SELECT
  USING (auth.uid() = host_user_id);

CREATE POLICY "Anyone can view published events"
  ON public.paid_events FOR SELECT
  USING (status IN ('published', 'live', 'completed'));

CREATE POLICY "Users can create their own events"
  ON public.paid_events FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Users can update their own events"
  ON public.paid_events FOR UPDATE
  USING (auth.uid() = host_user_id);

-- RLS Policies for premium_content_sales
CREATE POLICY "Users can view their own content sales"
  ON public.premium_content_sales FOR SELECT
  USING (auth.uid() = creator_user_id);

CREATE POLICY "Users can create their own content sales"
  ON public.premium_content_sales FOR INSERT
  WITH CHECK (auth.uid() = creator_user_id);

CREATE POLICY "Users can update their own content sales"
  ON public.premium_content_sales FOR UPDATE
  USING (auth.uid() = creator_user_id);

-- RLS Policies for payouts
CREATE POLICY "Users can view their own payouts"
  ON public.payouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payout requests"
  ON public.payouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for stripe_connect_accounts
CREATE POLICY "Users can view their own Stripe account"
  ON public.stripe_connect_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Stripe account"
  ON public.stripe_connect_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for earnings_daily
CREATE POLICY "Users can view their own earnings"
  ON public.earnings_daily FOR SELECT
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_tips_updated_at BEFORE UPDATE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paid_events_updated_at BEFORE UPDATE ON public.paid_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_premium_content_sales_updated_at BEFORE UPDATE ON public.premium_content_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stripe_connect_accounts_updated_at BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_earnings_daily_updated_at BEFORE UPDATE ON public.earnings_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

