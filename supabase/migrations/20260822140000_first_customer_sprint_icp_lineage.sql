-- First Customer Sprint: record which ICP draft seeded the sprint.
--
-- The sprint intake is now prefilled from a saved ICP draft (segment, offer,
-- problem hypothesis, top risk, pricing anchor). Without this column there is no
-- way to answer the question the pilot exists to answer: does a sprint that
-- started from real ICP evidence reach qualified conversations more often than
-- one started from a blank form? The seeding is otherwise invisible after save,
-- because the intake columns look identical either way.
--
-- Additive and nullable throughout. Sprints created before this, and sprints a
-- founder fills in by hand, keep a NULL and are the control group.

ALTER TABLE public.first_customer_sprints
  ADD COLUMN IF NOT EXISTS icp_analysis_id uuid;

COMMENT ON COLUMN public.first_customer_sprints.icp_analysis_id IS
  'The icp_analysis_results row whose draft seeded this sprint intake. NULL when the founder filled the intake unaided.';

-- No FK to icp_analysis_results: deleting an ICP draft must never cascade into a
-- live sprint, and the sprint keeps its own copies of the seeded text anyway.
CREATE INDEX IF NOT EXISTS first_customer_sprints_icp_analysis_idx
  ON public.first_customer_sprints(icp_analysis_id)
  WHERE icp_analysis_id IS NOT NULL;

-- Adding a parameter creates a NEW function signature rather than replacing the
-- old one, so the previous eight-argument version is dropped explicitly. Leaving
-- it in place would keep an un-permissioned overload callable and let PostgREST
-- resolve to whichever one it matched first.
DROP FUNCTION IF EXISTS public.start_first_customer_sprint_v1(text,text,text,text,text,numeric,numeric,text);

CREATE OR REPLACE FUNCTION public.start_first_customer_sprint_v1(
  p_offer text,
  p_target_segment text,
  p_problem_hypothesis text,
  p_proof_url text DEFAULT NULL,
  p_proof_description text DEFAULT NULL,
  p_estimated_customer_value_usd numeric DEFAULT NULL,
  p_weekly_capacity_hours numeric DEFAULT NULL,
  p_mentor_decision_question text DEFAULT NULL,
  p_icp_analysis_id uuid DEFAULT NULL
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
  v_variants jsonb;
  v_icp uuid;
BEGIN
  IF v_founder IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_state FROM public.founder_cycle_state WHERE user_id = v_founder;
  IF NOT FOUND OR NOT COALESCE(v_state.beta_cohort, false) THEN
    RAISE EXCEPTION 'First Customer Sprint is invite-only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_sprint FROM public.first_customer_sprints
    WHERE founder_id = v_founder AND status IN ('draft', 'active', 'paused')
    ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN v_sprint; END IF;

  IF length(trim(COALESCE(p_offer, ''))) < 3
    OR length(trim(COALESCE(p_target_segment, ''))) < 3
    OR length(trim(COALESCE(p_problem_hypothesis, ''))) < 3
    OR (length(trim(COALESCE(p_proof_url, ''))) = 0 AND length(trim(COALESCE(p_proof_description, ''))) < 3)
    OR COALESCE(p_estimated_customer_value_usd, 0) <= 0
    OR COALESCE(p_weekly_capacity_hours, 0) < 2 THEN
    RAISE EXCEPTION 'Complete the required sprint intake fields';
  END IF;

  -- Only attribute a draft the caller actually owns. The id arrives from the
  -- client as a URL parameter, so an unverified value would let one account
  -- record another account's draft as the source of its sprint.
  SELECT id INTO v_icp FROM public.icp_analysis_results
    WHERE id = p_icp_analysis_id AND user_id = v_founder;

  v_variants := jsonb_build_array(
    jsonb_build_object('key','discovery','label','Discovery-led','body',
      'Hi {{first_name}}, I am researching how ' || trim(p_target_segment) || ' handle ' || trim(p_problem_hypothesis) || '. Would you be open to a 20-minute conversation? I am looking to learn, not pitch.'),
    jsonb_build_object('key','problem','label','Problem-led','body',
      'Hi {{first_name}}, I help ' || trim(p_target_segment) || ' address ' || trim(p_problem_hypothesis) || '. Is this a priority for you right now? I would value 20 minutes to compare notes.'),
    jsonb_build_object('key','offer','label','Offer-led','body',
      'Hi {{first_name}}, I am testing ' || trim(p_offer) || ' for ' || trim(p_target_segment) || '. Would a short conversation be useful to see whether it fits how you work today?')
  );

  BEGIN
    INSERT INTO public.first_customer_sprints (
      founder_id, status, starts_at, ends_at, business_model_snapshot,
      customer_count_snapshot, primary_goal_snapshot, offer, target_segment,
      problem_hypothesis, proof_url, proof_description, estimated_customer_value_usd,
      weekly_capacity_hours, mentor_decision_question, message_variants, message_generation_count,
      icp_analysis_id
    ) VALUES (
      v_founder, 'active', now(), now() + interval '30 days', v_state.business_model,
      v_state.customer_count, v_state.primary_goal, trim(p_offer), trim(p_target_segment),
      trim(p_problem_hypothesis), NULLIF(trim(COALESCE(p_proof_url,'')),''),
      NULLIF(trim(COALESCE(p_proof_description,'')),''), p_estimated_customer_value_usd,
      p_weekly_capacity_hours, NULLIF(trim(COALESCE(p_mentor_decision_question,'')),''),
      v_variants, 0, v_icp
    ) RETURNING * INTO v_sprint;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_sprint FROM public.first_customer_sprints
      WHERE founder_id=v_founder AND status IN ('draft','active','paused')
      ORDER BY created_at DESC LIMIT 1;
  END;
  RETURN v_sprint;
END;
$$;

REVOKE ALL ON FUNCTION public.start_first_customer_sprint_v1(text,text,text,text,text,numeric,numeric,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_first_customer_sprint_v1(text,text,text,text,text,numeric,numeric,text,uuid) TO authenticated;
