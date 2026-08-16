-- Retire the standalone $299 First Customer Sprint service offer.
-- The sprint remains a capacity-screened, invite-based product workflow.
-- Existing subscriptions and project packs are unchanged.

DO $$
BEGIN
  IF to_regclass('public.first_customer_sprint_service_purchases') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.first_customer_sprint_service_purchases) THEN
      RAISE EXCEPTION 'Cannot retire the sprint service offer while purchase records exist';
    END IF;
  END IF;
  IF to_regclass('public.first_customer_sprint_service_credits') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.first_customer_sprint_service_credits) THEN
      RAISE EXCEPTION 'Cannot retire the sprint service offer while service-credit records exist';
    END IF;
  END IF;
END;
$$;

-- An accepted application now unlocks the sprint directly. Preserve any
-- invitation that may have been created while the paid path was deployed.
DO $$
DECLARE
  v_founder uuid;
BEGIN
  FOR v_founder IN
    SELECT DISTINCT founder_id
    FROM public.first_customer_sprint_applications
    WHERE status = 'invited'
  LOOP
    PERFORM public.set_founder_cycle_beta_cohort_v1(v_founder, true);
  END LOOP;
END;
$$;

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
  v_source text := lower(trim(COALESCE(p_acquisition_source, 'other')));
  v_mentor_id uuid := NULL;
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_product_stage NOT IN ('idea', 'concept_demo', 'working_product') THEN RAISE EXCEPTION 'Select a valid product stage'; END IF;
  IF p_target_outcome NOT IN ('qualified_conversations', 'commitment', 'payment') THEN RAISE EXCEPTION 'Select a valid target outcome'; END IF;
  IF p_primary_blocker NOT IN ('prospect_list', 'messaging', 'confidence', 'accountability', 'replies', 'conversion', 'time') THEN RAISE EXCEPTION 'Select a valid blocker'; END IF;
  IF COALESCE(p_customer_count, -1) NOT BETWEEN 0 AND 999
    OR COALESCE(p_weekly_capacity_hours, -1) NOT BETWEEN 0 AND 168
    OR length(trim(COALESCE(p_product_summary, ''))) < 10
  THEN RAISE EXCEPTION 'Complete the required application fields'; END IF;

  IF v_source NOT IN ('mentor_referral', 'homepage', 'current_user', 'direct', 'other') THEN v_source := 'other'; END IF;
  IF v_source = 'mentor_referral' THEN
    SELECT mentor.id INTO v_mentor_id
    FROM public.mentors mentor
    JOIN public.referral_codes code ON code.user_id = mentor.user_id
    WHERE mentor.id = p_referring_mentor_id
      AND code.code = trim(COALESCE(p_referral_code, ''))
      AND COALESCE(mentor.is_active, false)
    LIMIT 1;
    IF NOT FOUND THEN v_source := 'other'; END IF;
  END IF;

  IF NOT COALESCE(p_founder_owns_sales, false) THEN
    v_reasons := array_append(v_reasons, 'The participating founder must personally own sales.');
  END IF;
  IF p_customer_count > 3 THEN
    v_reasons := array_append(v_reasons, 'The sprint is for B2B SaaS founders with 0-3 paying customers.');
  END IF;
  IF p_weekly_capacity_hours < 2 THEN
    v_reasons := array_append(v_reasons, 'At least two weekly execution hours are required.');
  END IF;

  INSERT INTO public.first_customer_sprint_applications (
    founder_id, status, business_model, founder_owns_sales, has_sellable_product,
    customer_count, estimated_annual_customer_value_usd, weekly_capacity_hours,
    can_name_ten_prospects, recent_outreach, primary_blocker, product_url,
    product_summary, acquisition_source, referring_mentor_id, qualified,
    qualification_reasons, product_stage, target_outcome, submitted_at, updated_at
  ) VALUES (
    v_founder, 'submitted', 'b2b_saas', p_founder_owns_sales,
    p_product_stage = 'working_product', p_customer_count,
    CASE WHEN COALESCE(p_estimated_annual_customer_value_usd, 0) > 0
      THEN p_estimated_annual_customer_value_usd ELSE NULL END,
    p_weekly_capacity_hours, false, 'never', p_primary_blocker,
    NULLIF(trim(COALESCE(p_product_url, '')), ''), trim(p_product_summary),
    v_source, v_mentor_id, cardinality(v_reasons) = 0, v_reasons,
    p_product_stage, p_target_outcome, now(), now()
  ) ON CONFLICT (founder_id) DO UPDATE SET
    status = 'submitted',
    founder_owns_sales = EXCLUDED.founder_owns_sales,
    has_sellable_product = EXCLUDED.has_sellable_product,
    customer_count = EXCLUDED.customer_count,
    estimated_annual_customer_value_usd = EXCLUDED.estimated_annual_customer_value_usd,
    weekly_capacity_hours = EXCLUDED.weekly_capacity_hours,
    primary_blocker = EXCLUDED.primary_blocker,
    product_url = EXCLUDED.product_url,
    product_summary = EXCLUDED.product_summary,
    acquisition_source = EXCLUDED.acquisition_source,
    referring_mentor_id = EXCLUDED.referring_mentor_id,
    qualified = EXCLUDED.qualified,
    qualification_reasons = EXCLUDED.qualification_reasons,
    product_stage = EXCLUDED.product_stage,
    target_outcome = EXCLUDED.target_outcome,
    reviewed_at = NULL,
    invited_at = NULL,
    admin_override_reason = NULL,
    submitted_at = now(),
    updated_at = now()
  WHERE first_customer_sprint_applications.status <> 'invited'
  RETURNING * INTO v_application;

  IF NOT FOUND THEN
    SELECT * INTO v_application
    FROM public.first_customer_sprint_applications
    WHERE founder_id = v_founder;
  END IF;
  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_first_customer_sprint_application_v2(
  p_application_id uuid,
  p_decision text,
  p_override_reason text DEFAULT NULL
) RETURNS public.first_customer_sprint_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_application public.first_customer_sprint_applications%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('invited', 'declined') THEN RAISE EXCEPTION 'Select invited or declined'; END IF;

  SELECT * INTO v_application
  FROM public.first_customer_sprint_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF p_decision = 'invited'
    AND NOT v_application.qualified
    AND length(trim(COALESCE(p_override_reason, ''))) < 5
  THEN RAISE EXCEPTION 'A reason is required to override qualification'; END IF;

  UPDATE public.first_customer_sprint_applications SET
    status = p_decision,
    admin_override_reason = CASE
      WHEN p_decision = 'invited' AND NOT qualified THEN trim(p_override_reason)
      ELSE NULL
    END,
    reviewed_at = now(),
    invited_at = CASE WHEN p_decision = 'invited' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  IF p_decision = 'invited' THEN
    PERFORM public.set_founder_cycle_beta_cohort_v1(v_application.founder_id, true);
  END IF;
  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_first_customer_sprint_v2(
  p_offer text,
  p_target_segment text,
  p_problem_hypothesis text,
  p_proof_url text DEFAULT NULL,
  p_proof_description text DEFAULT NULL,
  p_estimated_customer_value_usd numeric DEFAULT NULL,
  p_weekly_capacity_hours numeric DEFAULT NULL,
  p_mentor_decision_question text DEFAULT NULL
) RETURNS public.first_customer_sprints
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_founder uuid := auth.uid();
  v_state public.founder_cycle_state%ROWTYPE;
  v_sprint public.first_customer_sprints%ROWTYPE;
  v_previous public.first_customer_sprints%ROWTYPE;
  v_continuation_from uuid := NULL;
  v_target_outcome text := 'qualified_conversations';
  v_variants jsonb;
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_state FROM public.founder_cycle_state WHERE user_id = v_founder;
  IF NOT FOUND OR NOT COALESCE(v_state.beta_cohort, false) THEN
    RAISE EXCEPTION 'First Customer Sprint enrollment is required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_sprint
  FROM public.first_customer_sprints
  WHERE founder_id = v_founder AND status IN ('draft', 'active', 'paused')
  ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN v_sprint; END IF;

  SELECT * INTO v_previous
  FROM public.first_customer_sprints
  WHERE founder_id = v_founder AND status = 'completed'
  ORDER BY completed_at DESC NULLS LAST, created_at DESC LIMIT 1;
  IF FOUND THEN
    IF v_previous.continuation_from_sprint_id IS NOT NULL THEN
      RAISE EXCEPTION 'This pilot includes one continuation only';
    END IF;
    IF v_previous.review_submitted_at IS NULL THEN
      RAISE EXCEPTION 'Complete the final review before starting a continuation';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.credit_transactions tx
      WHERE tx.user_id = v_founder
        AND tx.tx_type = 'purchase'
        AND tx.metadata->>'purchaseSource' = 'first_customer_sprint'
        AND tx.metadata->>'purchaseContextId' = v_previous.id::text
    ) THEN
      RAISE EXCEPTION 'An attributed Experiment Pack purchase is required for the continuation';
    END IF;
    v_continuation_from := v_previous.id;
  END IF;

  IF length(trim(COALESCE(p_offer, ''))) < 3
    OR length(trim(COALESCE(p_target_segment, ''))) < 3
    OR length(trim(COALESCE(p_problem_hypothesis, ''))) < 3
    OR COALESCE(p_weekly_capacity_hours, 0) < 2
  THEN RAISE EXCEPTION 'Complete the offer, target buyer, problem hypothesis, and weekly capacity'; END IF;

  SELECT target_outcome INTO v_target_outcome
  FROM public.first_customer_sprint_applications
  WHERE founder_id = v_founder AND status = 'invited'
  ORDER BY invited_at DESC NULLS LAST, submitted_at DESC NULLS LAST
  LIMIT 1;
  v_target_outcome := COALESCE(v_target_outcome, 'qualified_conversations');

  v_variants := jsonb_build_array(
    jsonb_build_object('key', 'discovery', 'label', 'Discovery-led', 'body', 'Hi {{first_name}}, I am researching how ' || trim(p_target_segment) || ' handle ' || trim(p_problem_hypothesis) || '. Would you be open to a 20-minute conversation? I am looking to learn, not pitch.'),
    jsonb_build_object('key', 'problem', 'label', 'Problem-led', 'body', 'Hi {{first_name}}, I help ' || trim(p_target_segment) || ' address ' || trim(p_problem_hypothesis) || '. Is this a priority for you right now? I would value 20 minutes to compare notes.'),
    jsonb_build_object('key', 'offer', 'label', 'Offer-led', 'body', 'Hi {{first_name}}, I am testing ' || trim(p_offer) || ' for ' || trim(p_target_segment) || '. Would a short conversation be useful to see whether it fits how you work today?')
  );

  INSERT INTO public.first_customer_sprints (
    founder_id, status, starts_at, ends_at, business_model_snapshot,
    customer_count_snapshot, primary_goal_snapshot, offer, target_segment,
    problem_hypothesis, proof_url, proof_description,
    estimated_customer_value_usd, weekly_capacity_hours,
    mentor_decision_question, message_variants, message_generation_count,
    continuation_from_sprint_id, target_outcome
  ) VALUES (
    v_founder, 'active', now(), now() + interval '30 days', v_state.business_model,
    v_state.customer_count, v_state.primary_goal, trim(p_offer), trim(p_target_segment),
    trim(p_problem_hypothesis), NULLIF(trim(COALESCE(p_proof_url, '')), ''),
    NULLIF(trim(COALESCE(p_proof_description, '')), ''),
    CASE WHEN COALESCE(p_estimated_customer_value_usd, 0) > 0
      THEN p_estimated_customer_value_usd ELSE NULL END,
    p_weekly_capacity_hours,
    NULLIF(trim(COALESCE(p_mentor_decision_question, '')), ''),
    v_variants, 0, v_continuation_from, v_target_outcome
  ) RETURNING * INTO v_sprint;
  RETURN v_sprint;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_first_customer_sprint_continuation_v1(p_sprint_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN sprint.id IS NULL THEN jsonb_build_object('paid', false)
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
    ), jsonb_build_object('paid', false))
  END
  FROM (
    SELECT id
    FROM public.first_customer_sprints
    WHERE id = p_sprint_id AND founder_id = auth.uid()
  ) sprint;
