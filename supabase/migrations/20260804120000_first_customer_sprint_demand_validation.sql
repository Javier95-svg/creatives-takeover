-- First Customer Sprint demand validation: mixed-cohort applications, exit review,
-- attributed continuation purchase, and admin cohort reporting.

CREATE TABLE IF NOT EXISTS public.first_customer_sprint_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'invited', 'declined')),
  business_model text NOT NULL CHECK (business_model IN ('b2b_saas', 'service', 'other')),
  founder_owns_sales boolean NOT NULL,
  has_sellable_product boolean NOT NULL,
  customer_count integer NOT NULL CHECK (customer_count BETWEEN 0 AND 999),
  estimated_annual_customer_value_usd numeric(12,2) NOT NULL CHECK (estimated_annual_customer_value_usd > 0),
  weekly_capacity_hours numeric(5,1) NOT NULL CHECK (weekly_capacity_hours BETWEEN 0 AND 168),
  can_name_ten_prospects boolean NOT NULL,
  recent_outreach text NOT NULL CHECK (recent_outreach IN ('last_30_days', 'older', 'never')),
  primary_blocker text NOT NULL CHECK (primary_blocker IN (
    'prospect_list', 'messaging', 'confidence', 'accountability', 'replies', 'conversion', 'time'
  )),
  product_url text,
  product_summary text NOT NULL,
  acquisition_source text NOT NULL DEFAULT 'other' CHECK (acquisition_source IN (
    'mentor_referral', 'homepage', 'current_user', 'direct', 'other'
  )),
  referring_mentor_id uuid REFERENCES public.mentors(id) ON DELETE SET NULL,
  qualified boolean NOT NULL DEFAULT false,
  qualification_reasons text[] NOT NULL DEFAULT '{}'::text[],
  admin_override_reason text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT first_customer_sprint_application_text_limits CHECK (
    char_length(COALESCE(product_url, '')) <= 2000
    AND char_length(product_summary) BETWEEN 10 AND 1500
    AND char_length(COALESCE(admin_override_reason, '')) <= 1000
  )
);

