-- Founder Execution Cycle V1
-- Additive compatibility layer for PROVE -> SELL -> GROW with optional RAISE.
-- The legacy bizmap_stage enum and user_progress table intentionally remain unchanged.

CREATE TABLE IF NOT EXISTS public.founder_cycle_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_model text CHECK (business_model IN (
    'b2b_saas', 'service', 'b2c_product', 'marketplace', 'ecommerce', 'media', 'other'
  )),
  customer_count integer NOT NULL DEFAULT 0 CHECK (customer_count BETWEEN 0 AND 1000000),
  recommended_loop text CHECK (recommended_loop IN ('PROVE', 'SELL', 'GROW')),
  selected_loop text CHECK (selected_loop IN ('PROVE', 'SELL', 'GROW')),
  primary_goal text,
  raise_active boolean NOT NULL DEFAULT false,
  beta_cohort boolean NOT NULL DEFAULT false,
  weekly_capacity_hours numeric(5,1) CHECK (
    weekly_capacity_hours IS NULL OR weekly_capacity_hours BETWEEN 0.5 AND 168
  ),
  assignment_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.founder_customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 160),
  company text CHECK (company IS NULL OR length(company) <= 200),
  role text CHECK (role IS NULL OR length(role) <= 160),
  profile_url text CHECK (profile_url IS NULL OR length(profile_url) <= 2000),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN (
    'manual', 'csv', 'reddit', 'platform', 'hackernews', 'x', 'linkedin', 'web', 'gtm', 'imported'
  )),
  stage text NOT NULL DEFAULT 'new' CHECK (stage IN (
    'new', 'qualified', 'contacted', 'replied', 'interview', 'offer',
    'commitment', 'customer', 'lost'
  )),
  notes text NOT NULL DEFAULT '' CHECK (length(notes) <= 4000),
  creation_key text CHECK (
    creation_key IS NULL OR length(creation_key) BETWEEN 8 AND 200
  ),
  pmf_discovery_lead_id uuid REFERENCES public.pmf_discovery_leads(id) ON DELETE SET NULL,
  gtm_pipeline_entry_id uuid REFERENCES public.gtm_pipeline_entries(id) ON DELETE SET NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS founder_customer_contacts_pmf_lead_uidx
  ON public.founder_customer_contacts(user_id, pmf_discovery_lead_id)
  WHERE pmf_discovery_lead_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS founder_customer_contacts_gtm_entry_uidx
  ON public.founder_customer_contacts(user_id, gtm_pipeline_entry_id)
  WHERE gtm_pipeline_entry_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS founder_customer_contacts_creation_uidx
  ON public.founder_customer_contacts(user_id, creation_key)
  WHERE creation_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS founder_customer_contacts_stage_idx
  ON public.founder_customer_contacts(user_id, stage, last_activity_at DESC);

CREATE TABLE IF NOT EXISTS public.customer_evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.founder_customer_contacts(id) ON DELETE SET NULL,
  active_loop text NOT NULL CHECK (active_loop IN ('PROVE', 'SELL', 'GROW')),
  event_type text NOT NULL CHECK (event_type IN (
    'prospect_added', 'prospect_qualified', 'outreach_prepared', 'outreach_sent',
    'reply_received', 'interview_scheduled', 'interview_completed',
    'commitment_received', 'offer_sent', 'payment_received', 'customer_lost',
    'retention_observed', 'channel_reviewed'
  )),
  source_entity_type text CHECK (
    source_entity_type IS NULL OR length(source_entity_type) <= 80
  ),
  source_entity_id text CHECK (
    source_entity_id IS NULL OR length(source_entity_id) <= 200
  ),
  verification_mode text NOT NULL DEFAULT 'founder_reported' CHECK (verification_mode IN (
    'founder_reported', 'customer_action', 'transaction', 'imported', 'platform_verified'
  )),
  amount numeric(14,2) CHECK (amount IS NULL OR amount >= 0),
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.founder_cycle_concierge_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_week integer NOT NULL CHECK (cohort_week BETWEEN 0 AND 4),
  prospects_reviewed integer NOT NULL DEFAULT 0 CHECK (prospects_reviewed >= 0),
  messages_approved integer NOT NULL DEFAULT 0 CHECK (messages_approved >= 0),
  qualified_conversations integer NOT NULL DEFAULT 0 CHECK (qualified_conversations >= 0),
  replies integer NOT NULL DEFAULT 0 CHECK (replies >= 0),
  commitments integer NOT NULL DEFAULT 0 CHECK (commitments >= 0),
  customers integer NOT NULL DEFAULT 0 CHECK (customers >= 0),
  founder_value_score integer CHECK (founder_value_score BETWEEN 1 AND 10),
  willing_to_continue_paying boolean,
  service_minutes integer NOT NULL DEFAULT 0 CHECK (service_minutes >= 0),
  private_operator_notes text CHECK (
    private_operator_notes IS NULL OR length(private_operator_notes) <= 8000
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, cohort_week)
);

CREATE TABLE IF NOT EXISTS public.founder_cycle_action_feedback (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key text NOT NULL CHECK (length(action_key) BETWEEN 1 AND 120),
  feedback_status text NOT NULL CHECK (feedback_status IN ('remind_later', 'not_relevant')),
  cooldown_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, action_key)
);

CREATE INDEX IF NOT EXISTS customer_evidence_events_loop_time_idx
  ON public.customer_evidence_events(user_id, active_loop, occurred_at DESC);
CREATE INDEX IF NOT EXISTS customer_evidence_events_type_time_idx
  ON public.customer_evidence_events(user_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS customer_evidence_events_contact_idx
  ON public.customer_evidence_events(contact_id, occurred_at DESC)
  WHERE contact_id IS NOT NULL;

ALTER TABLE public.founder_cycle_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_cycle_concierge_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_cycle_action_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own founder cycle state" ON public.founder_cycle_state;
DROP POLICY IF EXISTS "Users read own founder cycle state" ON public.founder_cycle_state;
CREATE POLICY "Users read own founder cycle state"
  ON public.founder_cycle_state FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage founder cycle state" ON public.founder_cycle_state;
CREATE POLICY "Admins manage founder cycle state"
  ON public.founder_cycle_state FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users manage own founder customer contacts" ON public.founder_customer_contacts;
CREATE POLICY "Users manage own founder customer contacts"
  ON public.founder_customer_contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own customer evidence events" ON public.customer_evidence_events;
CREATE POLICY "Users manage own customer evidence events"
  ON public.customer_evidence_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      contact_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.founder_customer_contacts contact
        WHERE contact.id = customer_evidence_events.contact_id
          AND contact.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users read own concierge checkins" ON public.founder_cycle_concierge_checkins;
CREATE POLICY "Users read own concierge checkins"
  ON public.founder_cycle_concierge_checkins FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage concierge checkins" ON public.founder_cycle_concierge_checkins;
CREATE POLICY "Admins manage concierge checkins"
  ON public.founder_cycle_concierge_checkins FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.founder_cycle_state state
      WHERE state.user_id = founder_cycle_concierge_checkins.user_id
        AND state.beta_cohort
    )
  );