$$;

DROP FUNCTION IF EXISTS public.fulfill_first_customer_sprint_offer_v1(uuid, uuid, text, text, integer);
DROP FUNCTION IF EXISTS public.refund_first_customer_sprint_offer_v1(text);
DROP FUNCTION IF EXISTS public.evaluate_first_customer_sprint_service_credit_v1(uuid);

DROP TABLE IF EXISTS public.first_customer_sprint_service_credits;
DROP TABLE IF EXISTS public.first_customer_sprint_service_purchases;

ALTER TABLE public.first_customer_sprint_applications
  DROP CONSTRAINT IF EXISTS first_customer_sprint_application_offer_check,
  DROP CONSTRAINT IF EXISTS first_customer_sprint_application_payment_check,
  DROP COLUMN IF EXISTS offer_version,
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS amount_paid_cents,
  DROP COLUMN IF EXISTS paid_at;

ALTER TABLE public.first_customer_sprints
  DROP CONSTRAINT IF EXISTS first_customer_sprints_offer_version_check,
  DROP COLUMN IF EXISTS offer_version;

REVOKE ALL ON FUNCTION public.submit_first_customer_sprint_application_v2(boolean, integer, numeric, text, text, text, text, numeric, text, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_first_customer_sprint_application_v2(boolean, integer, numeric, text, text, text, text, numeric, text, text, uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_first_customer_sprint_application_v2(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_first_customer_sprint_application_v2(uuid, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.start_first_customer_sprint_v2(text, text, text, text, text, numeric, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_first_customer_sprint_v2(text, text, text, text, text, numeric, numeric, text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_first_customer_sprint_continuation_v1(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_first_customer_sprint_continuation_v1(uuid) TO authenticated;

COMMENT ON FUNCTION public.start_first_customer_sprint_v2(text, text, text, text, text, numeric, numeric, text)
  IS 'Starts the invite-based First Customer Sprint. No separate service-offer payment is accepted.';
