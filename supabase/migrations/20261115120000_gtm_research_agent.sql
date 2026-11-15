-- GTM Strategist research agent (docs/gtm-research-agent-plan.md, Phase A).
--
-- 1. credit_reservations: a feature-agnostic hold -> capture -> release
--    wallet, generalised from mvp_builder_credit_reservations (which stays as
--    is). A hold must cover the full listed price; capture may charge less and
--    returns the remainder.
-- 2. Research runs, their steps (a durable queue the worker drains one step
--    per invocation), prospects, outreach drafts, a shared domain cache,
--    suppressions and a provider spend ledger.
-- 3. A one-minute sweeper that wakes the worker, and a daily retention job.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Generic credit reservations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  idempotency_key TEXT NOT NULL,
  listed_price INTEGER NOT NULL CHECK (listed_price > 0),
  held_amount INTEGER NOT NULL CHECK (held_amount > 0),
  used_from_quota INTEGER NOT NULL DEFAULT 0 CHECK (used_from_quota >= 0),
  used_from_balance INTEGER NOT NULL DEFAULT 0 CHECK (used_from_balance >= 0),
  charged_amount INTEGER CHECK (charged_amount IS NULL OR charged_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'finalized', 'released', 'expired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  release_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '30 minutes',
  finalized_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_credit_reservations_pending_expiry
  ON public.credit_reservations (expires_at) WHERE status = 'pending';

ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own credit reservations" ON public.credit_reservations;
CREATE POLICY "Users can view their own credit reservations"
  ON public.credit_reservations FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.credit_reservations FROM anon, authenticated;
GRANT ALL ON public.credit_reservations TO service_role;

-- Holds the full listed price, quota first, then balance. Idempotent per key.
CREATE OR REPLACE FUNCTION public.reserve_credits_v1(
  p_user_id UUID,
  p_feature TEXT,
  p_amount INTEGER,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ttl_minutes INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing public.credit_reservations;
  v_reservation public.credit_reservations;
  v_balance INTEGER;
  v_quota INTEGER;
  v_from_quota INTEGER;
  v_from_balance INTEGER;
BEGIN
  IF p_feature IS NULL OR p_feature !~ '^[A-Z][A-Z0-9_]{2,63}$'
     OR p_amount IS NULL OR p_amount <= 0
     OR NULLIF(TRIM(COALESCE(p_idempotency_key, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'INVALID_RESERVATION');
  END IF;

  SELECT balance, monthly_quota INTO v_balance, v_quota
    FROM public.user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'USER_NOT_FOUND');
  END IF;

  SELECT * INTO v_existing FROM public.credit_reservations
   WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', v_existing.status IN ('pending', 'finalized'),
      'reservationId', v_existing.id,
      'reservationStatus', v_existing.status,
      'heldCredits', v_existing.held_amount,
      'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0),
      'replayed', true
    );
  END IF;

  IF COALESCE(v_balance, 0) + COALESCE(v_quota, 0) < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 'error', 'Insufficient credits', 'errorCode', 'INSUFFICIENT_CREDITS',
      'requiredCredits', p_amount, 'availableCredits', COALESCE(v_balance, 0) + COALESCE(v_quota, 0)
    );
  END IF;

  v_from_quota := LEAST(GREATEST(COALESCE(v_quota, 0), 0), p_amount);
  v_from_balance := p_amount - v_from_quota;

  UPDATE public.user_credits
     SET monthly_quota = COALESCE(monthly_quota, 0) - v_from_quota,
         balance = COALESCE(balance, 0) - v_from_balance
   WHERE user_id = p_user_id
   RETURNING balance, monthly_quota INTO v_balance, v_quota;

  INSERT INTO public.credit_reservations (
    user_id, feature, idempotency_key, listed_price, held_amount,
    used_from_quota, used_from_balance, metadata, expires_at
  ) VALUES (
    p_user_id, p_feature, p_idempotency_key, p_amount, p_amount,
    v_from_quota, v_from_balance, COALESCE(p_metadata, '{}'::jsonb),
    now() + make_interval(mins => GREATEST(1, LEAST(COALESCE(p_ttl_minutes, 30), 240)))
  ) RETURNING * INTO v_reservation;

  RETURN jsonb_build_object(
    'success', true, 'reservationId', v_reservation.id, 'reservationStatus', 'pending',
    'heldCredits', p_amount, 'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0)
  );
END;
$$;

-- Keeps a running job's hold alive.
CREATE OR REPLACE FUNCTION public.extend_credit_reservation_v1(p_reservation_id UUID, p_minutes INTEGER DEFAULT 30)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.credit_reservations
     SET expires_at = GREATEST(expires_at, now() + make_interval(mins => GREATEST(1, LEAST(p_minutes, 240)))),
         updated_at = now()
   WHERE id = p_reservation_id AND status = 'pending'
  RETURNING true;
$$;

-- Charges p_charge (0..held) and returns the rest to the wallet: balance
-- (which never expires) first, then quota. p_charge = 0 is a full release.
CREATE OR REPLACE FUNCTION public.finalize_credit_reservation_v1(
  p_reservation_id UUID,
  p_charge INTEGER,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_reservation public.credit_reservations;
  v_charge INTEGER;
  v_return INTEGER;
  v_return_balance INTEGER;
  v_return_quota INTEGER;
  v_balance INTEGER;
  v_quota INTEGER;
BEGIN
  SELECT * INTO v_reservation FROM public.credit_reservations WHERE id = p_reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'errorCode', 'RESERVATION_NOT_FOUND');
  END IF;
  IF v_reservation.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', v_reservation.status = 'finalized', 'reservationId', v_reservation.id,
      'reservationStatus', v_reservation.status, 'creditsUsed', COALESCE(v_reservation.charged_amount, 0), 'replayed', true
    );
  END IF;

  v_charge := LEAST(GREATEST(COALESCE(p_charge, 0), 0), v_reservation.held_amount);
  v_return := v_reservation.held_amount - v_charge;
  v_return_balance := LEAST(v_return, v_reservation.used_from_balance);
  v_return_quota := v_return - v_return_balance;

  UPDATE public.user_credits
     SET balance = COALESCE(balance, 0) + v_return_balance,
         monthly_quota = COALESCE(monthly_quota, 0) + v_return_quota
   WHERE user_id = v_reservation.user_id
   RETURNING balance, monthly_quota INTO v_balance, v_quota;

  IF v_charge > 0 THEN
    INSERT INTO public.credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
    VALUES (
      v_reservation.user_id, -v_charge, 'deduct',
      FORMAT('Used %s credits for %s', v_charge, v_reservation.feature),
      v_reservation.feature,
      jsonb_strip_nulls(v_reservation.metadata || COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'reservationId', v_reservation.id,
        'idempotencyKey', v_reservation.idempotency_key,
        'listedCreditCost', v_reservation.listed_price,
        'creditCost', v_charge,
        'usedFromQuota', v_reservation.used_from_quota - v_return_quota,
        'usedFromBalance', v_reservation.used_from_balance - v_return_balance,
        'balanceAfter', v_balance,
        'monthlyQuotaAfter', v_quota
      ))
    );
  END IF;

  UPDATE public.credit_reservations
     SET status = CASE WHEN v_charge > 0 THEN 'finalized' ELSE 'released' END,
         charged_amount = v_charge,
         finalized_at = CASE WHEN v_charge > 0 THEN now() END,
         released_at = CASE WHEN v_charge = 0 THEN now() END,
         release_reason = CASE WHEN v_charge = 0 THEN 'Nothing delivered' END,
         metadata = metadata || COALESCE(p_metadata, '{}'::jsonb),
         updated_at = now()
   WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true, 'reservationId', v_reservation.id,
    'reservationStatus', CASE WHEN v_charge > 0 THEN 'finalized' ELSE 'released' END,
    'creditsUsed', v_charge, 'creditsReturned', v_return,
    'balanceAfter', COALESCE(v_balance, 0) + COALESCE(v_quota, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_credit_reservations_v1()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT id FROM public.credit_reservations
     WHERE status = 'pending' AND expires_at <= now()
     FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.finalize_credit_reservation_v1(v_row.id, 0, jsonb_build_object('releaseReason', 'expired'));
    UPDATE public.credit_reservations SET status = 'expired', release_reason = 'Hold expired' WHERE id = v_row.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_credits_v1(UUID, TEXT, INTEGER, TEXT, JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.extend_credit_reservation_v1(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_credit_reservation_v1(UUID, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_expired_credit_reservations_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits_v1(UUID, TEXT, INTEGER, TEXT, JSONB, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.extend_credit_reservation_v1(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_credit_reservation_v1(UUID, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_credit_reservations_v1() TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Research runs, steps, prospects, drafts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gtm_research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  gtm_plan_id UUID,
  play_id TEXT,
  status TEXT NOT NULL DEFAULT 'analyzing' CHECK (status IN
    ('analyzing', 'needs_review', 'queued', 'running', 'partial', 'completed', 'failed', 'cancelled')),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  business_profile JSONB,
  competitors JSONB NOT NULL DEFAULT '[]'::jsonb,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_segment JSONB,
  target_count INTEGER NOT NULL DEFAULT 20 CHECK (target_count BETWEEN 1 AND 60),
  counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  reservation_id UUID REFERENCES public.credit_reservations(id) ON DELETE SET NULL,
  credits_reserved INTEGER NOT NULL DEFAULT 0,
  credits_charged INTEGER,
  gifted BOOLEAN NOT NULL DEFAULT false,
  error_code TEXT,
  error_detail TEXT,
  idempotency_key TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_gtm_research_runs_user_project ON public.gtm_research_runs (user_id, project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.gtm_research_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.gtm_research_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL CHECK (key IN ('read_site', 'understand_business', 'find_competitors', 'propose_segments',
    'discover_companies', 'qualify_companies', 'draft_outreach', 'finalize')),
  batch INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'partial', 'failed', 'skipped')),
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  lease_until TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  log TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, key, batch)
);
CREATE INDEX IF NOT EXISTS idx_gtm_research_steps_due ON public.gtm_research_steps (next_attempt_at)
  WHERE status IN ('queued', 'running');

CREATE TABLE IF NOT EXISTS public.gtm_prospect_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.gtm_research_runs(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  size_band TEXT,
  industry TEXT,
  fit_score INTEGER NOT NULL DEFAULT 0 CHECK (fit_score BETWEEN 0 AND 100),
  fit_tier TEXT NOT NULL CHECK (fit_tier IN ('A', 'B', 'C')),
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_routes JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_roles TEXT[] NOT NULL DEFAULT '{}',
  blocked BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'shortlisted', 'dismissed', 'in_pipeline', 'contacted')),
  feedback JSONB,
  pipeline_entry_id TEXT,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One row per company per project (account-level when no project): repeat runs merge.
CREATE UNIQUE INDEX IF NOT EXISTS gtm_prospect_companies_project_domain
  ON public.gtm_prospect_companies (user_id, COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid), domain);
CREATE INDEX IF NOT EXISTS idx_gtm_prospect_companies_run ON public.gtm_prospect_companies (run_id);

CREATE TABLE IF NOT EXISTS public.gtm_outreach_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.gtm_prospect_companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent_manually')),
  generated_from JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prospect_id)
);

