-- Competitive hardening V1: paid First Customer Sprint, public proof, and
-- provider-neutral external evidence. All changes are additive and preserve
-- the invite-only V1 pilot.

-- ---------------------------------------------------------------------------
-- First Customer Sprint V2 commercial state
-- ---------------------------------------------------------------------------
ALTER TABLE public.first_customer_sprint_applications
  ADD COLUMN IF NOT EXISTS product_stage text NOT NULL DEFAULT 'working_product',
  ADD COLUMN IF NOT EXISTS target_outcome text NOT NULL DEFAULT 'qualified_conversations',
  ADD COLUMN IF NOT EXISTS offer_version text NOT NULL DEFAULT 'legacy_free',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS amount_paid_cents integer,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.first_customer_sprint_applications
  ALTER COLUMN estimated_annual_customer_value_usd DROP NOT NULL;

ALTER TABLE public.first_customer_sprint_applications
  DROP CONSTRAINT IF EXISTS first_customer_sprint_applications_estimated_annual_customer_value_usd_check;

DO $$ BEGIN
  ALTER TABLE public.first_customer_sprint_applications
    ADD CONSTRAINT first_customer_sprint_application_product_stage_check
    CHECK (product_stage IN ('idea','concept_demo','working_product'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.first_customer_sprint_applications
    ADD CONSTRAINT first_customer_sprint_application_target_outcome_check
    CHECK (target_outcome IN ('qualified_conversations','commitment','payment'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.first_customer_sprint_applications
    ADD CONSTRAINT first_customer_sprint_application_offer_check
    CHECK (offer_version IN ('legacy_free','concierge_299'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.first_customer_sprint_applications
    ADD CONSTRAINT first_customer_sprint_application_payment_check
    CHECK (payment_status IN ('not_required','pending','paid','credited','refunded'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.first_customer_sprints
  ADD COLUMN IF NOT EXISTS source_demo_project_id uuid REFERENCES public.demo_studio_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_outcome text NOT NULL DEFAULT 'qualified_conversations',
  ADD COLUMN IF NOT EXISTS offer_version text NOT NULL DEFAULT 'legacy_free';

DO $$ BEGIN
  ALTER TABLE public.first_customer_sprints
    ADD CONSTRAINT first_customer_sprints_offer_version_check
    CHECK (offer_version IN ('legacy_free','concierge_299'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.first_customer_sprint_service_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.first_customer_sprint_applications(id) ON DELETE CASCADE,
  offer_id text NOT NULL CHECK (offer_id = 'first_customer_sprint_2026_299'),
  amount_cents integer NOT NULL CHECK (amount_cents = 29900),
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded','disputed')),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, offer_id)
);

CREATE TABLE IF NOT EXISTS public.first_customer_sprint_service_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_sprint_id uuid NOT NULL UNIQUE REFERENCES public.first_customer_sprints(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 29900 CHECK (amount_cents = 29900),
  status text NOT NULL DEFAULT 'earned' CHECK (status IN ('earned','redeemed','expired','void')),
  eligibility_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  redeemed_sprint_id uuid REFERENCES public.first_customer_sprints(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.first_customer_sprint_service_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_customer_sprint_service_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY first_customer_sprint_purchases_owner_read
  ON public.first_customer_sprint_service_purchases FOR SELECT TO authenticated
  USING (founder_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY first_customer_sprint_credits_owner_read
  ON public.first_customer_sprint_service_credits FOR SELECT TO authenticated
  USING (founder_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY first_customer_sprint_credits_admin_all
  ON public.first_customer_sprint_service_credits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.submit_first_customer_sprint_application_v2(
  p_founder_owns_sales boolean,
  p_customer_count integer,
  p_weekly_capacity_hours numeric,
  p_primary_blocker text,
  p_product_stage text,
  p_target_outcome text,
  p_product_summary text,
  p_estimated_annual_customer_value_usd numeric DEFAULT NULL,
  p_product_url text DEFAULT NULL,
  p_acquisition_source text DEFAULT 'other',
  p_referring_mentor_id uuid DEFAULT NULL,
  p_referral_code text DEFAULT NULL
) RETURNS public.first_customer_sprint_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_founder uuid := auth.uid();
  v_application public.first_customer_sprint_applications%ROWTYPE;
  v_reasons text[] := '{}'::text[];
  v_source text := lower(trim(COALESCE(p_acquisition_source,'other')));
  v_mentor_id uuid := NULL;
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_product_stage NOT IN ('idea','concept_demo','working_product') THEN RAISE EXCEPTION 'Select a valid product stage'; END IF;
  IF p_target_outcome NOT IN ('qualified_conversations','commitment','payment') THEN RAISE EXCEPTION 'Select a valid target outcome'; END IF;
  IF p_primary_blocker NOT IN ('prospect_list','messaging','confidence','accountability','replies','conversion','time') THEN RAISE EXCEPTION 'Select a valid blocker'; END IF;
  IF COALESCE(p_customer_count,-1) NOT BETWEEN 0 AND 999 OR COALESCE(p_weekly_capacity_hours,-1) NOT BETWEEN 0 AND 168 OR length(trim(COALESCE(p_product_summary,''))) < 10 THEN
    RAISE EXCEPTION 'Complete the required application fields';
  END IF;
  IF v_source NOT IN ('mentor_referral','homepage','current_user','direct','other') THEN v_source := 'other'; END IF;
  IF v_source='mentor_referral' THEN
    SELECT mentor.id INTO v_mentor_id FROM public.mentors mentor
    JOIN public.referral_codes code ON code.user_id=mentor.user_id
    WHERE mentor.id=p_referring_mentor_id AND code.code=trim(COALESCE(p_referral_code,''))
      AND COALESCE(mentor.is_active,false) LIMIT 1;
    IF NOT FOUND THEN v_source := 'other'; END IF;
  END IF;

  IF NOT COALESCE(p_founder_owns_sales,false) THEN v_reasons := array_append(v_reasons,'The participating founder must personally own sales.'); END IF;
  IF p_customer_count > 3 THEN v_reasons := array_append(v_reasons,'The sprint is for B2B SaaS founders with 0-3 paying customers.'); END IF;
  IF p_weekly_capacity_hours < 2 THEN v_reasons := array_append(v_reasons,'At least two weekly execution hours are required.'); END IF;

  INSERT INTO public.first_customer_sprint_applications (
    founder_id,status,business_model,founder_owns_sales,has_sellable_product,customer_count,
    estimated_annual_customer_value_usd,weekly_capacity_hours,can_name_ten_prospects,recent_outreach,
    primary_blocker,product_url,product_summary,acquisition_source,referring_mentor_id,qualified,
    qualification_reasons,product_stage,target_outcome,offer_version,payment_status,submitted_at,updated_at
  ) VALUES (
    v_founder,'submitted','b2b_saas',p_founder_owns_sales,p_product_stage='working_product',p_customer_count,
    CASE WHEN COALESCE(p_estimated_annual_customer_value_usd,0)>0 THEN p_estimated_annual_customer_value_usd ELSE NULL END,
    p_weekly_capacity_hours,false,'never',p_primary_blocker,NULLIF(trim(COALESCE(p_product_url,'')),''),
    trim(p_product_summary),v_source,v_mentor_id,cardinality(v_reasons)=0,v_reasons,p_product_stage,
    p_target_outcome,'concierge_299','pending',now(),now()
  ) ON CONFLICT (founder_id) DO UPDATE SET
    status='submitted', founder_owns_sales=EXCLUDED.founder_owns_sales,
    has_sellable_product=EXCLUDED.has_sellable_product, customer_count=EXCLUDED.customer_count,
    estimated_annual_customer_value_usd=EXCLUDED.estimated_annual_customer_value_usd,
    weekly_capacity_hours=EXCLUDED.weekly_capacity_hours, primary_blocker=EXCLUDED.primary_blocker,
    product_url=EXCLUDED.product_url, product_summary=EXCLUDED.product_summary,
    acquisition_source=EXCLUDED.acquisition_source, referring_mentor_id=EXCLUDED.referring_mentor_id,
    qualified=EXCLUDED.qualified, qualification_reasons=EXCLUDED.qualification_reasons,
    product_stage=EXCLUDED.product_stage, target_outcome=EXCLUDED.target_outcome,
    offer_version='concierge_299', payment_status='pending', amount_paid_cents=NULL, paid_at=NULL,
    reviewed_at=NULL, invited_at=NULL, admin_override_reason=NULL, submitted_at=now(), updated_at=now()
  WHERE first_customer_sprint_applications.payment_status <> 'paid'
  RETURNING * INTO v_application;
  IF NOT FOUND THEN SELECT * INTO v_application FROM public.first_customer_sprint_applications WHERE founder_id=v_founder; END IF;
  RETURN v_application;
END; $$;

CREATE OR REPLACE FUNCTION public.review_first_customer_sprint_application_v2(
  p_application_id uuid, p_decision text, p_override_reason text DEFAULT NULL
) RETURNS public.first_customer_sprint_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_application public.first_customer_sprint_applications%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  IF p_decision NOT IN ('invited','declined') THEN RAISE EXCEPTION 'Select invited or declined'; END IF;
  SELECT * INTO v_application FROM public.first_customer_sprint_applications WHERE id=p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF p_decision='invited' AND NOT v_application.qualified AND length(trim(COALESCE(p_override_reason,'')))<5 THEN RAISE EXCEPTION 'A reason is required to override qualification'; END IF;
  UPDATE public.first_customer_sprint_applications SET status=p_decision,
    admin_override_reason=CASE WHEN p_decision='invited' AND NOT qualified THEN trim(p_override_reason) ELSE NULL END,
    payment_status=CASE WHEN p_decision='invited' AND offer_version='concierge_299' THEN 'pending' ELSE payment_status END,
    reviewed_at=now(), invited_at=CASE WHEN p_decision='invited' THEN now() ELSE NULL END, updated_at=now()
  WHERE id=p_application_id RETURNING * INTO v_application;
  IF p_decision='invited' AND v_application.offer_version='legacy_free' THEN
    PERFORM public.set_founder_cycle_beta_cohort_v1(v_application.founder_id,true);
  END IF;
  RETURN v_application;
END; $$;

CREATE OR REPLACE FUNCTION public.fulfill_first_customer_sprint_offer_v1(
  p_founder_id uuid, p_application_id uuid, p_checkout_session_id text,
  p_payment_intent_id text, p_amount_cents integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF p_amount_cents <> 29900 THEN RAISE EXCEPTION 'Unexpected sprint offer amount'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.first_customer_sprint_applications WHERE id=p_application_id AND founder_id=p_founder_id AND status='invited' AND offer_version='concierge_299') THEN
    RAISE EXCEPTION 'Accepted paid sprint application not found';
  END IF;
  INSERT INTO public.first_customer_sprint_service_purchases (
    founder_id,application_id,offer_id,amount_cents,stripe_checkout_session_id,stripe_payment_intent_id
  ) VALUES (p_founder_id,p_application_id,'first_customer_sprint_2026_299',p_amount_cents,p_checkout_session_id,p_payment_intent_id)
  ON CONFLICT (stripe_checkout_session_id) DO NOTHING;
  UPDATE public.first_customer_sprint_applications SET payment_status='paid',amount_paid_cents=p_amount_cents,
    paid_at=COALESCE(paid_at,now()),updated_at=now() WHERE id=p_application_id AND founder_id=p_founder_id;
  PERFORM public.set_founder_cycle_beta_cohort_v1(p_founder_id,true);
END; $$;

CREATE OR REPLACE FUNCTION public.refund_first_customer_sprint_offer_v1(p_payment_intent_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_purchase public.first_customer_sprint_service_purchases%ROWTYPE;
BEGIN
  SELECT * INTO v_purchase FROM public.first_customer_sprint_service_purchases
    WHERE stripe_payment_intent_id=p_payment_intent_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.first_customer_sprint_service_purchases SET status='refunded',updated_at=now() WHERE id=v_purchase.id;
  UPDATE public.first_customer_sprint_applications SET payment_status='refunded',updated_at=now() WHERE id=v_purchase.application_id;
  IF NOT EXISTS(SELECT 1 FROM public.first_customer_sprints WHERE founder_id=v_purchase.founder_id)
    AND NOT EXISTS(SELECT 1 FROM public.first_customer_sprint_applications WHERE founder_id=v_purchase.founder_id AND offer_version='legacy_free' AND status='invited') THEN
    PERFORM public.set_founder_cycle_beta_cohort_v1(v_purchase.founder_id,false);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.evaluate_first_customer_sprint_service_credit_v1(p_sprint_id uuid)
RETURNS public.first_customer_sprint_service_credits
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_sprint public.first_customer_sprints%ROWTYPE; v_credit public.first_customer_sprint_service_credits%ROWTYPE;
DECLARE v_attached integer; v_sent integer; v_conversations integer; v_commitments integer; v_payments integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_sprint FROM public.first_customer_sprints WHERE id=p_sprint_id FOR UPDATE;
  IF NOT FOUND OR v_sprint.status<>'completed' OR v_sprint.review_submitted_at IS NULL OR v_sprint.mentor_checkpoint_completed_at IS NULL
    OR v_sprint.review_submitted_at>v_sprint.ends_at OR v_sprint.mentor_checkpoint_completed_at>v_sprint.ends_at
  THEN RAISE EXCEPTION 'Sprint has not completed the service-credit requirements by day 30'; END IF;
  IF v_sprint.offer_version<>'concierge_299' THEN RAISE EXCEPTION 'Only the paid concierge sprint can earn this service credit'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.first_customer_sprint_service_purchases p WHERE p.founder_id=v_sprint.founder_id AND p.status='paid') THEN RAISE EXCEPTION 'Sprint was not purchased through the paid offer'; END IF;
  SELECT count(DISTINCT scoped.contact_id),
    count(*) FILTER (WHERE event.event_type='outreach_sent'),
    count(*) FILTER (WHERE event.event_type='interview_completed'),
    count(*) FILTER (WHERE event.event_type='commitment_received'),
    count(*) FILTER (WHERE event.event_type='payment_received')
  INTO v_attached,v_sent,v_conversations,v_commitments,v_payments
  FROM public.first_customer_sprint_contacts scoped
  LEFT JOIN public.customer_evidence_events event ON event.user_id=v_sprint.founder_id
    AND event.contact_id=scoped.contact_id AND event.metadata->>'sprintId'=v_sprint.id::text
  WHERE scoped.sprint_id=v_sprint.id;
  IF COALESCE(v_attached,0)<20 OR COALESCE(v_sent,0)<10 OR COALESCE(v_conversations,0)>=3 OR COALESCE(v_commitments,0)>0 OR COALESCE(v_payments,0)>0 THEN RAISE EXCEPTION 'Sprint does not qualify for a rerun credit'; END IF;
  INSERT INTO public.first_customer_sprint_service_credits(founder_id,source_sprint_id,eligibility_snapshot,verified_by)
  VALUES(v_sprint.founder_id,v_sprint.id,jsonb_build_object('prospects',v_attached,'outreach',v_sent,'conversations',v_conversations,'commitments',v_commitments,'payments',v_payments),auth.uid())
  ON CONFLICT (source_sprint_id) DO UPDATE SET eligibility_snapshot=EXCLUDED.eligibility_snapshot
  RETURNING * INTO v_credit;
  RETURN v_credit;
END; $$;

-- ---------------------------------------------------------------------------
-- Trustworthy public proof
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proof_case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), founder_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE, public_name text NOT NULL, company_name text, segment text NOT NULL,
  founder_stage text NOT NULL, starting_assumption text NOT NULL, actions_completed text[] NOT NULL DEFAULT '{}',
  evidence_summary jsonb NOT NULL DEFAULT '[]'::jsonb, verification_mode text NOT NULL,
  decision_changed text NOT NULL, outcome_type text NOT NULL, outcome_value numeric,
  outcome_summary text NOT NULL, consented_at timestamptz NOT NULL, consent_withdrawn_at timestamptz,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, verified_at timestamptz,
  status text NOT NULL DEFAULT 'draft', published_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (verification_mode IN ('founder_reported','corroborated','platform_verified')),
  CHECK (outcome_type IN ('qualified_conversation','commitment','payment','decision')),
  CHECK (status IN ('draft','verified','published','withdrawn')),
  CHECK (status<>'published' OR (verified_at IS NOT NULL AND published_at IS NOT NULL AND consent_withdrawn_at IS NULL))
);
CREATE TABLE IF NOT EXISTS public.proof_metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), metric_key text NOT NULL, label text NOT NULL,
  numerator integer NOT NULL, denominator integer NOT NULL CHECK (denominator>=10), value numeric NOT NULL,
  cohort_label text NOT NULL, period_start date NOT NULL, period_end date NOT NULL, source_systems text[] NOT NULL,
  methodology text NOT NULL, verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz NOT NULL DEFAULT now(), published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(metric_key,period_start,period_end,cohort_label)
);
ALTER TABLE public.proof_case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_metric_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY proof_cases_public_read ON public.proof_case_studies FOR SELECT USING (status='published' AND consent_withdrawn_at IS NULL);
CREATE POLICY proof_cases_admin_all ON public.proof_case_studies FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY proof_metrics_public_read ON public.proof_metric_snapshots FOR SELECT USING (published=true AND denominator>=10);
CREATE POLICY proof_metrics_admin_all ON public.proof_metric_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Public callers receive only the approved projection; base-table rows remain
-- admin-only so founder ids, verifier ids, and workflow metadata cannot leak.
DROP POLICY IF EXISTS proof_cases_public_read ON public.proof_case_studies;
DROP POLICY IF EXISTS proof_metrics_public_read ON public.proof_metric_snapshots;
CREATE OR REPLACE VIEW public.published_proof_cases_v1 WITH (security_barrier=true) AS
  SELECT id,slug,public_name,company_name,segment,founder_stage,starting_assumption,
    actions_completed,evidence_summary,verification_mode,decision_changed,outcome_summary,published_at
  FROM public.proof_case_studies WHERE status='published' AND consent_withdrawn_at IS NULL;
CREATE OR REPLACE VIEW public.published_proof_metrics_v1 WITH (security_barrier=true) AS
  SELECT id,label,value,cohort_label,period_start,period_end,denominator,source_systems,created_at
  FROM public.proof_metric_snapshots WHERE published=true AND denominator>=10;
REVOKE ALL ON public.published_proof_cases_v1,public.published_proof_metrics_v1 FROM PUBLIC;
GRANT SELECT ON public.published_proof_cases_v1,public.published_proof_metrics_v1 TO anon,authenticated;

-- ---------------------------------------------------------------------------
-- Provider-neutral external evidence
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.external_evidence_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_label text NOT NULL, method text NOT NULL CHECK (method IN ('webhook','csv')),
  token_hash text, token_last_four text, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','error')),
  last_success_at timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((method='webhook' AND token_hash IS NOT NULL) OR method='csv')
);
CREATE TABLE IF NOT EXISTS public.external_evidence_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), connection_id uuid NOT NULL REFERENCES public.external_evidence_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, method text NOT NULL CHECK (method IN ('webhook','csv')),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','partial','failed')),
  accepted_count integer NOT NULL DEFAULT 0, duplicate_count integer NOT NULL DEFAULT 0, rejected_count integer NOT NULL DEFAULT 0,
  source_file_path text, source_file_delete_after timestamptz, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.external_evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), connection_id uuid NOT NULL REFERENCES public.external_evidence_connections(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.external_evidence_import_batches(id) ON DELETE SET NULL, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id text NOT NULL, event_type text NOT NULL, occurred_at timestamptz NOT NULL, value numeric, currency text,
  subject_hash text, properties jsonb NOT NULL DEFAULT '{}'::jsonb, verification_mode text NOT NULL DEFAULT 'imported',
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(connection_id,external_id),
  CHECK (event_type IN ('page_view','demo_completed','cta_clicked','lead_created','signup','activated','qualified_conversation','commitment_received','payment_received','subscription_cancelled')),
  CHECK (verification_mode='imported'), CHECK (octet_length(properties::text)<=16000)
);
CREATE TABLE IF NOT EXISTS public.external_evidence_import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES public.external_evidence_import_batches(id) ON DELETE CASCADE,
  row_number integer, external_id text, error_code text NOT NULL, error_message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

-- Raw normalized rows remain imported. When an authenticated webhook supplies
-- a customer-journey outcome, the derived journey event can be corroborated.
ALTER TABLE public.customer_evidence_events
  DROP CONSTRAINT IF EXISTS customer_evidence_events_verification_mode_check;
ALTER TABLE public.customer_evidence_events
  ADD CONSTRAINT customer_evidence_events_verification_mode_check
  CHECK (verification_mode IN (
    'founder_reported','customer_action','transaction','imported','corroborated','platform_verified'
  ));
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('evidence-imports','evidence-imports',false,2097152,ARRAY['text/csv','application/vnd.ms-excel','text/plain'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=2097152,
  allowed_mime_types=ARRAY['text/csv','application/vnd.ms-excel','text/plain'];
DROP POLICY IF EXISTS evidence_imports_owner_insert ON storage.objects;
CREATE POLICY evidence_imports_owner_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='evidence-imports' AND (storage.foldername(name))[1]=auth.uid()::text);
DROP POLICY IF EXISTS evidence_imports_owner_read ON storage.objects;
CREATE POLICY evidence_imports_owner_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='evidence-imports' AND (storage.foldername(name))[1]=auth.uid()::text);
DROP POLICY IF EXISTS evidence_imports_owner_delete ON storage.objects;
CREATE POLICY evidence_imports_owner_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='evidence-imports' AND (storage.foldername(name))[1]=auth.uid()::text);
CREATE INDEX IF NOT EXISTS external_evidence_events_user_occurred_idx ON public.external_evidence_events(user_id,occurred_at DESC);
ALTER TABLE public.external_evidence_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_evidence_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_evidence_import_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY external_connections_owner_read ON public.external_evidence_connections FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY external_batches_owner_read ON public.external_evidence_import_batches FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY external_events_owner_read ON public.external_evidence_events FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY external_errors_owner_read ON public.external_evidence_import_errors FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.external_evidence_import_batches batch WHERE batch.id=batch_id AND batch.user_id=auth.uid()));

-- Connections are created through a server RPC so the bearer token is shown
-- once and only its SHA-256 digest is retained.
CREATE OR REPLACE FUNCTION public.create_external_evidence_connection_v1(
  p_provider_label text, p_method text, p_token_hash text DEFAULT NULL, p_token_last_four text DEFAULT NULL
) RETURNS public.external_evidence_connections
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row public.external_evidence_connections%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_method NOT IN ('webhook','csv') OR length(trim(COALESCE(p_provider_label,'')))<2 THEN RAISE EXCEPTION 'Invalid connection'; END IF;
  IF p_method='webhook' AND length(COALESCE(p_token_hash,''))<32 THEN RAISE EXCEPTION 'Invalid token digest'; END IF;
  INSERT INTO public.external_evidence_connections(user_id,provider_label,method,token_hash,token_last_four)
  VALUES(auth.uid(),left(trim(p_provider_label),120),p_method,p_token_hash,p_token_last_four) RETURNING * INTO v_row;
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.revoke_external_evidence_connection_v1(p_connection_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE public.external_evidence_connections SET status='revoked',token_hash=NULL,updated_at=now()
  WHERE id=p_connection_id AND user_id=auth.uid();
$$;

-- Pre-product sprint start. The legacy V1 RPC remains available unchanged.
CREATE OR REPLACE FUNCTION public.start_first_customer_sprint_v2(
  p_offer text, p_target_segment text, p_problem_hypothesis text,
  p_proof_url text DEFAULT NULL, p_proof_description text DEFAULT NULL,
  p_estimated_customer_value_usd numeric DEFAULT NULL,
  p_weekly_capacity_hours numeric DEFAULT NULL, p_mentor_decision_question text DEFAULT NULL
) RETURNS public.first_customer_sprints
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_founder uuid := auth.uid(); v_state public.founder_cycle_state%ROWTYPE;
  v_sprint public.first_customer_sprints%ROWTYPE; v_previous public.first_customer_sprints%ROWTYPE;
  v_continuation_from uuid; v_service_credit_id uuid; v_variants jsonb;
  v_target_outcome text := 'qualified_conversations';
  v_offer_version text := 'legacy_free';
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_state FROM public.founder_cycle_state WHERE user_id=v_founder;
  IF NOT FOUND OR NOT COALESCE(v_state.beta_cohort,false) THEN RAISE EXCEPTION 'First Customer Sprint enrollment is required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_sprint FROM public.first_customer_sprints WHERE founder_id=v_founder AND status IN ('draft','active','paused') ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN v_sprint; END IF;
  SELECT * INTO v_previous FROM public.first_customer_sprints WHERE founder_id=v_founder AND status='completed' ORDER BY completed_at DESC NULLS LAST,created_at DESC LIMIT 1;
  IF FOUND THEN
    IF v_previous.continuation_from_sprint_id IS NOT NULL THEN RAISE EXCEPTION 'This offer includes one rerun only'; END IF;
    IF v_previous.review_submitted_at IS NULL THEN RAISE EXCEPTION 'Complete the final review before starting a rerun'; END IF;
    SELECT id INTO v_service_credit_id FROM public.first_customer_sprint_service_credits
      WHERE founder_id=v_founder AND source_sprint_id=v_previous.id AND status='earned' AND expires_at>now() FOR UPDATE;
    IF v_service_credit_id IS NULL AND NOT EXISTS (
      SELECT 1 FROM public.credit_transactions tx WHERE tx.user_id=v_founder AND tx.tx_type='purchase'
        AND tx.metadata->>'purchaseSource'='first_customer_sprint' AND tx.metadata->>'purchaseContextId'=v_previous.id::text
    ) THEN RAISE EXCEPTION 'An eligible service credit or legacy continuation purchase is required'; END IF;
    v_continuation_from := v_previous.id;
  END IF;
  IF length(trim(COALESCE(p_offer,'')))<3 OR length(trim(COALESCE(p_target_segment,'')))<3
    OR length(trim(COALESCE(p_problem_hypothesis,'')))<3 OR COALESCE(p_weekly_capacity_hours,0)<2 THEN
    RAISE EXCEPTION 'Complete the offer, target buyer, problem hypothesis, and weekly capacity';
  END IF;
  SELECT target_outcome,offer_version INTO v_target_outcome,v_offer_version
  FROM public.first_customer_sprint_applications
  WHERE founder_id=v_founder AND payment_status IN ('paid','not_required')
  ORDER BY paid_at DESC NULLS LAST,submitted_at DESC NULLS LAST LIMIT 1;
  v_target_outcome := COALESCE(v_target_outcome,'qualified_conversations');
  v_offer_version := COALESCE(v_offer_version,'legacy_free');
  v_variants := jsonb_build_array(
    jsonb_build_object('key','discovery','label','Discovery-led','body','Hi {{first_name}}, I am researching how '||trim(p_target_segment)||' handle '||trim(p_problem_hypothesis)||'. Would you be open to a 20-minute conversation? I am looking to learn, not pitch.'),
    jsonb_build_object('key','problem','label','Problem-led','body','Hi {{first_name}}, I help '||trim(p_target_segment)||' address '||trim(p_problem_hypothesis)||'. Is this a priority for you right now? I would value 20 minutes to compare notes.'),
    jsonb_build_object('key','offer','label','Offer-led','body','Hi {{first_name}}, I am testing '||trim(p_offer)||' for '||trim(p_target_segment)||'. Would a short conversation be useful to see whether it fits how you work today?')
  );
  INSERT INTO public.first_customer_sprints(founder_id,status,starts_at,ends_at,business_model_snapshot,customer_count_snapshot,primary_goal_snapshot,offer,target_segment,problem_hypothesis,proof_url,proof_description,estimated_customer_value_usd,weekly_capacity_hours,mentor_decision_question,message_variants,message_generation_count,continuation_from_sprint_id,target_outcome,offer_version)
  VALUES(v_founder,'active',now(),now()+interval '30 days',v_state.business_model,v_state.customer_count,v_state.primary_goal,trim(p_offer),trim(p_target_segment),trim(p_problem_hypothesis),NULLIF(trim(COALESCE(p_proof_url,'')),''),NULLIF(trim(COALESCE(p_proof_description,'')),''),CASE WHEN COALESCE(p_estimated_customer_value_usd,0)>0 THEN p_estimated_customer_value_usd ELSE NULL END,p_weekly_capacity_hours,NULLIF(trim(COALESCE(p_mentor_decision_question,'')),''),v_variants,0,v_continuation_from,v_target_outcome,v_offer_version)
  RETURNING * INTO v_sprint;
  IF v_service_credit_id IS NOT NULL THEN UPDATE public.first_customer_sprint_service_credits SET status='redeemed',redeemed_sprint_id=v_sprint.id,redeemed_at=now(),updated_at=now() WHERE id=v_service_credit_id AND status='earned'; END IF;
  RETURN v_sprint;
END; $$;

CREATE OR REPLACE FUNCTION public.attach_first_customer_sprint_demo_v1(p_sprint_id uuid,p_demo_project_id uuid)
RETURNS public.first_customer_sprints LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_sprint public.first_customer_sprints%ROWTYPE;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.demo_studio_projects WHERE id=p_demo_project_id AND owner_id=auth.uid() AND launch_published=true) THEN RAISE EXCEPTION 'Choose a published demo you own'; END IF;
  UPDATE public.first_customer_sprints SET source_demo_project_id=p_demo_project_id,updated_at=now() WHERE id=p_sprint_id AND founder_id=auth.uid() AND status IN ('draft','active','paused') RETURNING * INTO v_sprint;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active sprint not found'; END IF;
  RETURN v_sprint;
END; $$;

CREATE OR REPLACE FUNCTION public.get_first_customer_sprint_demo_evidence_v1(p_sprint_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN sprint.id IS NULL OR sprint.source_demo_project_id IS NULL THEN NULL ELSE jsonb_build_object(
    'projectId',sprint.source_demo_project_id,
    'completions',(SELECT count(*) FROM public.demo_studio_events e WHERE e.project_id=sprint.source_demo_project_id AND e.verified=true AND e.type='demo_complete'),
    'ctaClicks',(SELECT count(*) FROM public.demo_studio_events e WHERE e.project_id=sprint.source_demo_project_id AND e.verified=true AND e.type='cta_click'),
    'leads',(SELECT count(*) FROM public.demo_studio_responses r WHERE r.project_id=sprint.source_demo_project_id AND r.response IN ('interested','book_call','commitment')),
    'signups',(SELECT count(*) FROM public.demo_studio_signups s WHERE s.project_id=sprint.source_demo_project_id AND s.verified=true),
    'verificationMode','platform_verified'
  ) END FROM public.first_customer_sprints sprint WHERE sprint.id=p_sprint_id AND sprint.founder_id=auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_first_customer_sprint_continuation_v1(p_sprint_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN sprint.id IS NULL THEN jsonb_build_object('paid',false) ELSE COALESCE(
    (SELECT jsonb_build_object('paid',true,'purchasedAt',credit.verified_at,'packId','service_credit','expiresAt',credit.expires_at) FROM public.first_customer_sprint_service_credits credit WHERE credit.founder_id=auth.uid() AND credit.source_sprint_id=sprint.id AND credit.status='earned' AND credit.expires_at>now()),
    (SELECT jsonb_build_object('paid',true,'purchasedAt',tx.created_at,'packId',tx.metadata->>'packId') FROM public.credit_transactions tx WHERE tx.user_id=auth.uid() AND tx.tx_type='purchase' AND tx.metadata->>'purchaseSource'='first_customer_sprint' AND tx.metadata->>'purchaseContextId'=sprint.id::text ORDER BY tx.created_at DESC LIMIT 1),
    jsonb_build_object('paid',false)) END
  FROM (SELECT id FROM public.first_customer_sprints WHERE id=p_sprint_id AND founder_id=auth.uid()) sprint;
$$;

REVOKE ALL ON FUNCTION public.fulfill_first_customer_sprint_offer_v1(uuid,uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_first_customer_sprint_offer_v1(uuid,uuid,text,text,integer) TO service_role;
REVOKE ALL ON FUNCTION public.refund_first_customer_sprint_offer_v1(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_first_customer_sprint_offer_v1(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_first_customer_sprint_application_v2(boolean,integer,numeric,text,text,text,text,numeric,text,text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_first_customer_sprint_application_v2(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_first_customer_sprint_service_credit_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_external_evidence_connection_v1(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_external_evidence_connection_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_first_customer_sprint_v2(text,text,text,text,text,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_first_customer_sprint_demo_v1(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_first_customer_sprint_demo_evidence_v1(uuid) TO authenticated;

COMMENT ON TABLE public.proof_case_studies IS 'Consent-gated, evidence-traceable public founder outcomes. Never store raw customer PII here.';
COMMENT ON TABLE public.external_evidence_events IS 'Normalized imported evidence. Imported data never becomes platform_verified.';