CREATE INDEX IF NOT EXISTS first_customer_sprint_applications_status_created_idx
  ON public.first_customer_sprint_applications(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS first_customer_sprint_applications_source_created_idx
  ON public.first_customer_sprint_applications(acquisition_source, submitted_at DESC);

ALTER TABLE public.first_customer_sprint_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS first_customer_sprint_applications_owner_read ON public.first_customer_sprint_applications;
CREATE POLICY first_customer_sprint_applications_owner_read
  ON public.first_customer_sprint_applications FOR SELECT TO authenticated
  USING (founder_id = auth.uid());

DROP POLICY IF EXISTS first_customer_sprint_applications_admin_all ON public.first_customer_sprint_applications;
CREATE POLICY first_customer_sprint_applications_admin_all
  ON public.first_customer_sprint_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.first_customer_sprints
  ADD COLUMN IF NOT EXISTS founder_value_score integer,
  ADD COLUMN IF NOT EXISTS primary_value text,
  ADD COLUMN IF NOT EXISTS primary_friction text,
  ADD COLUMN IF NOT EXISTS would_recommend boolean,
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS review_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS continuation_from_sprint_id uuid REFERENCES public.first_customer_sprints(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS first_customer_sprints_one_continuation_per_sprint
  ON public.first_customer_sprints(continuation_from_sprint_id)
  WHERE continuation_from_sprint_id IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.first_customer_sprints
    ADD CONSTRAINT first_customer_sprint_review_score_check
    CHECK (founder_value_score IS NULL OR founder_value_score BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.first_customer_sprints
    ADD CONSTRAINT first_customer_sprint_primary_value_check
    CHECK (primary_value IS NULL OR primary_value IN ('structure', 'messaging', 'evidence', 'mentor', 'accountability'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.first_customer_sprints
    ADD CONSTRAINT first_customer_sprint_primary_friction_check
    CHECK (primary_friction IS NULL OR primary_friction IN (
      'prospect_list', 'messaging', 'sending', 'replies', 'conversion', 'time', 'not_urgent', 'none'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.first_customer_sprints
    ADD CONSTRAINT first_customer_sprint_review_note_check
    CHECK (review_note IS NULL OR char_length(review_note) <= 1000);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.submit_first_customer_sprint_application_v1(
  p_business_model text,
  p_founder_owns_sales boolean,
  p_has_sellable_product boolean,
  p_customer_count integer,
  p_estimated_annual_customer_value_usd numeric,
  p_weekly_capacity_hours numeric,
  p_can_name_ten_prospects boolean,
  p_recent_outreach text,
  p_primary_blocker text,
  p_product_url text DEFAULT NULL,
  p_product_summary text DEFAULT NULL,
  p_acquisition_source text DEFAULT 'other',
  p_referring_mentor_id uuid DEFAULT NULL,
  p_referral_code text DEFAULT NULL
) RETURNS public.first_customer_sprint_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_founder uuid := auth.uid();
  v_application public.first_customer_sprint_applications%ROWTYPE;
  v_reasons text[] := '{}'::text[];
  v_qualified boolean;
  v_source text := lower(trim(COALESCE(p_acquisition_source, 'other')));
  v_mentor_id uuid := NULL;
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_business_model NOT IN ('b2b_saas', 'service', 'other') THEN RAISE EXCEPTION 'Select a valid business model'; END IF;
  IF p_recent_outreach NOT IN ('last_30_days', 'older', 'never') THEN RAISE EXCEPTION 'Select a valid outreach window'; END IF;
  IF p_primary_blocker NOT IN ('prospect_list','messaging','confidence','accountability','replies','conversion','time') THEN
    RAISE EXCEPTION 'Select a valid primary blocker';
  END IF;
  IF v_source NOT IN ('mentor_referral','homepage','current_user','direct','other') THEN v_source := 'other'; END IF;
  IF COALESCE(p_customer_count, -1) < 0 OR COALESCE(p_estimated_annual_customer_value_usd, 0) <= 0
    OR COALESCE(p_weekly_capacity_hours, -1) < 0 OR length(trim(COALESCE(p_product_summary, ''))) < 10 THEN
    RAISE EXCEPTION 'Complete the required application fields';
  END IF;
  -- A mentor-source application is counted only when the shared link contains
  -- that mentor's private referral code. Query parameters alone are not trusted.
  IF v_source = 'mentor_referral' THEN
    SELECT mentor.id INTO v_mentor_id
    FROM public.mentors mentor
    JOIN public.referral_codes code ON code.user_id=mentor.user_id
    WHERE mentor.id=p_referring_mentor_id
      AND code.code=trim(COALESCE(p_referral_code,''))
      AND COALESCE(mentor.is_active,false)
    LIMIT 1;
    IF NOT FOUND THEN v_source := 'other'; END IF;
  END IF;

  IF p_business_model <> 'b2b_saas' THEN v_reasons := array_append(v_reasons, 'The first cohort is limited to B2B SaaS.'); END IF;
  IF NOT COALESCE(p_founder_owns_sales, false) THEN v_reasons := array_append(v_reasons, 'The participating founder must personally own sales.'); END IF;
  IF NOT COALESCE(p_has_sellable_product, false) THEN v_reasons := array_append(v_reasons, 'A working or sellable product is required.'); END IF;
  IF p_customer_count > 3 THEN v_reasons := array_append(v_reasons, 'The first cohort is for founders with 0-3 customers.'); END IF;
  IF p_estimated_annual_customer_value_usd < 1000 THEN v_reasons := array_append(v_reasons, 'Expected annual customer value must be at least $1,000.'); END IF;
  IF p_weekly_capacity_hours < 2 THEN v_reasons := array_append(v_reasons, 'At least two weekly execution hours are required.'); END IF;
  IF NOT COALESCE(p_can_name_ten_prospects, false) THEN v_reasons := array_append(v_reasons, 'The founder must be able to name ten real prospects.'); END IF;
  IF p_recent_outreach <> 'last_30_days' THEN v_reasons := array_append(v_reasons, 'The founder must have attempted outreach within 30 days.'); END IF;
  v_qualified := cardinality(v_reasons) = 0;

  INSERT INTO public.first_customer_sprint_applications (
    founder_id, status, business_model, founder_owns_sales, has_sellable_product,
    customer_count, estimated_annual_customer_value_usd, weekly_capacity_hours,
    can_name_ten_prospects, recent_outreach, primary_blocker, product_url,
    product_summary, acquisition_source, referring_mentor_id, qualified,
    qualification_reasons, submitted_at, updated_at
  ) VALUES (
    v_founder, 'submitted', p_business_model, p_founder_owns_sales, p_has_sellable_product,
    p_customer_count, p_estimated_annual_customer_value_usd, p_weekly_capacity_hours,
    p_can_name_ten_prospects, p_recent_outreach, p_primary_blocker,
    NULLIF(trim(COALESCE(p_product_url, '')), ''), trim(p_product_summary), v_source,
    v_mentor_id, v_qualified, v_reasons, now(), now()
  )
  ON CONFLICT (founder_id) DO UPDATE SET
    business_model = EXCLUDED.business_model,
    founder_owns_sales = EXCLUDED.founder_owns_sales,
    has_sellable_product = EXCLUDED.has_sellable_product,
    customer_count = EXCLUDED.customer_count,
    estimated_annual_customer_value_usd = EXCLUDED.estimated_annual_customer_value_usd,
    weekly_capacity_hours = EXCLUDED.weekly_capacity_hours,
    can_name_ten_prospects = EXCLUDED.can_name_ten_prospects,
    recent_outreach = EXCLUDED.recent_outreach,
    primary_blocker = EXCLUDED.primary_blocker,
    product_url = EXCLUDED.product_url,
    product_summary = EXCLUDED.product_summary,
    acquisition_source = EXCLUDED.acquisition_source,
    referring_mentor_id = EXCLUDED.referring_mentor_id,
    qualified = EXCLUDED.qualified,
    qualification_reasons = EXCLUDED.qualification_reasons,
    status = 'submitted',
    reviewed_at = NULL,
    invited_at = NULL,
    admin_override_reason = NULL,
    submitted_at = now(),
    updated_at = now()
  WHERE first_customer_sprint_applications.status <> 'invited'
  RETURNING * INTO v_application;

  IF NOT FOUND THEN
    SELECT * INTO v_application FROM public.first_customer_sprint_applications WHERE founder_id = v_founder;
  END IF;
  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_first_customer_sprint_application_v1()
RETURNS public.first_customer_sprint_applications
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT application.*
  FROM public.first_customer_sprint_applications application
  WHERE application.founder_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.review_first_customer_sprint_application_v1(
  p_application_id uuid,
  p_decision text,
  p_override_reason text DEFAULT NULL
) RETURNS public.first_customer_sprint_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_application public.first_customer_sprint_applications%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  IF p_decision NOT IN ('invited', 'declined') THEN RAISE EXCEPTION 'Select invited or declined'; END IF;
  SELECT * INTO v_application FROM public.first_customer_sprint_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF v_application.status <> 'submitted' THEN RETURN v_application; END IF;
  IF p_decision = 'invited' AND NOT v_application.qualified AND length(trim(COALESCE(p_override_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'A reason is required to override qualification';
  END IF;

  UPDATE public.first_customer_sprint_applications SET
    status = p_decision,
    admin_override_reason = CASE WHEN p_decision='invited' AND NOT qualified THEN trim(p_override_reason) ELSE NULL END,
    reviewed_at = now(),
    invited_at = CASE WHEN p_decision='invited' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_application_id RETURNING * INTO v_application;

  IF p_decision = 'invited' THEN
    PERFORM public.set_founder_cycle_beta_cohort_v1(v_application.founder_id, true);
  END IF;
  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_first_customer_sprint_review_v1(
  p_sprint_id uuid,
  p_value_score integer,
  p_primary_value text,
  p_primary_friction text,
  p_would_recommend boolean,
  p_review_note text DEFAULT NULL
) RETURNS public.first_customer_sprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_sprint public.first_customer_sprints%ROWTYPE;
BEGIN
  SELECT * INTO v_sprint FROM public.first_customer_sprints
  WHERE id=p_sprint_id AND founder_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found' USING ERRCODE='42501'; END IF;
  IF v_sprint.status <> 'completed' THEN RAISE EXCEPTION 'Complete the sprint before reviewing it'; END IF;
  IF v_sprint.review_submitted_at IS NOT NULL THEN RETURN v_sprint; END IF;
  IF p_value_score NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'Value score must be between 1 and 10'; END IF;
  IF p_primary_value NOT IN ('structure','messaging','evidence','mentor','accountability') THEN RAISE EXCEPTION 'Select the most valuable element'; END IF;
  IF p_primary_friction NOT IN ('prospect_list','messaging','sending','replies','conversion','time','not_urgent','none') THEN RAISE EXCEPTION 'Select the primary friction'; END IF;
  IF length(COALESCE(p_review_note,'')) > 1000 THEN RAISE EXCEPTION 'Review note is too long'; END IF;

  UPDATE public.first_customer_sprints SET
    founder_value_score=p_value_score,
    primary_value=p_primary_value,
    primary_friction=p_primary_friction,
    would_recommend=COALESCE(p_would_recommend,false),
    review_note=NULLIF(trim(COALESCE(p_review_note,'')),''),
    review_submitted_at=now(),
    updated_at=now()
  WHERE id=p_sprint_id RETURNING * INTO v_sprint;
  RETURN v_sprint;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_first_customer_sprint_continuation_v1(p_sprint_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN sprint.id IS NULL THEN jsonb_build_object('paid', false)
    ELSE COALESCE((
      SELECT jsonb_build_object(
        'paid', true,
        'purchasedAt', tx.created_at,
        'packId', tx.metadata->>'packId'
      )
      FROM public.credit_transactions tx
      WHERE tx.user_id = auth.uid()
        AND tx.tx_type = 'purchase'
        AND tx.metadata->>'purchaseSource' = 'first_customer_sprint'
        AND tx.metadata->>'purchaseContextId' = sprint.id::text
      ORDER BY tx.created_at DESC LIMIT 1
    ), jsonb_build_object('paid', false)) END
  FROM (SELECT id FROM public.first_customer_sprints WHERE id=p_sprint_id AND founder_id=auth.uid()) sprint;
$$;

CREATE OR REPLACE FUNCTION public.get_first_customer_sprint_cohort_admin_v1()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;

  WITH latest_sprint AS (
    SELECT DISTINCT ON (founder_id) * FROM public.first_customer_sprints
    ORDER BY founder_id, created_at DESC
  ), evidence AS (
    SELECT sprint.id AS sprint_id,
      count(DISTINCT scoped.contact_id)::integer AS attached,
      count(*) FILTER (WHERE event.event_type='outreach_sent')::integer AS sent,
      count(*) FILTER (WHERE event.event_type='interview_completed')::integer AS conversations,
      count(*) FILTER (WHERE event.event_type='commitment_received')::integer AS commitments,
      count(*) FILTER (WHERE event.event_type='payment_received')::integer AS payments,
      min(event.occurred_at) FILTER (WHERE event.event_type='outreach_sent') AS first_outreach_at,
      min(event.occurred_at) FILTER (WHERE event.event_type='interview_completed') AS first_conversation_at
    FROM public.first_customer_sprints sprint
    LEFT JOIN public.first_customer_sprint_contacts scoped ON scoped.sprint_id=sprint.id
    LEFT JOIN public.customer_evidence_events event ON event.user_id=sprint.founder_id
      AND event.contact_id=scoped.contact_id AND event.metadata->>'sprintId'=sprint.id::text
    GROUP BY sprint.id
  ), founder_rollup AS (
    SELECT sprint.founder_id,
      max(COALESCE(evidence.attached,0))::integer AS attached,
      max(COALESCE(evidence.sent,0))::integer AS sent,
      max(COALESCE(evidence.conversations,0))::integer AS conversations,
      max(COALESCE(evidence.commitments,0))::integer AS commitments,
      max(COALESCE(evidence.payments,0))::integer AS payments,
      bool_or(sprint.discovery_call_id IS NOT NULL) AS mentor_call_booked,
      bool_or(sprint.mentor_checkpoint_completed_at IS NOT NULL) AS mentor_checkpoint_completed,
      bool_or(sprint.status='completed') AS completed,
      bool_or(sprint.review_submitted_at IS NOT NULL) AS reviewed,
      bool_or(COALESCE(evidence.conversations,0)>=3 OR COALESCE(evidence.commitments,0)>0 OR COALESCE(evidence.payments,0)>0) AS completion_outcome
    FROM public.first_customer_sprints sprint
    LEFT JOIN evidence ON evidence.sprint_id=sprint.id
    GROUP BY sprint.founder_id
  ), cohort AS (
    SELECT application.*, users.email, sprint.id AS sprint_id, sprint.status AS sprint_status,
      sprint.created_at AS sprint_started_at, sprint.discovery_call_id,
      sprint.mentor_checkpoint_completed_at, sprint.completed_at, sprint.final_decision,
      sprint.founder_value_score, sprint.primary_value, sprint.primary_friction,
      sprint.would_recommend, sprint.review_submitted_at,
      COALESCE(rollup.attached,0) AS attached,
      COALESCE(rollup.sent,0) AS sent,
      COALESCE(rollup.conversations,0) AS conversations,
      COALESCE(rollup.commitments,0) AS commitments,
      COALESCE(rollup.payments,0) AS payments,
      COALESCE(rollup.mentor_call_booked,false) AS mentor_call_booked,
      COALESCE(rollup.mentor_checkpoint_completed,false) AS mentor_checkpoint_completed,
      COALESCE(rollup.completed,false) AS completed,
      COALESCE(rollup.reviewed,false) AS reviewed,
      COALESCE(rollup.completion_outcome,false) AS completion_outcome,
      evidence.first_outreach_at, evidence.first_conversation_at,
      EXISTS (SELECT 1 FROM public.credit_transactions tx
        WHERE tx.user_id=application.founder_id AND tx.tx_type='purchase'
          AND tx.metadata->>'purchaseSource'='first_customer_sprint') AS paid_continuation,
      (SELECT count(*)::integer FROM public.referrals referral
        WHERE referral.referrer_user_id=application.founder_id AND referral.status='verified'
          AND referral.created_at>=application.submitted_at) AS verified_referrals
    FROM public.first_customer_sprint_applications application
    JOIN auth.users users ON users.id=application.founder_id
    LEFT JOIN latest_sprint sprint ON sprint.founder_id=application.founder_id
    LEFT JOIN evidence ON evidence.sprint_id=sprint.id
    LEFT JOIN founder_rollup rollup ON rollup.founder_id=application.founder_id
  )
  SELECT jsonb_build_object(
    'version',1,'generatedAt',now(),
    'summary',jsonb_build_object(
      'applications',count(*)::integer,
      'qualifiedApplications',count(*) FILTER (WHERE qualified)::integer,
      'mentorApplications',count(*) FILTER (WHERE acquisition_source='mentor_referral')::integer,
      'publicApplications',count(*) FILTER (WHERE acquisition_source<>'mentor_referral')::integer,
      'mentorInvited',count(*) FILTER (WHERE acquisition_source='mentor_referral' AND status='invited')::integer,
      'publicInvited',count(*) FILTER (WHERE acquisition_source<>'mentor_referral' AND status='invited')::integer,
      'invited',count(*) FILTER (WHERE status='invited')::integer,
      'started',count(*) FILTER (WHERE sprint_id IS NOT NULL)::integer,
      'tenProspects',count(*) FILTER (WHERE attached>=10)::integer,
      'tenMessages',count(*) FILTER (WHERE sent>=10)::integer,
      'mentorCallsBooked',count(*) FILTER (WHERE mentor_call_booked)::integer,
      'mentorCheckpoints',count(*) FILTER (WHERE mentor_checkpoint_completed)::integer,
      'firstConversations',count(*) FILTER (WHERE conversations>=1)::integer,
      'completionOutcomes',count(*) FILTER (WHERE completion_outcome)::integer,
      'completed',count(*) FILTER (WHERE completed)::integer,
      'reviews',count(*) FILTER (WHERE reviewed)::integer,
      'paidContinuations',count(*) FILTER (WHERE paid_continuation)::integer,
      'verifiedReferrals',COALESCE(sum(verified_referrals),0)::integer
    ),
    'applications',COALESCE(jsonb_agg(jsonb_build_object(
      'id',id,'founderId',founder_id,'email',email,'status',status,'qualified',qualified,
      'qualificationReasons',qualification_reasons,'source',acquisition_source,
      'referringMentorId',referring_mentor_id,'productSummary',product_summary,'productUrl',product_url,
      'customerCount',customer_count,'annualCustomerValueUsd',estimated_annual_customer_value_usd,
      'weeklyCapacityHours',weekly_capacity_hours,'recentOutreach',recent_outreach,
      'primaryBlocker',primary_blocker,'submittedAt',submitted_at,'sprintId',sprint_id,
      'sprintStatus',sprint_status,'attached',attached,'sent',sent,'conversations',conversations,
      'mentorCheckpointCompleted',mentor_checkpoint_completed,
      'completedAt',completed_at,'finalDecision',final_decision,'valueScore',founder_value_score,
      'primaryValue',primary_value,'primaryFriction',primary_friction,
      'wouldRecommend',would_recommend,'paidContinuation',paid_continuation,
      'verifiedReferrals',verified_referrals
    ) ORDER BY submitted_at DESC),'[]'::jsonb)
  ) INTO v_result FROM cohort;
  RETURN v_result;
END;
$$;

-- A second sprint is unlocked only by an attributed purchase made after the
-- founder reviewed the latest completed sprint. The first invited sprint remains free.
CREATE OR REPLACE FUNCTION public.start_first_customer_sprint_v1(
  p_offer text,
  p_target_segment text,
  p_problem_hypothesis text,
  p_proof_url text DEFAULT NULL,
  p_proof_description text DEFAULT NULL,
  p_estimated_customer_value_usd numeric DEFAULT NULL,
  p_weekly_capacity_hours numeric DEFAULT NULL,
  p_mentor_decision_question text DEFAULT NULL
)
RETURNS public.first_customer_sprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_founder uuid := auth.uid();
  v_state public.founder_cycle_state%ROWTYPE;
  v_sprint public.first_customer_sprints%ROWTYPE;
  v_previous public.first_customer_sprints%ROWTYPE;
  v_continuation_from uuid := NULL;
  v_variants jsonb;
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_state FROM public.founder_cycle_state WHERE user_id = v_founder;
  IF NOT FOUND OR NOT COALESCE(v_state.beta_cohort, false) THEN RAISE EXCEPTION 'First Customer Sprint is invite-only' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_sprint FROM public.first_customer_sprints
    WHERE founder_id=v_founder AND status IN ('draft','active','paused') ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN v_sprint; END IF;

  SELECT * INTO v_previous FROM public.first_customer_sprints
    WHERE founder_id=v_founder AND status='completed' ORDER BY completed_at DESC NULLS LAST, created_at DESC LIMIT 1;
  IF FOUND THEN
    IF v_previous.continuation_from_sprint_id IS NOT NULL THEN
      RAISE EXCEPTION 'The demand-validation pilot includes one paid continuation only';
    END IF;
    IF v_previous.review_submitted_at IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.credit_transactions tx
      WHERE tx.user_id=v_founder AND tx.tx_type='purchase'
        AND tx.metadata->>'purchaseSource'='first_customer_sprint'
        AND tx.metadata->>'purchaseContextId'=v_previous.id::text
    ) THEN RAISE EXCEPTION 'Review the completed sprint and purchase the continuation before starting another'; END IF;
    v_continuation_from := v_previous.id;
  END IF;

  IF length(trim(COALESCE(p_offer,'')))<3 OR length(trim(COALESCE(p_target_segment,'')))<3
    OR length(trim(COALESCE(p_problem_hypothesis,'')))<3
    OR (length(trim(COALESCE(p_proof_url,'')))=0 AND length(trim(COALESCE(p_proof_description,'')))<3)
    OR COALESCE(p_estimated_customer_value_usd,0)<=0 OR COALESCE(p_weekly_capacity_hours,0)<2 THEN
    RAISE EXCEPTION 'Complete the required sprint intake fields';
  END IF;
  v_variants := jsonb_build_array(
    jsonb_build_object('key','discovery','label','Discovery-led','body','Hi {{first_name}}, I am researching how '||trim(p_target_segment)||' handle '||trim(p_problem_hypothesis)||'. Would you be open to a 20-minute conversation? I am looking to learn, not pitch.'),
    jsonb_build_object('key','problem','label','Problem-led','body','Hi {{first_name}}, I help '||trim(p_target_segment)||' address '||trim(p_problem_hypothesis)||'. Is this a priority for you right now? I would value 20 minutes to compare notes.'),
    jsonb_build_object('key','offer','label','Offer-led','body','Hi {{first_name}}, I am testing '||trim(p_offer)||' for '||trim(p_target_segment)||'. Would a short conversation be useful to see whether it fits how you work today?')
  );
  BEGIN
    INSERT INTO public.first_customer_sprints (
      founder_id,status,starts_at,ends_at,business_model_snapshot,customer_count_snapshot,
      primary_goal_snapshot,offer,target_segment,problem_hypothesis,proof_url,proof_description,
      estimated_customer_value_usd,weekly_capacity_hours,mentor_decision_question,message_variants,
      message_generation_count,continuation_from_sprint_id
    ) VALUES (
      v_founder,'active',now(),now()+interval '30 days',v_state.business_model,v_state.customer_count,
      v_state.primary_goal,trim(p_offer),trim(p_target_segment),trim(p_problem_hypothesis),
      NULLIF(trim(COALESCE(p_proof_url,'')),''),NULLIF(trim(COALESCE(p_proof_description,'')),''),
      p_estimated_customer_value_usd,p_weekly_capacity_hours,NULLIF(trim(COALESCE(p_mentor_decision_question,'')),''),
      v_variants,0,v_continuation_from
    ) RETURNING * INTO v_sprint;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_sprint FROM public.first_customer_sprints
      WHERE founder_id=v_founder AND status IN ('draft','active','paused') ORDER BY created_at DESC LIMIT 1;
  END;
  RETURN v_sprint;
END;
$$;

REVOKE ALL ON TABLE public.first_customer_sprint_applications FROM anon;
GRANT SELECT ON TABLE public.first_customer_sprint_applications TO authenticated;

REVOKE ALL ON FUNCTION public.submit_first_customer_sprint_application_v1(text,boolean,boolean,integer,numeric,numeric,boolean,text,text,text,text,text,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_first_customer_sprint_application_v1() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_first_customer_sprint_application_v1(uuid,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_first_customer_sprint_review_v1(uuid,integer,text,text,boolean,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_first_customer_sprint_continuation_v1(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_first_customer_sprint_cohort_admin_v1() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_first_customer_sprint_application_v1(text,boolean,boolean,integer,numeric,numeric,boolean,text,text,text,text,text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_first_customer_sprint_application_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_first_customer_sprint_application_v1(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_first_customer_sprint_review_v1(uuid,integer,text,text,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_first_customer_sprint_continuation_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_first_customer_sprint_cohort_admin_v1() TO authenticated;

COMMENT ON TABLE public.first_customer_sprint_applications IS 'Qualified mixed-cohort applications for the invite-only First Customer Sprint.';
COMMENT ON COLUMN public.first_customer_sprints.review_note IS 'Founder exit feedback; never include in analytics or mentor briefs.';