DROP POLICY IF EXISTS "Users read own founder cycle action feedback" ON public.founder_cycle_action_feedback;
CREATE POLICY "Users read own founder cycle action feedback"
  ON public.founder_cycle_action_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_founder_cycle_state_updated_at ON public.founder_cycle_state;
CREATE TRIGGER set_founder_cycle_state_updated_at
  BEFORE UPDATE ON public.founder_cycle_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_founder_customer_contacts_updated_at ON public.founder_customer_contacts;
CREATE TRIGGER set_founder_customer_contacts_updated_at
  BEFORE UPDATE ON public.founder_customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_founder_cycle_concierge_checkins_updated_at ON public.founder_cycle_concierge_checkins;
CREATE TRIGGER set_founder_cycle_concierge_checkins_updated_at
  BEFORE UPDATE ON public.founder_cycle_concierge_checkins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_founder_cycle_action_feedback_updated_at ON public.founder_cycle_action_feedback;
CREATE TRIGGER set_founder_cycle_action_feedback_updated_at
  BEFORE UPDATE ON public.founder_cycle_action_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.upsert_founder_cycle_state_v1(
  p_business_model text,
  p_customer_count integer,
  p_primary_goal text,
  p_selected_loop text DEFAULT NULL,
  p_raise_active boolean DEFAULT false,
  p_weekly_capacity_hours numeric DEFAULT NULL
) RETURNS public.founder_cycle_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_recommended_loop text;
  v_reason text;
  v_result public.founder_cycle_state;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_business_model NOT IN (
    'b2b_saas', 'service', 'b2c_product', 'marketplace', 'ecommerce', 'media', 'other'
  ) THEN RAISE EXCEPTION 'Unsupported business model'; END IF;
  IF p_customer_count < 0 OR p_customer_count > 1000000 THEN
    RAISE EXCEPTION 'Customer count is outside the supported range';
  END IF;
  IF p_selected_loop IS NOT NULL AND p_selected_loop NOT IN ('PROVE', 'SELL', 'GROW') THEN
    RAISE EXCEPTION 'Unsupported founder loop';
  END IF;

  IF p_customer_count >= 3 THEN
    v_recommended_loop := 'GROW';
    v_reason := 'Three or more paying customers were reported during onboarding.';
  ELSIF p_customer_count > 0 THEN
    v_recommended_loop := 'SELL';
    v_reason := 'At least one paying customer was reported, with fewer than three customers total.';
  ELSE
    v_recommended_loop := 'PROVE';
    v_reason := 'No paying customer or costly commitment has been recorded yet.';
  END IF;

  INSERT INTO public.founder_cycle_state (
    user_id, business_model, customer_count, recommended_loop, selected_loop,
    primary_goal, raise_active, weekly_capacity_hours, assignment_reason
  ) VALUES (
    v_user_id, p_business_model, p_customer_count, v_recommended_loop,
    p_selected_loop, NULLIF(trim(p_primary_goal), ''), COALESCE(p_raise_active, false),
    p_weekly_capacity_hours, v_reason
  )
  ON CONFLICT (user_id) DO UPDATE SET
    business_model = EXCLUDED.business_model,
    customer_count = EXCLUDED.customer_count,
    recommended_loop = EXCLUDED.recommended_loop,
    selected_loop = EXCLUDED.selected_loop,
    primary_goal = EXCLUDED.primary_goal,
    raise_active = EXCLUDED.raise_active,
    weekly_capacity_hours = EXCLUDED.weekly_capacity_hours,
    assignment_reason = EXCLUDED.assignment_reason
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_customer_evidence_event_v1(
  p_event_type text,
  p_active_loop text,
  p_contact_id uuid DEFAULT NULL,
  p_source_entity_type text DEFAULT NULL,
  p_source_entity_id text DEFAULT NULL,
  p_verification_mode text DEFAULT 'founder_reported',
  p_amount numeric DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
) RETURNS public.customer_evidence_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result public.customer_evidence_events;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_event_type NOT IN (
    'prospect_added', 'prospect_qualified', 'outreach_prepared', 'outreach_sent',
    'reply_received', 'interview_scheduled', 'interview_completed',
    'commitment_received', 'offer_sent', 'payment_received', 'customer_lost',
    'retention_observed', 'channel_reviewed'
  ) THEN RAISE EXCEPTION 'Unsupported evidence event type'; END IF;
  IF p_active_loop NOT IN ('PROVE', 'SELL', 'GROW') THEN
    RAISE EXCEPTION 'Unsupported founder loop';
  END IF;
  IF p_verification_mode NOT IN (
    'founder_reported', 'customer_action', 'transaction', 'imported', 'platform_verified'
  ) THEN RAISE EXCEPTION 'Unsupported verification mode'; END IF;
  IF p_contact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.founder_customer_contacts
    WHERE id = p_contact_id AND user_id = v_user_id
  ) THEN RAISE EXCEPTION 'Contact does not belong to the authenticated user'; END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 8 THEN
    RAISE EXCEPTION 'A stable idempotency key is required';
  END IF;

  INSERT INTO public.customer_evidence_events (
    user_id, contact_id, active_loop, event_type, source_entity_type,
    source_entity_id, verification_mode, amount, currency, metadata,
    idempotency_key
  ) VALUES (
    v_user_id, p_contact_id, p_active_loop, p_event_type,
    NULLIF(trim(p_source_entity_type), ''), NULLIF(trim(p_source_entity_id), ''),
    p_verification_mode, p_amount, upper(NULLIF(trim(p_currency), '')),
    COALESCE(p_metadata, '{}'::jsonb), p_idempotency_key
  )
  ON CONFLICT (user_id, idempotency_key) DO UPDATE
    SET idempotency_key = EXCLUDED.idempotency_key
  RETURNING * INTO v_result;

  IF p_contact_id IS NOT NULL THEN
    UPDATE public.founder_customer_contacts
    SET last_activity_at = GREATEST(last_activity_at, v_result.occurred_at)
    WHERE id = p_contact_id AND user_id = v_user_id;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_founder_cycle_action_feedback_v1(
  p_action_key text,
  p_feedback_status text
) RETURNS public.founder_cycle_action_feedback
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result public.founder_cycle_action_feedback;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(trim(COALESCE(p_action_key, ''))) = 0 OR length(p_action_key) > 120 THEN
    RAISE EXCEPTION 'Action key is outside the supported range';
  END IF;
  IF p_feedback_status NOT IN ('remind_later', 'not_relevant') THEN
    RAISE EXCEPTION 'Unsupported action feedback';
  END IF;

  INSERT INTO public.founder_cycle_action_feedback (
    user_id, action_key, feedback_status, cooldown_until
  ) VALUES (
    v_user_id,
    trim(p_action_key),
    p_feedback_status,
    now() + CASE
      WHEN p_feedback_status = 'remind_later' THEN interval '24 hours'
      ELSE interval '14 days'
    END
  )
  ON CONFLICT (user_id, action_key) DO UPDATE SET
    feedback_status = EXCLUDED.feedback_status,
    cooldown_until = EXCLUDED.cooldown_until
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_founder_customer_contact_v1(
  p_display_name text,
  p_company text DEFAULT NULL,
  p_role text DEFAULT NULL,
  p_profile_url text DEFAULT NULL,
  p_source text DEFAULT 'manual',
  p_notes text DEFAULT '',
  p_contact_id uuid DEFAULT NULL,
  p_creation_key text DEFAULT NULL
) RETURNS public.founder_customer_contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result public.founder_customer_contacts;
  v_loop text := 'PROVE';
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(trim(COALESCE(p_display_name, ''))) = 0 THEN
    RAISE EXCEPTION 'Display name is required';
  END IF;
  IF p_source NOT IN (
    'manual', 'csv', 'reddit', 'platform', 'hackernews', 'x', 'linkedin', 'web', 'gtm', 'imported'
  ) THEN RAISE EXCEPTION 'Unsupported contact source'; END IF;

  IF p_contact_id IS NULL THEN
    IF p_creation_key IS NULL OR length(trim(p_creation_key)) < 8 OR length(p_creation_key) > 200 THEN
      RAISE EXCEPTION 'A stable contact creation key is required';
    END IF;
    INSERT INTO public.founder_customer_contacts (
      user_id, display_name, company, role, profile_url, source, notes, creation_key
    ) VALUES (
      v_user_id, trim(p_display_name), NULLIF(trim(p_company), ''),
      NULLIF(trim(p_role), ''), NULLIF(trim(p_profile_url), ''),
      p_source, left(COALESCE(p_notes, ''), 4000), trim(p_creation_key)
    )
    ON CONFLICT (user_id, creation_key) WHERE creation_key IS NOT NULL
    DO UPDATE SET creation_key = EXCLUDED.creation_key
    RETURNING * INTO v_result;

    SELECT COALESCE(selected_loop, recommended_loop, 'PROVE')
    INTO v_loop
    FROM public.founder_cycle_state
    WHERE user_id = v_user_id;

    PERFORM public.record_customer_evidence_event_v1(
      'prospect_added', COALESCE(v_loop, 'PROVE'), v_result.id,
      'founder_customer_contact', v_result.id::text,
      CASE WHEN p_source = 'csv' THEN 'imported' ELSE 'founder_reported' END,
      NULL, NULL, jsonb_build_object('source', p_source),
      'contact-created:' || v_result.id::text
    );
  ELSE
    UPDATE public.founder_customer_contacts
    SET display_name = trim(p_display_name),
        company = NULLIF(trim(p_company), ''),
        role = NULLIF(trim(p_role), ''),
        profile_url = NULLIF(trim(p_profile_url), ''),
        notes = left(COALESCE(p_notes, ''), 4000)
    WHERE id = p_contact_id AND user_id = v_user_id
    RETURNING * INTO v_result;
    IF v_result.id IS NULL THEN RAISE EXCEPTION 'Contact not found'; END IF;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_founder_customer_contact_v1(
  p_contact_id uuid,
  p_stage text,
  p_event_type text,
  p_active_loop text,
  p_verification_mode text DEFAULT 'founder_reported',
  p_amount numeric DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
) RETURNS public.founder_customer_contacts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result public.founder_customer_contacts;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_stage NOT IN (
    'new', 'qualified', 'contacted', 'replied', 'interview', 'offer',
    'commitment', 'customer', 'lost'
  ) THEN RAISE EXCEPTION 'Unsupported contact stage'; END IF;

  UPDATE public.founder_customer_contacts
  SET stage = p_stage, last_activity_at = now()
  WHERE id = p_contact_id AND user_id = v_user_id
  RETURNING * INTO v_result;
  IF v_result.id IS NULL THEN RAISE EXCEPTION 'Contact not found'; END IF;

  PERFORM public.record_customer_evidence_event_v1(
    p_event_type, p_active_loop, p_contact_id, 'founder_customer_contact',
    p_contact_id::text, p_verification_mode, p_amount, p_currency,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('contact_stage', p_stage),
    COALESCE(p_idempotency_key, 'contact-stage:' || p_contact_id::text || ':' || p_stage)
  );

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_founder_cycle_snapshot_v1()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_state public.founder_cycle_state%ROWTYPE;
  v_has_state boolean := false;
  v_legacy_stage text;
  v_events integer := 0;
  v_prospects integer := 0;
  v_qualified integer := 0;
  v_outreach integer := 0;
  v_replies integer := 0;
  v_interviews integer := 0;
  v_commitments integer := 0;
  v_customers integer := 0;
  v_retention integer := 0;
  v_reviews integer := 0;
  v_this_week integer := 0;
  v_recommended text;
  v_selected text;
  v_reason text;
  v_strongest text;
  v_missing jsonb := '[]'::jsonb;
  v_primary jsonb;
  v_secondary jsonb := '[]'::jsonb;
  v_eligible boolean := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_state FROM public.founder_cycle_state WHERE user_id = v_user_id;
  v_has_state := FOUND;
  SELECT current_stage::text INTO v_legacy_stage
  FROM public.user_progress WHERE user_id = v_user_id;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE event_type = 'prospect_added')::integer,
    count(*) FILTER (WHERE event_type = 'prospect_qualified')::integer,
    count(*) FILTER (WHERE event_type = 'outreach_sent')::integer,
    count(*) FILTER (WHERE event_type = 'reply_received')::integer,
    count(*) FILTER (WHERE event_type = 'interview_completed')::integer,
    count(*) FILTER (WHERE event_type = 'commitment_received')::integer,
    count(DISTINCT contact_id)
      FILTER (WHERE event_type = 'payment_received' AND contact_id IS NOT NULL)::integer,
    count(*) FILTER (WHERE event_type = 'retention_observed')::integer,
    count(*) FILTER (WHERE event_type = 'channel_reviewed')::integer,
    count(*) FILTER (WHERE occurred_at >= now() - interval '7 days')::integer
  INTO
    v_events, v_prospects, v_qualified, v_outreach, v_replies, v_interviews,
    v_commitments, v_customers, v_retention, v_reviews, v_this_week
  FROM public.customer_evidence_events
  WHERE user_id = v_user_id;

  SELECT GREATEST(
    v_customers,
    COALESCE((
      SELECT metric.active_customers
      FROM public.revenue_metrics metric
      WHERE metric.user_id = v_user_id
      ORDER BY metric.metric_date DESC, metric.updated_at DESC
      LIMIT 1
    ), 0)
  ) INTO v_customers;

  SELECT
    GREATEST(v_prospects, count(*)::integer),
    GREATEST(v_qualified, count(*) FILTER (WHERE stage IN (
      'qualified', 'contacted', 'replied', 'interview', 'offer', 'commitment', 'customer'
    ))::integer),
    GREATEST(
      COALESCE(v_state.customer_count, 0),
      v_customers,
      count(*) FILTER (WHERE stage = 'customer')::integer
    )
  INTO v_prospects, v_qualified, v_customers
  FROM public.founder_customer_contacts
  WHERE user_id = v_user_id;

  IF v_customers >= 3 THEN
    v_recommended := 'GROW';
    v_reason := 'Three or more paying customers are recorded.';
  ELSIF v_customers > 0 OR v_commitments > 0 THEN
    v_recommended := 'SELL';
    v_reason := 'A costly commitment exists, but fewer than three customers are paying.';
  ELSIF v_has_state OR v_events > 0 OR v_prospects > 0 THEN
    v_recommended := 'PROVE';
    v_reason := 'No costly customer commitment is recorded yet.';
  ELSE
    v_recommended := CASE v_legacy_stage
      WHEN 'BUILDING' THEN 'SELL'
      WHEN 'LAUNCH' THEN 'SELL'
      WHEN 'TRACTION' THEN 'GROW'
      WHEN 'FUNDRAISING' THEN 'SELL'
      ELSE 'PROVE'
    END;
    v_reason := 'External evidence is unavailable, so the legacy stage is a temporary fallback.';
  END IF;
  v_selected := COALESCE(v_state.selected_loop, v_recommended);

  IF v_customers > 0 THEN
    v_strongest := v_customers || CASE WHEN v_customers = 1 THEN ' paying customer recorded.' ELSE ' paying customers recorded.' END;
  ELSIF v_commitments > 0 THEN
    v_strongest := v_commitments || CASE WHEN v_commitments = 1 THEN ' costly commitment recorded.' ELSE ' costly commitments recorded.' END;
  ELSIF v_interviews > 0 THEN
    v_strongest := v_interviews || CASE WHEN v_interviews = 1 THEN ' qualified conversation completed.' ELSE ' qualified conversations completed.' END;
  ELSIF v_replies > 0 THEN
    v_strongest := v_replies || CASE WHEN v_replies = 1 THEN ' customer reply recorded.' ELSE ' customer replies recorded.' END;
  ELSIF v_prospects > 0 THEN
    v_strongest := v_prospects || CASE WHEN v_prospects = 1 THEN ' named prospect added.' ELSE ' named prospects added.' END;
  ELSE
    v_strongest := 'No external customer evidence recorded yet.';
  END IF;

  IF v_selected = 'PROVE' THEN
    IF v_interviews < 3 THEN v_missing := v_missing || to_jsonb((3 - v_interviews) || ' more qualified conversations'); END IF;
    IF v_commitments = 0 AND v_customers = 0 THEN v_missing := v_missing || '"One costly commitment"'::jsonb; END IF;
    IF v_prospects < 10 THEN
      v_primary := jsonb_build_object(
        'key', 'add-qualified-prospects', 'title', 'Add your first 10 qualified prospects',
        'description', 'Build a named list of reachable people who match the customer problem.',
        'route', '/bizmap-ai#customer-evidence', 'expectedEvidence', 'prospect_added',
        'reason', 'You need reachable customers before you can collect decision-grade evidence.',
        'priority', 3
      );
    ELSIF v_interviews < 3 THEN
      v_primary := jsonb_build_object(
        'key', 'complete-customer-conversations', 'title', 'Complete the next qualified customer conversation',
        'description', 'Contact a qualified prospect and capture what they do today, urgency, and buying constraints.',
        'route', '/pmf-lab', 'expectedEvidence', 'interview_completed',
        'reason', 'Conversations test the problem before more product work.',
        'priority', 3
      );
    ELSE
      v_primary := jsonb_build_object(
        'key', 'ask-for-commitment', 'title', 'Ask for a costly commitment',
        'description', 'Offer a paid pilot, deposit, design partnership, or scheduled implementation.',
        'route', '/bizmap-ai#customer-evidence', 'expectedEvidence', 'commitment_received',
        'reason', 'Interest becomes proof only when the customer gives up something valuable.',
        'priority', 3
      );
    END IF;
    v_secondary := jsonb_build_array(
      jsonb_build_object(
        'key', 'tighten-icp', 'title', 'Tighten the ICP from evidence',
        'description', 'Update the customer hypothesis using patterns from real conversations.',
        'route', '/icp-builder', 'expectedEvidence', 'prospect_qualified',
        'reason', 'A narrower customer hypothesis improves list and message quality.', 'priority', 2
      )
    );
  ELSIF v_selected = 'SELL' THEN
    v_missing := jsonb_build_array(GREATEST(0, 3 - v_customers) || ' more paying customers');
    IF v_replies = 0 THEN
      v_primary := jsonb_build_object(
        'key', 'send-approved-outreach', 'title', 'Send the next five approved messages',
        'description', 'Personalize each message, approve it, copy it, and record the send manually.',
        'route', '/bizmap-ai#customer-evidence', 'expectedEvidence', 'outreach_sent',
        'reason', 'Replies are the closest leading signal before a sales conversation.',
        'priority', 3
      );
    ELSE
      v_primary := jsonb_build_object(
        'key', 'move-reply-to-offer', 'title', 'Move the strongest reply to an offer',
        'description', 'Follow up with a concrete pilot, paid offer, or implementation commitment.',
        'route', '/bizmap-ai#customer-evidence', 'expectedEvidence', 'offer_sent',
        'reason', 'Active customer replies should outrank new internal planning work.',
        'priority', 3
      );
    END IF;
    v_secondary := jsonb_build_array(
      jsonb_build_object(
        'key', 'review-gtm-message', 'title', 'Review the offer and message',
        'description', 'Use objections and replies to revise one GTM assumption.',
        'route', '/go-to-market', 'expectedEvidence', 'reply_received',
        'reason', 'Response quality determines the next message change.', 'priority', 2
      )
    );
  ELSE
    v_missing := jsonb_build_array('A reviewed acquisition channel', 'A retention or repeat-purchase signal');
    v_primary := jsonb_build_object(
      'key', 'review-growth-channel', 'title', 'Review one acquisition channel this week',
      'description', 'Compare inputs, qualified conversations, customers, and revenue before deciding to persist or stop.',
      'route', '/traction-engine', 'expectedEvidence', 'channel_reviewed',
      'reason', 'Growth comes from repeatable channel economics, not stage completion.',
      'priority', 3
    );
    v_secondary := jsonb_build_array(
      jsonb_build_object(
        'key', 'record-retention', 'title', 'Record a retention signal',
        'description', 'Capture renewal, repeat use, expansion, or repeat purchase.',
        'route', '/core-metrics', 'expectedEvidence', 'retention_observed',
        'reason', 'Acquisition without retention is not repeatable growth.', 'priority', 2
      )
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.founder_cycle_action_feedback feedback
    WHERE feedback.user_id = v_user_id
      AND feedback.action_key = v_primary->>'key'
      AND feedback.cooldown_until > now()
  ) THEN
    v_primary := COALESCE(v_secondary->0, jsonb_build_object(
      'key', 'review-customer-evidence',
      'title', 'Review your latest customer evidence',
      'description', 'Use the newest reply, objection, commitment, or result to choose the next market action.',
      'route', '/bizmap-ai#customer-evidence',
      'expectedEvidence', 'prospect_qualified',
      'reason', 'Your feedback paused the previous recommendation, so the cycle is showing the next useful action.',
      'priority', 2
    ));
    v_secondary := CASE
      WHEN jsonb_array_length(v_secondary) > 0 THEN v_secondary - 0
      ELSE '[]'::jsonb
    END;
  END IF;

  v_eligible := COALESCE(v_state.beta_cohort, false)
    OR (
      v_state.business_model IN ('b2b_saas', 'service')
      AND v_customers BETWEEN 0 AND 3
    );

  RETURN jsonb_build_object(
    'version', 1,
    'generatedAt', now(),
    'eligible', v_eligible,
    'betaCohort', COALESCE(v_state.beta_cohort, false),
    'businessModel', v_state.business_model,
    'customerCount', v_customers,
    'recommendedLoop', v_recommended,
    'selectedLoop', v_selected,
    'assignmentReason', v_reason,
    'primaryGoal', v_state.primary_goal,
    'raiseActive', COALESCE(v_state.raise_active, false) OR v_legacy_stage = 'FUNDRAISING',
    'strongestEvidence', v_strongest,
    'missingEvidence', v_missing,
    'evidence', jsonb_build_object(
      'prospects', v_prospects, 'qualifiedProspects', v_qualified,
      'outreachSent', v_outreach, 'replies', v_replies,
      'interviews', v_interviews, 'commitments', v_commitments,
      'payingCustomers', v_customers, 'retentionSignals', v_retention,
      'channelReviews', v_reviews, 'thisWeek', v_this_week
    ),
    'primaryAction', v_primary,
    'secondaryActions', v_secondary
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_founder_cycle_beta_cohort_v1(
  p_user_id uuid,
  p_enabled boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  INSERT INTO public.founder_cycle_state (
    user_id, customer_count, recommended_loop, beta_cohort, assignment_reason
  ) VALUES (
    p_user_id, 0, 'PROVE', COALESCE(p_enabled, true),
    'Founder was enrolled in the concierge beta by an administrator.'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    beta_cohort = COALESCE(p_enabled, true),
    assignment_reason = CASE WHEN COALESCE(p_enabled, true)
      THEN 'Founder was enrolled in the concierge beta by an administrator.'
      ELSE founder_cycle_state.assignment_reason
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_founder_cycle_beta_metrics_v1()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH evidence AS (
    SELECT
      state.user_id,
      count(*) FILTER (WHERE event.event_type = 'interview_completed') AS conversations,
      count(*) FILTER (WHERE event.event_type IN ('commitment_received', 'payment_received')) AS commitments,
      count(DISTINCT event.contact_id) FILTER (WHERE event.event_type = 'payment_received') AS customers,
      min(event.occurred_at) AS first_evidence_at
    FROM public.founder_cycle_state state
    LEFT JOIN public.customer_evidence_events event ON event.user_id = state.user_id
    WHERE state.beta_cohort
    GROUP BY state.user_id
  ), concierge AS (
    SELECT
      checkin.user_id,
      bool_or(checkin.willing_to_continue_paying IS TRUE) AS willing_to_pay,
      sum(checkin.service_minutes) AS service_minutes
    FROM public.founder_cycle_concierge_checkins checkin
    GROUP BY checkin.user_id
  )
  SELECT jsonb_build_object(
    'version', 1,
    'generatedAt', now(),
    'cohortSize', count(*)::integer,
    'foundersWithThreeConversations', count(*) FILTER (WHERE evidence.conversations >= 3)::integer,
    'foundersWithCommitmentOrCustomer', count(*) FILTER (
      WHERE evidence.commitments > 0 OR evidence.customers > 0
    )::integer,
    'foundersWithEvidenceWithinSevenDays', count(*) FILTER (
      WHERE evidence.first_evidence_at <= state.created_at + interval '7 days'
    )::integer,
    'foundersWillingToContinuePaying', count(*) FILTER (
      WHERE concierge.willing_to_pay
    )::integer,
    'averageServiceMinutesPerFounder', COALESCE(round(avg(concierge.service_minutes)), 0)::integer
  ) INTO v_result
  FROM public.founder_cycle_state state
  LEFT JOIN evidence ON evidence.user_id = state.user_id
  LEFT JOIN concierge ON concierge.user_id = state.user_id
  WHERE state.beta_cohort;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_founder_cycle_state_v1(text, integer, text, text, boolean, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_customer_evidence_event_v1(text, text, uuid, text, text, text, numeric, text, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_founder_cycle_action_feedback_v1(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_founder_customer_contact_v1(text, text, text, text, text, text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_founder_customer_contact_v1(uuid, text, text, text, text, numeric, text, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_founder_cycle_snapshot_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_founder_cycle_beta_cohort_v1(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_founder_cycle_beta_metrics_v1() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.upsert_founder_cycle_state_v1(text, integer, text, text, boolean, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_customer_evidence_event_v1(text, text, uuid, text, text, text, numeric, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_founder_cycle_action_feedback_v1(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_founder_customer_contact_v1(text, text, text, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_founder_customer_contact_v1(uuid, text, text, text, text, numeric, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_founder_cycle_snapshot_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_founder_cycle_beta_cohort_v1(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_founder_cycle_beta_metrics_v1() TO authenticated;

GRANT SELECT ON public.founder_cycle_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_customer_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_evidence_events TO authenticated;
GRANT SELECT ON public.founder_cycle_concierge_checkins TO authenticated;
GRANT SELECT ON public.founder_cycle_action_feedback TO authenticated;

-- Compatibility backfill: create canonical contacts for existing PMF and GTM records.
INSERT INTO public.founder_customer_contacts (
  user_id, display_name, profile_url, source, stage, notes,
  pmf_discovery_lead_id, last_activity_at, created_at
)
SELECT
  lead.user_id,
  COALESCE(NULLIF(trim(lead.display_name), ''), lead.username),
  lead.profile_url,
  CASE WHEN lead.source IN ('reddit', 'platform', 'hackernews', 'x', 'linkedin', 'web')
    THEN lead.source ELSE 'imported' END,
  CASE lead.status
    WHEN 'saved' THEN 'qualified'
    WHEN 'contacted' THEN 'contacted'
    WHEN 'interview_scheduled' THEN 'interview'
    WHEN 'interviewed' THEN 'interview'
    WHEN 'dismissed' THEN 'lost'
    ELSE 'new'
  END,
  COALESCE(lead.notes, ''),
  lead.id,
  COALESCE(lead.last_seen_at, now()),
  COALESCE(lead.first_seen_at, now())
FROM public.pmf_discovery_leads lead
ON CONFLICT (user_id, pmf_discovery_lead_id) WHERE pmf_discovery_lead_id IS NOT NULL
DO NOTHING;

INSERT INTO public.founder_customer_contacts (
  user_id, display_name, source, stage, notes,
  gtm_pipeline_entry_id, last_activity_at, created_at
)
SELECT
  entry.user_id,
  entry.name,
  'gtm',
  CASE entry.stage
    WHEN 'qualified' THEN 'qualified'
    WHEN 'opportunity' THEN 'offer'
    WHEN 'customer' THEN 'customer'
    WHEN 'lost' THEN 'lost'
    ELSE 'new'
  END,
  COALESCE(entry.notes, ''),
  entry.id,
  entry.updated_at,
  entry.created_at
FROM public.gtm_pipeline_entries entry
ON CONFLICT (user_id, gtm_pipeline_entry_id) WHERE gtm_pipeline_entry_id IS NOT NULL
DO NOTHING;

INSERT INTO public.customer_evidence_events (
  user_id, contact_id, active_loop, event_type, source_entity_type,
  source_entity_id, verification_mode, metadata, idempotency_key, occurred_at
)
SELECT
  activity.user_id,
  contact.id,
  'PROVE',
  CASE activity.activity_type
    WHEN 'outreach_sent' THEN 'outreach_sent'
    WHEN 'interview_scheduled' THEN 'interview_scheduled'
    WHEN 'interview_logged' THEN 'interview_completed'
  END,
  'pmf_discovery_lead_activity',
  activity.id::text,
  'imported',
  jsonb_build_object('backfilled', true),
  'pmf-activity:' || activity.id::text,
  activity.occurred_at
FROM public.pmf_discovery_lead_activities activity
JOIN public.founder_customer_contacts contact
  ON contact.user_id = activity.user_id
 AND contact.pmf_discovery_lead_id = activity.lead_id
WHERE activity.activity_type IN ('outreach_sent', 'interview_scheduled', 'interview_logged')
ON CONFLICT (user_id, idempotency_key) DO NOTHING;

INSERT INTO public.customer_evidence_events (
  user_id, contact_id, active_loop, event_type, source_entity_type,
  source_entity_id, verification_mode, amount, currency, metadata,
  idempotency_key, occurred_at
)
SELECT
  entry.user_id,
  contact.id,
  CASE WHEN entry.stage = 'customer' THEN 'SELL' ELSE 'PROVE' END,
  CASE entry.stage
    WHEN 'qualified' THEN 'prospect_qualified'
    WHEN 'opportunity' THEN 'offer_sent'
    WHEN 'customer' THEN 'commitment_received'
    WHEN 'lost' THEN 'customer_lost'
    ELSE 'prospect_added'
  END,
  'gtm_pipeline_entry',
  entry.id::text,
  'imported',
  NULLIF(entry.value, 0),
  NULL,
  jsonb_build_object('backfilled', true, 'source_channel_id', entry.source_channel_id),
  'gtm-entry:' || entry.id::text || ':' || entry.stage,
  entry.occurred_at::timestamptz
FROM public.gtm_pipeline_entries entry
JOIN public.founder_customer_contacts contact
  ON contact.user_id = entry.user_id
 AND contact.gtm_pipeline_entry_id = entry.id
ON CONFLICT (user_id, idempotency_key) DO NOTHING;

-- Keep future PMF discoveries connected without changing the existing PMF API.
CREATE OR REPLACE FUNCTION public.sync_pmf_lead_to_founder_cycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_loop text;
  v_event_type text;
BEGIN
  INSERT INTO public.founder_customer_contacts (
    user_id, display_name, profile_url, source, stage, notes,
    pmf_discovery_lead_id, last_activity_at, created_at
  ) VALUES (
    NEW.user_id,
    COALESCE(NULLIF(trim(NEW.display_name), ''), NEW.username),
    NEW.profile_url,
    CASE WHEN NEW.source IN ('reddit', 'platform', 'hackernews', 'x', 'linkedin', 'web')
      THEN NEW.source ELSE 'imported' END,
    CASE NEW.status
      WHEN 'saved' THEN 'qualified'
      WHEN 'contacted' THEN 'contacted'
      WHEN 'interview_scheduled' THEN 'interview'
      WHEN 'interviewed' THEN 'interview'
      WHEN 'dismissed' THEN 'lost'
      ELSE 'new'
    END,
    COALESCE(NEW.notes, ''),
    NEW.id,
    COALESCE(NEW.last_seen_at, now()),
    COALESCE(NEW.first_seen_at, now())
  )
  ON CONFLICT (user_id, pmf_discovery_lead_id) WHERE pmf_discovery_lead_id IS NOT NULL
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    profile_url = EXCLUDED.profile_url,
    stage = EXCLUDED.stage,
    notes = EXCLUDED.notes,
    last_activity_at = EXCLUDED.last_activity_at
  RETURNING id INTO v_contact_id;

  IF TG_OP = 'INSERT' THEN
    v_event_type := 'prospect_added';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_event_type := CASE NEW.status
      WHEN 'saved' THEN 'prospect_qualified'
      WHEN 'contacted' THEN 'outreach_sent'
      WHEN 'interview_scheduled' THEN 'interview_scheduled'
      WHEN 'interviewed' THEN 'interview_completed'
      WHEN 'dismissed' THEN 'customer_lost'
      ELSE NULL
    END;
  END IF;

  IF v_event_type IS NOT NULL THEN
    SELECT COALESCE(selected_loop, recommended_loop, 'PROVE')
    INTO v_loop FROM public.founder_cycle_state WHERE user_id = NEW.user_id;
    INSERT INTO public.customer_evidence_events (
      user_id, contact_id, active_loop, event_type, source_entity_type,
      source_entity_id, verification_mode, metadata, idempotency_key, occurred_at
    ) VALUES (
      NEW.user_id, v_contact_id, COALESCE(v_loop, 'PROVE'), v_event_type,
      'pmf_discovery_lead', NEW.id::text,
      CASE WHEN v_event_type IN ('interview_scheduled', 'interview_completed')
        THEN 'customer_action' ELSE 'imported' END,
      jsonb_build_object('source', NEW.source),
      'pmf-lead:' || NEW.id::text || ':' || v_event_type,
      now()
    )
    ON CONFLICT (user_id, idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_pmf_lead_to_founder_cycle_v1 ON public.pmf_discovery_leads;
CREATE TRIGGER sync_pmf_lead_to_founder_cycle_v1
AFTER INSERT OR UPDATE OF status, display_name, profile_url, notes
ON public.pmf_discovery_leads
FOR EACH ROW EXECUTE FUNCTION public.sync_pmf_lead_to_founder_cycle_v1();

-- Keep future GTM pipeline evidence in the same ledger.
CREATE OR REPLACE FUNCTION public.sync_gtm_entry_to_founder_cycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_event_type text;
  v_loop text;
BEGIN
  INSERT INTO public.founder_customer_contacts (
    user_id, display_name, source, stage, notes,
    gtm_pipeline_entry_id, last_activity_at, created_at
  ) VALUES (
    NEW.user_id, NEW.name, 'gtm',
    CASE NEW.stage
      WHEN 'qualified' THEN 'qualified'
      WHEN 'opportunity' THEN 'offer'
      WHEN 'customer' THEN 'customer'
      WHEN 'lost' THEN 'lost'
      ELSE 'new'
    END,
    COALESCE(NEW.notes, ''), NEW.id, NEW.updated_at, NEW.created_at
  )
  ON CONFLICT (user_id, gtm_pipeline_entry_id) WHERE gtm_pipeline_entry_id IS NOT NULL
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    stage = EXCLUDED.stage,
    notes = EXCLUDED.notes,
    last_activity_at = EXCLUDED.last_activity_at
  RETURNING id INTO v_contact_id;

  IF TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM NEW.stage THEN
    v_event_type := CASE NEW.stage
      WHEN 'qualified' THEN 'prospect_qualified'
      WHEN 'opportunity' THEN 'offer_sent'
      WHEN 'customer' THEN 'commitment_received'
      WHEN 'lost' THEN 'customer_lost'
      ELSE 'prospect_added'
    END;
    SELECT COALESCE(selected_loop, recommended_loop, 'PROVE')
    INTO v_loop FROM public.founder_cycle_state WHERE user_id = NEW.user_id;
    INSERT INTO public.customer_evidence_events (
      user_id, contact_id, active_loop, event_type, source_entity_type,
      source_entity_id, verification_mode, amount, metadata,
      idempotency_key, occurred_at
    ) VALUES (
      NEW.user_id, v_contact_id, COALESCE(v_loop, 'PROVE'), v_event_type,
      'gtm_pipeline_entry', NEW.id::text, 'imported', NULLIF(NEW.value, 0),
      jsonb_build_object('source_channel_id', NEW.source_channel_id),
      'gtm-entry:' || NEW.id::text || ':' || NEW.stage,
      NEW.occurred_at::timestamptz
    )
    ON CONFLICT (user_id, idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_gtm_entry_to_founder_cycle_v1 ON public.gtm_pipeline_entries;
CREATE TRIGGER sync_gtm_entry_to_founder_cycle_v1
AFTER INSERT OR UPDATE OF stage, name, notes, value
ON public.gtm_pipeline_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_gtm_entry_to_founder_cycle_v1();

-- Existing public signups are lightweight demand signals. They add evidence but
-- never satisfy the costly-commitment gate.
INSERT INTO public.customer_evidence_events (
  user_id, active_loop, event_type, source_entity_type, source_entity_id,
  verification_mode, metadata, idempotency_key, occurred_at
)
SELECT
  project.owner_id, 'PROVE', 'prospect_added', 'demo_studio_signup', signup.id::text,
  'customer_action', jsonb_build_object('backfilled', true),
  'demo-signup:' || signup.id::text, signup.created_at
FROM public.demo_studio_signups signup
JOIN public.demo_studio_projects project ON project.id = signup.project_id
ON CONFLICT (user_id, idempotency_key) DO NOTHING;

INSERT INTO public.customer_evidence_events (
  user_id, active_loop, event_type, source_entity_type, source_entity_id,
  verification_mode, metadata, idempotency_key, occurred_at
)
SELECT
  page.user_id, 'PROVE', 'prospect_added', 'waitlist_signup', signup.id::text,
  'customer_action', jsonb_build_object('backfilled', true),
  'waitlist-signup:' || signup.id::text, COALESCE(signup.created_at, now())
FROM public.waitlist_signups signup
JOIN public.waitlist_pages page ON page.id = signup.waitlist_page_id
ON CONFLICT (user_id, idempotency_key) DO NOTHING;

-- Revenue logs establish monetisation evidence without inventing named customers.
-- The snapshot reads the latest active_customer aggregate separately, while the
-- event records that a payment/revenue signal exists.
INSERT INTO public.customer_evidence_events (
  user_id, active_loop, event_type, source_entity_type, source_entity_id,
  verification_mode, amount, metadata, idempotency_key, occurred_at
)
SELECT
  metric.user_id,
  CASE WHEN COALESCE(metric.active_customers, 0) >= 3 THEN 'GROW' ELSE 'SELL' END,
  'payment_received', 'revenue_metric', metric.id::text, 'imported',
  GREATEST(COALESCE(metric.total_revenue, 0), COALESCE(metric.mrr, 0)),
  jsonb_build_object(
    'backfilled', true,
    'active_customer_count', COALESCE(metric.active_customers, 0),
    'new_customer_count', COALESCE(metric.new_customers, 0)
  ),
  'revenue-metric:' || metric.id::text, COALESCE(metric.metric_date, CURRENT_DATE)::timestamptz
FROM public.revenue_metrics metric
WHERE COALESCE(metric.total_revenue, 0) > 0
   OR COALESCE(metric.mrr, 0) > 0
   OR COALESCE(metric.active_customers, 0) > 0
ON CONFLICT (user_id, idempotency_key) DO NOTHING;

-- A saved traction week is a channel review. Retention advances only when at
-- least one real 7-day or 30-day active-user signal was recorded.
INSERT INTO public.customer_evidence_events (
  user_id, active_loop, event_type, source_entity_type, source_entity_id,
  verification_mode, metadata, idempotency_key, occurred_at
)
SELECT
  log.user_id, 'GROW', 'channel_reviewed', 'traction_weekly_log', log.id::text,
  CASE WHEN log.verification_mode = 'platform_verified'
    THEN 'platform_verified' ELSE 'founder_reported' END,
  jsonb_build_object('backfilled', true, 'week_start_date', log.week_start_date),
  'traction-week:' || log.id::text || ':channel', log.updated_at
FROM public.traction_engine_weekly_logs log
ON CONFLICT (user_id, idempotency_key) DO NOTHING;

INSERT INTO public.customer_evidence_events (
  user_id, active_loop, event_type, source_entity_type, source_entity_id,
  verification_mode, metadata, idempotency_key, occurred_at
)
SELECT
  log.user_id, 'GROW', 'retention_observed', 'traction_weekly_log', log.id::text,
  CASE WHEN log.verification_mode = 'platform_verified'
    THEN 'platform_verified' ELSE 'founder_reported' END,
  jsonb_build_object(
    'backfilled', true,
    'week_start_date', log.week_start_date,
    'seven_day_active_users', log.seven_day_active_users,
    'thirty_day_active_users', log.thirty_day_active_users
  ),
  'traction-week:' || log.id::text || ':retention', log.updated_at
FROM public.traction_engine_weekly_logs log
WHERE log.seven_day_active_users > 0 OR log.thirty_day_active_users > 0
ON CONFLICT (user_id, idempotency_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_traction_log_to_founder_cycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loop text;
  v_verification text;
BEGIN
  SELECT COALESCE(selected_loop, recommended_loop, 'GROW')
  INTO v_loop
  FROM public.founder_cycle_state
  WHERE user_id = NEW.user_id;
  v_verification := CASE WHEN NEW.verification_mode = 'platform_verified'
    THEN 'platform_verified' ELSE 'founder_reported' END;

  INSERT INTO public.customer_evidence_events (
    user_id, active_loop, event_type, source_entity_type, source_entity_id,
    verification_mode, metadata, idempotency_key, occurred_at
  ) VALUES (
    NEW.user_id, COALESCE(v_loop, 'GROW'), 'channel_reviewed',
    'traction_weekly_log', NEW.id::text, v_verification,
    jsonb_build_object('week_start_date', NEW.week_start_date),
    'traction-week:' || NEW.id::text || ':channel', NEW.updated_at
  )
  ON CONFLICT (user_id, idempotency_key) DO UPDATE SET
    verification_mode = EXCLUDED.verification_mode,
    metadata = EXCLUDED.metadata,
    occurred_at = EXCLUDED.occurred_at;

  IF NEW.seven_day_active_users > 0 OR NEW.thirty_day_active_users > 0 THEN
    INSERT INTO public.customer_evidence_events (
      user_id, active_loop, event_type, source_entity_type, source_entity_id,
      verification_mode, metadata, idempotency_key, occurred_at
    ) VALUES (
      NEW.user_id, COALESCE(v_loop, 'GROW'), 'retention_observed',
      'traction_weekly_log', NEW.id::text, v_verification,
      jsonb_build_object(
        'week_start_date', NEW.week_start_date,
        'seven_day_active_users', NEW.seven_day_active_users,
        'thirty_day_active_users', NEW.thirty_day_active_users
      ),
      'traction-week:' || NEW.id::text || ':retention', NEW.updated_at
    )
    ON CONFLICT (user_id, idempotency_key) DO UPDATE SET
      verification_mode = EXCLUDED.verification_mode,
      metadata = EXCLUDED.metadata,
      occurred_at = EXCLUDED.occurred_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_traction_log_to_founder_cycle_v1 ON public.traction_engine_weekly_logs;
CREATE TRIGGER sync_traction_log_to_founder_cycle_v1
AFTER INSERT OR UPDATE OF seven_day_active_users, thirty_day_active_users, verification_mode
ON public.traction_engine_weekly_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_traction_log_to_founder_cycle_v1();

CREATE OR REPLACE FUNCTION public.sync_demo_signup_to_founder_cycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_loop text;
BEGIN
  SELECT owner_id INTO v_user_id
  FROM public.demo_studio_projects
  WHERE id = NEW.project_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(selected_loop, recommended_loop, 'PROVE')
  INTO v_loop FROM public.founder_cycle_state WHERE user_id = v_user_id;
  INSERT INTO public.customer_evidence_events (
    user_id, active_loop, event_type, source_entity_type, source_entity_id,
    verification_mode, metadata, idempotency_key, occurred_at
  ) VALUES (
    v_user_id, COALESCE(v_loop, 'PROVE'), 'prospect_added',
    'demo_studio_signup', NEW.id::text, 'customer_action',
    jsonb_build_object('project_id', NEW.project_id),
    'demo-signup:' || NEW.id::text, NEW.created_at
  )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_demo_signup_to_founder_cycle_v1 ON public.demo_studio_signups;
CREATE TRIGGER sync_demo_signup_to_founder_cycle_v1
AFTER INSERT ON public.demo_studio_signups
FOR EACH ROW EXECUTE FUNCTION public.sync_demo_signup_to_founder_cycle_v1();

CREATE OR REPLACE FUNCTION public.sync_waitlist_signup_to_founder_cycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_loop text;
BEGIN
  SELECT user_id INTO v_user_id
  FROM public.waitlist_pages
  WHERE id = NEW.waitlist_page_id;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(selected_loop, recommended_loop, 'PROVE')
  INTO v_loop FROM public.founder_cycle_state WHERE user_id = v_user_id;
  INSERT INTO public.customer_evidence_events (
    user_id, active_loop, event_type, source_entity_type, source_entity_id,
    verification_mode, metadata, idempotency_key, occurred_at
  ) VALUES (
    v_user_id, COALESCE(v_loop, 'PROVE'), 'prospect_added',
    'waitlist_signup', NEW.id::text, 'customer_action',
    jsonb_build_object('waitlist_page_id', NEW.waitlist_page_id),
    'waitlist-signup:' || NEW.id::text, COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_waitlist_signup_to_founder_cycle_v1 ON public.waitlist_signups;
CREATE TRIGGER sync_waitlist_signup_to_founder_cycle_v1
AFTER INSERT ON public.waitlist_signups
FOR EACH ROW EXECUTE FUNCTION public.sync_waitlist_signup_to_founder_cycle_v1();

CREATE OR REPLACE FUNCTION public.sync_revenue_metric_to_founder_cycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loop text;
BEGIN
  IF COALESCE(NEW.total_revenue, 0) <= 0
    AND COALESCE(NEW.mrr, 0) <= 0
    AND COALESCE(NEW.active_customers, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(selected_loop, recommended_loop,
    CASE WHEN COALESCE(NEW.active_customers, 0) >= 3 THEN 'GROW' ELSE 'SELL' END)
  INTO v_loop FROM public.founder_cycle_state WHERE user_id = NEW.user_id;
  INSERT INTO public.customer_evidence_events (
    user_id, active_loop, event_type, source_entity_type, source_entity_id,
    verification_mode, amount, metadata, idempotency_key, occurred_at
  ) VALUES (
    NEW.user_id, COALESCE(v_loop, 'SELL'), 'payment_received',
    'revenue_metric', NEW.id::text, 'imported',
    GREATEST(COALESCE(NEW.total_revenue, 0), COALESCE(NEW.mrr, 0)),
    jsonb_build_object(
      'active_customer_count', COALESCE(NEW.active_customers, 0),
      'new_customer_count', COALESCE(NEW.new_customers, 0)
    ),
    'revenue-metric:' || NEW.id::text, NEW.updated_at
  )
  ON CONFLICT (user_id, idempotency_key) DO UPDATE SET
    active_loop = EXCLUDED.active_loop,
    amount = EXCLUDED.amount,
    metadata = EXCLUDED.metadata,
    occurred_at = EXCLUDED.occurred_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_revenue_metric_to_founder_cycle_v1 ON public.revenue_metrics;
CREATE TRIGGER sync_revenue_metric_to_founder_cycle_v1
AFTER INSERT OR UPDATE OF mrr, total_revenue, active_customers, new_customers
ON public.revenue_metrics
FOR EACH ROW EXECUTE FUNCTION public.sync_revenue_metric_to_founder_cycle_v1();

COMMENT ON TABLE public.founder_cycle_state IS
  'Additive PROVE/SELL/GROW compatibility state. selected_loop is a temporary founder override; recommended_loop remains system-derived.';
COMMENT ON TABLE public.founder_customer_contacts IS
  'Canonical, founder-owned lightweight customer/prospect record linking PMF and GTM workflows.';
COMMENT ON TABLE public.customer_evidence_events IS
  'Idempotent external customer evidence ledger. PII stays in founder_customer_contacts and must not be forwarded to product analytics.';
COMMENT ON TABLE public.founder_cycle_concierge_checkins IS
  'Admin-operated weekly scorecard for the 20-founder concierge beta, including service-time and willingness-to-pay measures.';
COMMENT ON TABLE public.founder_cycle_action_feedback IS
  'User-scoped cooldowns for Founder Execution Cycle recommendations; feedback changes the next action without mutating evidence.';