-- Company pages fetched for any founder, reused for 30 days. Public business
-- information only; never personal data.
CREATE TABLE IF NOT EXISTS public.gtm_domain_cache (
  domain TEXT PRIMARY KEY,
  pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked BOOLEAN NOT NULL DEFAULT false,
  http_status INTEGER,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Companies (or addresses) that asked not to be included in research.
CREATE TABLE IF NOT EXISTS public.gtm_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  email TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gtm_suppressions_domain_email ON public.gtm_suppressions (domain, COALESCE(email, ''));

CREATE TABLE IF NOT EXISTS public.provider_spend_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature TEXT NOT NULL,
  provider TEXT NOT NULL,
  run_id UUID,
  units NUMERIC NOT NULL DEFAULT 1,
  est_cost_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_provider_spend_ledger_feature_month ON public.provider_spend_ledger (feature, created_at);

-- Row level security: founders read their own work and may change only the
-- fields a person decides (prospect status and feedback, draft text and status).
ALTER TABLE public.gtm_research_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_research_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_prospect_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_outreach_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_domain_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_spend_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read research runs" ON public.gtm_research_runs;
CREATE POLICY "Owners read research runs" ON public.gtm_research_runs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners read research steps" ON public.gtm_research_steps;
CREATE POLICY "Owners read research steps" ON public.gtm_research_steps FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners read prospects" ON public.gtm_prospect_companies;
CREATE POLICY "Owners read prospects" ON public.gtm_prospect_companies FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners update prospects" ON public.gtm_prospect_companies;
CREATE POLICY "Owners update prospects" ON public.gtm_prospect_companies FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners read drafts" ON public.gtm_outreach_drafts;
CREATE POLICY "Owners read drafts" ON public.gtm_outreach_drafts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners update drafts" ON public.gtm_outreach_drafts;
CREATE POLICY "Owners update drafts" ON public.gtm_outreach_drafts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE ALL ON public.gtm_research_runs, public.gtm_research_steps, public.gtm_prospect_companies,
  public.gtm_outreach_drafts, public.gtm_domain_cache, public.gtm_suppressions, public.provider_spend_ledger FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.gtm_research_runs, public.gtm_research_steps FROM authenticated;
REVOKE ALL ON public.gtm_domain_cache, public.gtm_suppressions, public.provider_spend_ledger FROM authenticated;
REVOKE INSERT, DELETE, UPDATE ON public.gtm_prospect_companies, public.gtm_outreach_drafts FROM authenticated;
GRANT SELECT ON public.gtm_research_runs, public.gtm_research_steps, public.gtm_prospect_companies, public.gtm_outreach_drafts TO authenticated;
GRANT UPDATE (status, feedback, pipeline_entry_id, updated_at) ON public.gtm_prospect_companies TO authenticated;
GRANT UPDATE (subject, body, status, edited, updated_at) ON public.gtm_outreach_drafts TO authenticated;
GRANT ALL ON public.gtm_research_runs, public.gtm_research_steps, public.gtm_prospect_companies, public.gtm_outreach_drafts,
  public.gtm_domain_cache, public.gtm_suppressions, public.provider_spend_ledger TO service_role;

-- The worker claims one due step at a time; a lapsed lease makes a step due again.
CREATE OR REPLACE FUNCTION public.claim_gtm_research_step_v1(p_lease_seconds INTEGER DEFAULT 90)
RETURNS SETOF public.gtm_research_steps
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT s.id
      FROM public.gtm_research_steps s
      JOIN public.gtm_research_runs r ON r.id = s.run_id
     WHERE r.status IN ('analyzing', 'queued', 'running')
       AND ((s.status = 'queued' AND s.next_attempt_at <= now())
         OR (s.status = 'running' AND s.lease_until < now()))
     ORDER BY s.next_attempt_at, s.created_at
     FOR UPDATE OF s SKIP LOCKED
     LIMIT 1
  )
  UPDATE public.gtm_research_steps s
     SET status = 'running',
         attempt = s.attempt + 1,
         lease_until = now() + make_interval(secs => GREATEST(15, LEAST(p_lease_seconds, 300))),
         started_at = COALESCE(s.started_at, now())
    FROM due
   WHERE s.id = due.id
  RETURNING s.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_gtm_research_step_v1(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_gtm_research_step_v1(INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Jobs: wake the worker every minute; expire holds; prune old research.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.dispatch_gtm_research_worker()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
BEGIN
  PERFORM public.cleanup_expired_credit_reservations_v1();
  IF v_url IS NULL OR v_key IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.gtm_research_steps s JOIN public.gtm_research_runs r ON r.id = s.run_id
     WHERE r.status IN ('analyzing', 'queued', 'running')
       AND ((s.status = 'queued' AND s.next_attempt_at <= now()) OR (s.status = 'running' AND s.lease_until < now()))
  ) THEN RETURN; END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/gtm-research-worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := '{"source":"sweeper"}'::jsonb,
    timeout_milliseconds := 5000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_gtm_research_worker() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_gtm_research_worker() TO service_role;

CREATE OR REPLACE FUNCTION public.prune_gtm_research_v1()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.gtm_prospect_companies
   WHERE updated_at < now() - interval '12 months' AND status IN ('new', 'dismissed', 'shortlisted');
  DELETE FROM public.gtm_research_runs WHERE created_at < now() - interval '12 months';
  DELETE FROM public.gtm_domain_cache WHERE fetched_at < now() - interval '90 days';
  DELETE FROM public.provider_spend_ledger WHERE created_at < now() - interval '24 months';
$$;
REVOKE ALL ON FUNCTION public.prune_gtm_research_v1() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_gtm_research_v1() TO service_role;

SELECT cron.schedule('gtm-research-sweeper', '* * * * *', 'SELECT public.dispatch_gtm_research_worker()');
SELECT cron.schedule('gtm-research-prune-daily', '30 3 * * *', 'SELECT public.prune_gtm_research_v1()');

COMMIT;
