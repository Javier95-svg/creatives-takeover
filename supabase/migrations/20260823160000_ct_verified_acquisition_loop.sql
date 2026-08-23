-- CT Verified acquisition loop.
-- Journey outcomes continue to describe artifact readiness. These tables
-- separately preserve pre-registered market experiments, metric-level evidence,
-- decisions, and claims whose evidence has actually been corroborated.

CREATE TABLE IF NOT EXISTS public.market_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_experiment_id uuid REFERENCES public.market_experiments(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  execution_loop text NOT NULL DEFAULT 'SELL' CHECK (execution_loop IN ('PROVE', 'SELL', 'GROW')),
  status text NOT NULL DEFAULT 'preregistered' CHECK (status IN ('draft', 'preregistered', 'running', 'evaluated', 'archived')),
  hypothesis text NOT NULL,
  audience text NOT NULL,
  problem text,
  buying_trigger text,
  offer text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL,
  asset_type text,
  asset_id text,
  source_demo_id uuid REFERENCES public.demo_studio_demos(id) ON DELETE SET NULL,
  cta text,
  target_metric text NOT NULL,
  target_operator text NOT NULL DEFAULT 'gte' CHECK (target_operator IN ('gt', 'gte', 'lt', 'lte')),
  target_value numeric(14,2) NOT NULL CHECK (target_value >= 0),
  minimum_sample_size integer NOT NULL CHECK (minimum_sample_size > 0),
  observation_window_days integer NOT NULL DEFAULT 7 CHECK (observation_window_days BETWEEN 1 AND 365),
  kill_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_packet jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_outcome_versions jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_icp_analysis_id uuid,
  source_gtm_plan_id uuid REFERENCES public.gtm_plans(id) ON DELETE SET NULL,
  source_gtm_play_id uuid REFERENCES public.gtm_plays(id) ON DELETE SET NULL,
  source_traction_sprint_id uuid REFERENCES public.traction_engine_sprints(id) ON DELETE SET NULL,
  source_first_customer_sprint_id uuid REFERENCES public.first_customer_sprints(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  preregistered_at timestamptz,
  started_at timestamptz,
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  UNIQUE (parent_experiment_id),
  CHECK (octet_length(hypothesis) <= 4000),
  CHECK (octet_length(audience) <= 2000),
  CHECK (octet_length(offer) <= 3000),
  CHECK (octet_length(message) <= 8000),
  CHECK (octet_length(action_packet::text) <= 50000),
  CHECK (octet_length(source_outcome_versions::text) <= 30000)
);

CREATE INDEX IF NOT EXISTS market_experiments_user_status_idx
  ON public.market_experiments(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS market_experiments_gtm_lineage_idx
  ON public.market_experiments(user_id, source_gtm_plan_id, source_gtm_play_id, version DESC);
CREATE INDEX IF NOT EXISTS market_experiments_demo_idx
  ON public.market_experiments(source_demo_id, status)
  WHERE source_demo_id IS NOT NULL AND status IN ('preregistered', 'running');

CREATE TABLE IF NOT EXISTS public.market_experiment_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL REFERENCES public.market_experiments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric text NOT NULL,
  value numeric(14,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  denominator numeric(14,2) CHECK (denominator IS NULL OR denominator >= 0),
  source_type text NOT NULL,
  source_id text,
  source_event_ids text[] NOT NULL DEFAULT '{}'::text[],
  verification_mode text NOT NULL DEFAULT 'founder_reported'
    CHECK (verification_mode IN ('founder_reported', 'corroborated', 'platform_verified', 'reviewer_verified')),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, idempotency_key),
  CHECK (octet_length(provenance::text) <= 20000)
);

CREATE INDEX IF NOT EXISTS market_observations_experiment_metric_idx
  ON public.market_experiment_observations(experiment_id, metric, captured_at DESC);

CREATE TABLE IF NOT EXISTS public.market_experiment_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id uuid NOT NULL UNIQUE REFERENCES public.market_experiments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('double_down', 'iterate', 'narrow', 'pivot', 'kill')),
  result text NOT NULL CHECK (result IN ('passed', 'failed', 'inconclusive')),
  changed_variable text CHECK (changed_variable IS NULL OR changed_variable IN ('audience', 'problem', 'offer', 'message', 'channel', 'asset', 'cta', 'target')),
  rationale text NOT NULL,
  next_experiment_id uuid REFERENCES public.market_experiments(id) ON DELETE SET NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decision NOT IN ('iterate', 'narrow', 'pivot') OR changed_variable IS NOT NULL),
  CHECK (octet_length(rationale) BETWEEN 12 AND 5000)
);

CREATE TABLE IF NOT EXISTS public.verification_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experiment_id uuid REFERENCES public.market_experiments(id) ON DELETE SET NULL,
  source_tool text CHECK (source_tool IS NULL OR source_tool IN ('icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'traction_engine')),
  source_outcome_id uuid REFERENCES public.journey_outcomes(id) ON DELETE SET NULL,
  claim_type text NOT NULL CHECK (claim_type IN (
    'registered_hypothesis', 'published_proof', 'demand_test', 'acquisition_execution',
    'repeatable_channel', 'retention', 'revenue', 'first_customer'
  )),
  claim text NOT NULL,
  evidence_level text NOT NULL DEFAULT 'founder_reported'
    CHECK (evidence_level IN ('founder_reported', 'corroborated', 'ct_verified')),
  result text NOT NULL DEFAULT 'inconclusive' CHECK (result IN ('passed', 'failed', 'inconclusive')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired', 'legacy')),
  policy_version text NOT NULL DEFAULT 'ct_acquisition_v1',
  evidence_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  missing_evidence text[] NOT NULL DEFAULT '{}'::text[],
  next_action text,
  unlocked_benefit text CHECK (unlocked_benefit IS NULL OR unlocked_benefit IN ('mentor_checkpoint')),
  evaluation jsonb NOT NULL DEFAULT '{}'::jsonb,
  decided_at timestamptz,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (experiment_id, claim_type, policy_version),
  CHECK (octet_length(claim) <= 4000),
  CHECK (octet_length(evaluation::text) <= 30000)
);

CREATE INDEX IF NOT EXISTS verification_claims_user_history_idx
  ON public.verification_claims(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ct_access_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  benefit text NOT NULL CHECK (benefit IN ('mentor_checkpoint')),
  verification_claim_id uuid NOT NULL REFERENCES public.verification_claims(id) ON DELETE CASCADE,
  experiment_id uuid REFERENCES public.market_experiments(id) ON DELETE SET NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, benefit, verification_claim_id)
);

ALTER TABLE public.market_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_experiment_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_experiment_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct_access_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY market_experiments_owner_all ON public.market_experiments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY market_observations_owner_read ON public.market_experiment_observations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY market_observations_owner_report ON public.market_experiment_observations
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND verification_mode = 'founder_reported'
    AND EXISTS (
      SELECT 1 FROM public.market_experiments experiment
      WHERE experiment.id = experiment_id AND experiment.user_id = auth.uid()
    )
  );

CREATE POLICY market_decisions_owner_all ON public.market_experiment_decisions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.market_experiments experiment
      WHERE experiment.id = experiment_id AND experiment.user_id = auth.uid()
    )
  );

CREATE POLICY verification_claims_owner_read ON public.verification_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY ct_access_unlocks_owner_read ON public.ct_access_unlocks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Preserve old tool-level "verified" labels as explicitly legacy proof. They
-- are visible in the portable history but never inherit CT Verified status.
INSERT INTO public.verification_claims (
  user_id, source_tool, source_outcome_id, claim_type, claim, evidence_level,
  result, status, policy_version, missing_evidence, next_action, evaluation,
  decided_at
)
SELECT
  outcome.user_id,
  outcome.tool,
  outcome.id,
  CASE outcome.tool
    WHEN 'icp_builder' THEN 'registered_hypothesis'
    WHEN 'demo_studio' THEN 'published_proof'
    WHEN 'pmf_lab' THEN 'demand_test'
    WHEN 'mvp_builder' THEN 'published_proof'
    WHEN 'gtm_strategist' THEN 'acquisition_execution'
    WHEN 'traction_engine' THEN 'acquisition_execution'
    ELSE 'registered_hypothesis'
  END,
  format('Legacy %s outcome for %s.', outcome.tool, outcome.artifact_type),
  CASE WHEN outcome.verification_mode IN ('corroborated', 'platform_verified')
    THEN 'corroborated' ELSE 'founder_reported' END,
  'inconclusive', 'legacy', 'legacy_pre_ct_v1',
  ARRAY['This outcome predates claim-level CT verification'],
  'Run a pre-registered market experiment under the current verification policy.',
  jsonb_build_object(
    'legacyStatus', outcome.status,
    'legacyVerificationMode', outcome.verification_mode,
    'artifactType', outcome.artifact_type,
    'artifactId', outcome.artifact_id
  ),
  COALESCE(outcome.verified_at, outcome.updated_at)
FROM public.journey_outcomes outcome
WHERE outcome.status = 'verified'
  AND NOT EXISTS (
    SELECT 1 FROM public.verification_claims claim
    WHERE claim.source_outcome_id = outcome.id
      AND claim.policy_version = 'legacy_pre_ct_v1'
  );

CREATE OR REPLACE FUNCTION public.touch_ct_verified_record_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER market_experiments_touch
  BEFORE UPDATE ON public.market_experiments
  FOR EACH ROW EXECUTE FUNCTION public.touch_ct_verified_record_v1();
CREATE TRIGGER verification_claims_touch
  BEFORE UPDATE ON public.verification_claims
  FOR EACH ROW EXECUTE FUNCTION public.touch_ct_verified_record_v1();

-- Once an experiment is pre-registered, changing its causal inputs requires a
-- new version. Status and linkage timestamps remain mutable.
CREATE OR REPLACE FUNCTION public.protect_preregistered_market_experiment_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.preregistered_at IS NOT NULL AND (
    NEW.hypothesis IS DISTINCT FROM OLD.hypothesis
    OR NEW.audience IS DISTINCT FROM OLD.audience
    OR NEW.problem IS DISTINCT FROM OLD.problem
    OR NEW.buying_trigger IS DISTINCT FROM OLD.buying_trigger
    OR NEW.offer IS DISTINCT FROM OLD.offer
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.channel IS DISTINCT FROM OLD.channel
    OR NEW.source_demo_id IS DISTINCT FROM OLD.source_demo_id
    OR NEW.cta IS DISTINCT FROM OLD.cta
    OR NEW.target_metric IS DISTINCT FROM OLD.target_metric
    OR NEW.target_operator IS DISTINCT FROM OLD.target_operator
    OR NEW.target_value IS DISTINCT FROM OLD.target_value
    OR NEW.minimum_sample_size IS DISTINCT FROM OLD.minimum_sample_size
    OR NEW.observation_window_days IS DISTINCT FROM OLD.observation_window_days
    OR NEW.kill_rule IS DISTINCT FROM OLD.kill_rule
    OR NEW.source_outcome_versions IS DISTINCT FROM OLD.source_outcome_versions
  ) THEN
    RAISE EXCEPTION 'Pre-registered experiment inputs are immutable; create a new experiment version';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_preregistered_market_experiment
  BEFORE UPDATE ON public.market_experiments
  FOR EACH ROW EXECUTE FUNCTION public.protect_preregistered_market_experiment_v1();

-- Evaluate the claim independently from the founder's chosen decision. A failed
-- threshold can still be CT Verified when the underlying execution is trusted.
CREATE OR REPLACE FUNCTION public.evaluate_market_experiment_v1(p_experiment_id uuid)
RETURNS public.verification_claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_experiment public.market_experiments%ROWTYPE;
  v_claim public.verification_claims%ROWTYPE;
  v_evidence_ids uuid[];
  v_reported_sample numeric := 0;
  v_external_sample numeric := 0;
  v_sample numeric := 0;
  v_reported_result_value numeric := 0;
  v_external_result_value numeric := 0;
  v_result_value numeric := 0;
  v_has_any_external boolean := false;
  v_has_external_target boolean := false;
  v_has_external boolean := false;
  v_has_observation boolean := false;
  v_level text := 'founder_reported';
  v_result text := 'inconclusive';
  v_status text := 'pending';
  v_pass boolean := false;
BEGIN
  SELECT * INTO v_experiment FROM public.market_experiments
  WHERE id = p_experiment_id
    AND (user_id = auth.uid() OR auth.role() = 'service_role');
  IF NOT FOUND THEN RAISE EXCEPTION 'Experiment not found' USING ERRCODE = '42501'; END IF;

  SELECT
    COALESCE(array_agg(id ORDER BY captured_at), '{}'::uuid[]),
    GREATEST(
      COALESCE(sum(denominator), 0),
      COALESCE(sum(value) FILTER (WHERE metric = 'prospects'), 0),
      COALESCE(sum(value) FILTER (WHERE metric = 'sent'), 0),
      COALESCE(sum(value) FILTER (WHERE metric = 'delivered'), 0),
      COALESCE(sum(value) FILTER (WHERE metric = 'qualified_views'), 0)
    ),
    COALESCE(sum(CASE WHEN metric = v_experiment.target_metric THEN value ELSE 0 END), 0),
    GREATEST(
      COALESCE(sum(denominator) FILTER (WHERE verification_mode IN ('platform_verified', 'reviewer_verified')), 0),
      COALESCE(sum(value) FILTER (WHERE verification_mode IN ('platform_verified', 'reviewer_verified') AND metric = 'prospects'), 0),
      COALESCE(sum(value) FILTER (WHERE verification_mode IN ('platform_verified', 'reviewer_verified') AND metric = 'sent'), 0),
      COALESCE(sum(value) FILTER (WHERE verification_mode IN ('platform_verified', 'reviewer_verified') AND metric = 'delivered'), 0),
      COALESCE(sum(value) FILTER (WHERE verification_mode IN ('platform_verified', 'reviewer_verified') AND metric = 'qualified_views'), 0)
    ),
    COALESCE(sum(value) FILTER (
      WHERE verification_mode IN ('platform_verified', 'reviewer_verified')
        AND metric = v_experiment.target_metric
    ), 0),
    COALESCE(bool_or(verification_mode IN ('platform_verified', 'reviewer_verified')), false),
    COALESCE(bool_or(
      verification_mode IN ('platform_verified', 'reviewer_verified')
      AND metric = v_experiment.target_metric
    ), false),
    count(*) > 0
  INTO v_evidence_ids, v_reported_sample, v_reported_result_value,
    v_external_sample, v_external_result_value, v_has_any_external,
    v_has_external_target, v_has_observation
  FROM public.market_experiment_observations
  WHERE experiment_id = p_experiment_id;

  -- Once externally observed evidence exists, evaluate only the externally
  -- observed portion. This prevents a founder-reported numerator or denominator
  -- from inheriting verification from an unrelated Demo metric.
  v_sample := CASE WHEN v_external_sample > 0 THEN v_external_sample ELSE v_reported_sample END;
  v_result_value := CASE WHEN v_has_external_target THEN v_external_result_value ELSE v_reported_result_value END;
  v_has_external := v_external_sample > 0
    AND (v_has_external_target OR v_result_value = 0);

  IF v_has_any_external THEN v_level := 'corroborated'; END IF;
  IF v_sample >= v_experiment.minimum_sample_size THEN
    v_pass := CASE v_experiment.target_operator
      WHEN 'gt' THEN v_result_value > v_experiment.target_value
      WHEN 'gte' THEN v_result_value >= v_experiment.target_value
      WHEN 'lt' THEN v_result_value < v_experiment.target_value
      ELSE v_result_value <= v_experiment.target_value
    END;
    v_result := CASE WHEN v_pass THEN 'passed' ELSE 'failed' END;
    IF v_has_external THEN
      v_level := 'ct_verified';
      v_status := 'verified';
    END IF;
  END IF;

  INSERT INTO public.verification_claims (
    user_id, experiment_id, source_tool, claim_type, claim,
    evidence_level, result, status, policy_version, evidence_ids,
    missing_evidence, next_action, unlocked_benefit, evaluation,
    decided_at, verified_at
  ) VALUES (
    v_experiment.user_id, v_experiment.id, 'traction_engine',
    CASE WHEN v_experiment.execution_loop = 'PROVE' THEN 'demand_test' ELSE 'acquisition_execution' END,
    format('%s experiment for %s produced %s %s from a sample of %s.',
      v_experiment.channel, v_experiment.audience, v_result_value, v_experiment.target_metric, v_sample),
    v_level, v_result, v_status, 'ct_acquisition_v1', v_evidence_ids,
    CASE
      WHEN NOT v_has_observation THEN ARRAY['Record the result and its denominator']
      WHEN v_sample < v_experiment.minimum_sample_size THEN ARRAY[format('Reach the pre-registered sample of %s', v_experiment.minimum_sample_size)]
      WHEN v_external_sample <= 0 THEN ARRAY['Verify the experiment denominator with platform-recorded or reviewer evidence']
      WHEN NOT v_has_external_target AND v_result_value > 0 THEN ARRAY[format('Verify the reported %s result independently', v_experiment.target_metric)]
      WHEN NOT v_has_external THEN ARRAY['Add platform-recorded or reviewer-verified customer evidence']
      ELSE '{}'::text[]
    END,
    CASE
      WHEN v_status = 'verified' THEN 'Use the verified result to choose the next acquisition variable.'
      WHEN v_sample < v_experiment.minimum_sample_size THEN 'Continue the same experiment without changing its inputs.'
      ELSE 'Corroborate the reported result with customer or platform evidence.'
    END,
    CASE WHEN v_status = 'verified' THEN 'mentor_checkpoint' ELSE NULL END,
    jsonb_build_object(
      'sampleSize', v_sample,
      'minimumSampleSize', v_experiment.minimum_sample_size,
      'targetMetric', v_experiment.target_metric,
      'targetOperator', v_experiment.target_operator,
      'targetValue', v_experiment.target_value,
      'observedValue', v_result_value,
      'evidenceVerified', v_has_external
    ),
    CASE WHEN v_sample >= v_experiment.minimum_sample_size THEN now() ELSE NULL END,
    CASE WHEN v_status = 'verified' THEN now() ELSE NULL END
  )
  ON CONFLICT (experiment_id, claim_type, policy_version) DO UPDATE SET
    claim = EXCLUDED.claim,
    evidence_level = EXCLUDED.evidence_level,
    result = EXCLUDED.result,
    status = EXCLUDED.status,
    evidence_ids = EXCLUDED.evidence_ids,
    missing_evidence = EXCLUDED.missing_evidence,
    next_action = EXCLUDED.next_action,
    unlocked_benefit = EXCLUDED.unlocked_benefit,
    evaluation = EXCLUDED.evaluation,
    decided_at = EXCLUDED.decided_at,
    verified_at = EXCLUDED.verified_at
  RETURNING * INTO v_claim;

  IF v_claim.status = 'verified' AND v_claim.unlocked_benefit = 'mentor_checkpoint' THEN
    INSERT INTO public.ct_access_unlocks(user_id, benefit, verification_claim_id, experiment_id)
    VALUES (v_claim.user_id, 'mentor_checkpoint', v_claim.id, v_claim.experiment_id)
    ON CONFLICT (user_id, benefit, verification_claim_id) DO NOTHING;
  END IF;

  UPDATE public.market_experiments
  SET status = CASE WHEN v_sample >= minimum_sample_size THEN 'evaluated' ELSE 'running' END,
      started_at = COALESCE(started_at, now()),
      evaluated_at = CASE WHEN v_sample >= minimum_sample_size THEN now() ELSE evaluated_at END
  WHERE id = p_experiment_id;

  RETURN v_claim;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_market_experiment_v1(uuid) TO authenticated;

-- An iterate/narrow/pivot decision creates a fresh pre-registration. Exactly one
-- causal input is changed and the evaluated parent remains immutable forever.
CREATE OR REPLACE FUNCTION public.create_next_market_experiment_version_v1(
  p_experiment_id uuid,
  p_changed_variable text,
  p_new_value text
)
RETURNS public.market_experiments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent public.market_experiments%ROWTYPE;
  v_next public.market_experiments%ROWTYPE;
  v_decision public.market_experiment_decisions%ROWTYPE;
  v_value text := btrim(COALESCE(p_new_value, ''));
  v_target numeric;
BEGIN
  SELECT * INTO v_parent
  FROM public.market_experiments
  WHERE id = p_experiment_id AND user_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Experiment not found' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_decision
  FROM public.market_experiment_decisions
  WHERE experiment_id = p_experiment_id
    AND user_id = auth.uid()
    AND decision IN ('iterate', 'narrow', 'pivot')
    AND changed_variable = p_changed_variable;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record an iterative decision and its one changed variable first';
  END IF;
  IF p_changed_variable NOT IN ('audience', 'problem', 'offer', 'message', 'channel', 'asset', 'cta', 'target') THEN
    RAISE EXCEPTION 'Unsupported changed variable';
  END IF;
  IF v_value = '' THEN RAISE EXCEPTION 'The next version needs a new value'; END IF;

  IF p_changed_variable = 'target' THEN
    BEGIN
      v_target := v_value::numeric;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'The next target must be numeric';
    END;
    IF v_target < 0 OR v_target = v_parent.target_value THEN
      RAISE EXCEPTION 'The next target must be non-negative and different';
    END IF;
  ELSIF v_value = CASE p_changed_variable
    WHEN 'audience' THEN v_parent.audience
    WHEN 'problem' THEN COALESCE(v_parent.problem, '')
    WHEN 'offer' THEN v_parent.offer
    WHEN 'message' THEN v_parent.message
    WHEN 'channel' THEN v_parent.channel
    WHEN 'asset' THEN COALESCE(v_parent.asset_id, '')
    WHEN 'cta' THEN COALESCE(v_parent.cta, '')
    ELSE ''
  END THEN
    RAISE EXCEPTION 'The next version must actually change the selected variable';
  END IF;

  INSERT INTO public.market_experiments (
    user_id, parent_experiment_id, version, execution_loop, status,
    hypothesis, audience, problem, buying_trigger, offer, message, channel,
    asset_type, asset_id, source_demo_id, cta, target_metric, target_operator,
    target_value, minimum_sample_size, observation_window_days, kill_rule,
    action_packet, source_outcome_versions, source_icp_analysis_id,
    source_gtm_plan_id, source_gtm_play_id, source_traction_sprint_id,
    source_first_customer_sprint_id, idempotency_key, preregistered_at
  ) VALUES (
    v_parent.user_id, v_parent.id, v_parent.version + 1,
    v_parent.execution_loop, 'preregistered', v_parent.hypothesis,
    CASE WHEN p_changed_variable = 'audience' THEN v_value ELSE v_parent.audience END,
    CASE WHEN p_changed_variable = 'problem' THEN v_value ELSE v_parent.problem END,
    v_parent.buying_trigger,
    CASE WHEN p_changed_variable = 'offer' THEN v_value ELSE v_parent.offer END,
    CASE WHEN p_changed_variable = 'message' THEN v_value ELSE v_parent.message END,
    CASE WHEN p_changed_variable = 'channel' THEN v_value ELSE v_parent.channel END,
    v_parent.asset_type,
    CASE WHEN p_changed_variable = 'asset' THEN v_value ELSE v_parent.asset_id END,
    v_parent.source_demo_id,
    CASE WHEN p_changed_variable = 'cta' THEN v_value ELSE v_parent.cta END,
    v_parent.target_metric, v_parent.target_operator,
    CASE WHEN p_changed_variable = 'target' THEN v_target ELSE v_parent.target_value END,
    v_parent.minimum_sample_size, v_parent.observation_window_days, v_parent.kill_rule,
    v_parent.action_packet || jsonb_build_object(
      'nextVersionChange', jsonb_build_object('variable', p_changed_variable, 'value', v_value),
      'approvedMessage', CASE WHEN p_changed_variable = 'message' THEN v_value ELSE v_parent.action_packet->>'approvedMessage' END,
      'cta', CASE WHEN p_changed_variable = 'cta' THEN v_value ELSE v_parent.action_packet->>'cta' END,
      'targetValue', CASE WHEN p_changed_variable = 'target' THEN to_jsonb(v_target) ELSE v_parent.action_packet->'targetValue' END
    ),
    v_parent.source_outcome_versions || jsonb_build_object(
      'parentExperimentId', v_parent.id::text,
      'changedVariable', p_changed_variable,
      'changedValue', v_value
    ),
    v_parent.source_icp_analysis_id, v_parent.source_gtm_plan_id,
    v_parent.source_gtm_play_id, v_parent.source_traction_sprint_id,
    v_parent.source_first_customer_sprint_id,
    v_parent.idempotency_key || ':next:' || (v_parent.version + 1)::text || ':' || md5(p_changed_variable || ':' || v_value),
    now()
  )
  ON CONFLICT (parent_experiment_id) DO UPDATE
    SET parent_experiment_id = EXCLUDED.parent_experiment_id
  RETURNING * INTO v_next;

  UPDATE public.market_experiment_decisions
  SET next_experiment_id = v_next.id
  WHERE experiment_id = v_parent.id;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_next_market_experiment_version_v1(uuid,text,text) TO authenticated;

-- Edge-validated Demo Studio behavior becomes metric-level platform evidence.
CREATE OR REPLACE FUNCTION public.sync_demo_event_to_market_experiment_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric text;
  v_experiment record;
BEGIN
  IF COALESCE(NEW.verified, false) IS NOT TRUE
     OR COALESCE(NEW.owner_view, false) IS TRUE
     OR NEW.demo_id IS NULL THEN RETURN NEW; END IF;
  v_metric := CASE NEW.type
    WHEN 'demo_view' THEN 'qualified_views'
    WHEN 'demo_start' THEN 'demo_starts'
    WHEN 'demo_complete' THEN 'demo_completions'
    WHEN 'cta_click' THEN 'cta_clicks'
    WHEN 'signup' THEN 'signups'
    WHEN 'waitlist_signup' THEN 'signups'
    ELSE NULL
  END;
  IF v_metric IS NULL THEN RETURN NEW; END IF;

  FOR v_experiment IN
    SELECT experiment.id, experiment.user_id FROM public.market_experiments experiment
    WHERE experiment.source_demo_id = NEW.demo_id
      AND experiment.status IN ('preregistered', 'running', 'evaluated')
      AND NOT EXISTS (
        SELECT 1 FROM public.market_experiments successor
        WHERE successor.parent_experiment_id = experiment.id
      )
  LOOP
    INSERT INTO public.market_experiment_observations (
      experiment_id, user_id, metric, value, denominator, source_type,
      source_id, source_event_ids, verification_mode, provenance,
      idempotency_key, captured_at
    ) VALUES (
      v_experiment.id, v_experiment.user_id, v_metric, 1,
      CASE WHEN v_metric = 'qualified_views' THEN 1 ELSE NULL END,
      'demo_studio_event', NEW.id::text, ARRAY[NEW.id::text], 'platform_verified',
      jsonb_build_object('demoId', NEW.demo_id, 'eventType', NEW.type),
      'demo-event:' || NEW.id::text, NEW.created_at
    ) ON CONFLICT (experiment_id, idempotency_key) DO NOTHING;
    PERFORM public.evaluate_market_experiment_v1(v_experiment.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_demo_event_to_market_experiment ON public.demo_studio_events;
CREATE TRIGGER sync_demo_event_to_market_experiment
AFTER INSERT ON public.demo_studio_events
FOR EACH ROW EXECUTE FUNCTION public.sync_demo_event_to_market_experiment_v1();

CREATE OR REPLACE FUNCTION public.sync_demo_response_to_market_experiment_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_experiment record;
  v_metric text;
BEGIN
  IF COALESCE(NEW.verified, false) IS NOT TRUE
     OR COALESCE(NEW.owner_view, false) IS TRUE THEN RETURN NEW; END IF;
  FOR v_experiment IN
    SELECT experiment.id, experiment.user_id FROM public.market_experiments experiment
    WHERE experiment.source_demo_id = NEW.demo_id
      AND experiment.status IN ('preregistered', 'running', 'evaluated')
      AND NOT EXISTS (
        SELECT 1 FROM public.market_experiments successor
        WHERE successor.parent_experiment_id = experiment.id
      )
  LOOP
    INSERT INTO public.market_experiment_observations (
      experiment_id, user_id, metric, value, source_type, source_id,
      verification_mode, provenance, idempotency_key, captured_at
    ) VALUES (
      v_experiment.id, v_experiment.user_id, 'replies', 1,
      'demo_studio_response', NEW.id::text, 'platform_verified',
      jsonb_build_object('demoId', NEW.demo_id, 'response', NEW.response),
      'demo-response:' || NEW.id::text || ':all', NEW.created_at
    ) ON CONFLICT (experiment_id, idempotency_key) DO NOTHING;

    v_metric := CASE NEW.response
      WHEN 'interested' THEN 'positive_replies'
      WHEN 'book_call' THEN 'meetings'
      WHEN 'commitment' THEN 'commitments'
      ELSE 'negative_responses'
    END;
    INSERT INTO public.market_experiment_observations (
      experiment_id, user_id, metric, value, source_type, source_id,
      verification_mode, provenance, idempotency_key, captured_at
    ) VALUES (
      v_experiment.id, v_experiment.user_id, v_metric, 1,
      'demo_studio_response', NEW.id::text, 'platform_verified',
      jsonb_build_object('demoId', NEW.demo_id, 'response', NEW.response),
      'demo-response:' || NEW.id::text || ':semantic', NEW.created_at
    ) ON CONFLICT (experiment_id, idempotency_key) DO UPDATE SET
      metric = EXCLUDED.metric,
      provenance = EXCLUDED.provenance,
      captured_at = EXCLUDED.captured_at;
    PERFORM public.evaluate_market_experiment_v1(v_experiment.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_demo_response_to_market_experiment ON public.demo_studio_responses;
CREATE TRIGGER sync_demo_response_to_market_experiment
AFTER INSERT OR UPDATE OF response, verified ON public.demo_studio_responses
FOR EACH ROW EXECUTE FUNCTION public.sync_demo_response_to_market_experiment_v1();

-- First Customer Sprint is the default B2B SELL template. It writes into the
-- same observation contract, but remains founder-reported until a native
-- integration or Demo Studio independently observes the customer behavior.
CREATE OR REPLACE FUNCTION public.link_market_experiment_to_open_first_customer_sprint_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_first_customer_sprint_id IS NULL AND NEW.source_gtm_plan_id IS NOT NULL THEN
    SELECT sprint.id INTO NEW.source_first_customer_sprint_id
    FROM public.first_customer_sprints sprint
    WHERE sprint.founder_id = NEW.user_id AND sprint.status IN ('draft', 'active', 'paused')
    ORDER BY sprint.created_at DESC
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_market_experiment_to_open_first_customer_sprint ON public.market_experiments;
CREATE TRIGGER link_market_experiment_to_open_first_customer_sprint
BEFORE INSERT ON public.market_experiments
FOR EACH ROW EXECUTE FUNCTION public.link_market_experiment_to_open_first_customer_sprint_v1();

CREATE OR REPLACE FUNCTION public.link_open_first_customer_sprint_to_market_experiment_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_experiment_id uuid;
BEGIN
  SELECT experiment.id INTO v_experiment_id
  FROM public.market_experiments experiment
  WHERE experiment.user_id = NEW.founder_id
    AND experiment.source_first_customer_sprint_id IS NULL
    AND experiment.source_gtm_plan_id IS NOT NULL
    AND experiment.status IN ('preregistered', 'running')
  ORDER BY experiment.created_at DESC
  LIMIT 1;
  IF v_experiment_id IS NOT NULL THEN
    UPDATE public.market_experiments
    SET source_first_customer_sprint_id = NEW.id
    WHERE id = v_experiment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_open_first_customer_sprint_to_market_experiment ON public.first_customer_sprints;
CREATE TRIGGER link_open_first_customer_sprint_to_market_experiment
AFTER INSERT ON public.first_customer_sprints
FOR EACH ROW EXECUTE FUNCTION public.link_open_first_customer_sprint_to_market_experiment_v1();

CREATE OR REPLACE FUNCTION public.sync_first_customer_contact_to_market_experiment_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_experiment record;
BEGIN
  FOR v_experiment IN
    SELECT experiment.id, experiment.user_id FROM public.market_experiments experiment
    WHERE experiment.source_first_customer_sprint_id = NEW.sprint_id
      AND experiment.status IN ('preregistered', 'running', 'evaluated')
      AND NOT EXISTS (
        SELECT 1 FROM public.market_experiments successor
        WHERE successor.parent_experiment_id = experiment.id
      )
  LOOP
    INSERT INTO public.market_experiment_observations (
      experiment_id, user_id, metric, value, source_type, source_id,
      verification_mode, provenance, idempotency_key, captured_at
    ) VALUES (
      v_experiment.id, v_experiment.user_id, 'prospects', 1,
      'first_customer_sprint_contact', NEW.id::text, 'founder_reported',
      jsonb_build_object('sprintId', NEW.sprint_id, 'contactId', NEW.contact_id),
      'first-customer-contact:' || NEW.id::text, NEW.created_at
    ) ON CONFLICT (experiment_id, idempotency_key) DO NOTHING;
    PERFORM public.evaluate_market_experiment_v1(v_experiment.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_first_customer_contact_to_market_experiment ON public.first_customer_sprint_contacts;
CREATE TRIGGER sync_first_customer_contact_to_market_experiment
AFTER INSERT ON public.first_customer_sprint_contacts
FOR EACH ROW EXECUTE FUNCTION public.sync_first_customer_contact_to_market_experiment_v1();

CREATE OR REPLACE FUNCTION public.sync_first_customer_event_to_market_experiment_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric text;
  v_sprint_id uuid;
  v_experiment record;
BEGIN
  v_metric := CASE NEW.event_type
    WHEN 'outreach_sent' THEN 'sent'
    WHEN 'reply_received' THEN 'replies'
    WHEN 'interview_scheduled' THEN 'meetings'
    WHEN 'interview_completed' THEN 'attended'
    WHEN 'offer_sent' THEN 'offers'
    WHEN 'commitment_received' THEN 'commitments'
    WHEN 'payment_received' THEN 'payments'
    ELSE NULL
  END;
  IF v_metric IS NULL OR NEW.contact_id IS NULL THEN RETURN NEW; END IF;

  SELECT scoped.sprint_id INTO v_sprint_id
  FROM public.first_customer_sprint_contacts scoped
  JOIN public.first_customer_sprints sprint ON sprint.id = scoped.sprint_id
  WHERE scoped.contact_id = NEW.contact_id AND sprint.founder_id = NEW.user_id
  ORDER BY scoped.created_at DESC
  LIMIT 1;
  IF v_sprint_id IS NULL THEN RETURN NEW; END IF;

  FOR v_experiment IN
    SELECT experiment.id, experiment.user_id FROM public.market_experiments experiment
    WHERE experiment.source_first_customer_sprint_id = v_sprint_id
      AND experiment.status IN ('preregistered', 'running', 'evaluated')
      AND NOT EXISTS (
        SELECT 1 FROM public.market_experiments successor
        WHERE successor.parent_experiment_id = experiment.id
      )
  LOOP
    INSERT INTO public.market_experiment_observations (
      experiment_id, user_id, metric, value, source_type, source_id,
      verification_mode, provenance, idempotency_key, captured_at
    ) VALUES (
      v_experiment.id, v_experiment.user_id, v_metric, 1,
      'first_customer_sprint_event', NEW.id::text, 'founder_reported',
      jsonb_build_object(
        'sprintId', v_sprint_id,
        'customerEvidenceEventId', NEW.id,
        'originalVerificationMode', NEW.verification_mode
      ),
      'first-customer-event:' || NEW.id::text, NEW.occurred_at
    ) ON CONFLICT (experiment_id, idempotency_key) DO NOTHING;
    PERFORM public.evaluate_market_experiment_v1(v_experiment.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_first_customer_event_to_market_experiment ON public.customer_evidence_events;
CREATE TRIGGER sync_first_customer_event_to_market_experiment
AFTER INSERT ON public.customer_evidence_events
FOR EACH ROW EXECUTE FUNCTION public.sync_first_customer_event_to_market_experiment_v1();

-- Keep the existing First Customer Sprint checkpoint contract, while allowing
-- one unconsumed CT Verified acquisition claim to satisfy the access gate.
CREATE OR REPLACE FUNCTION public.request_first_customer_sprint_checkpoint_v1(
  p_sprint_id uuid,
  p_mentor_id uuid,
  p_redacted_brief jsonb
)
RETURNS public.first_customer_sprints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sprint public.first_customer_sprints%ROWTYPE;
  v_attached integer;
  v_brief jsonb;
  v_previous_status text;
  v_unlock_id uuid;
BEGIN
  SELECT * INTO v_sprint
  FROM public.first_customer_sprints
  WHERE id = p_sprint_id AND founder_id = auth.uid() AND status IN ('draft', 'active', 'paused')
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sprint not found' USING ERRCODE='42501'; END IF;
  IF v_sprint.selected_message_variant IS NULL THEN RAISE EXCEPTION 'Select a primary message first'; END IF;

  SELECT count(*)::integer INTO v_attached
  FROM public.first_customer_sprint_contacts WHERE sprint_id = p_sprint_id;
  IF v_attached < 10 THEN
    SELECT id INTO v_unlock_id
    FROM public.ct_access_unlocks
    WHERE user_id = auth.uid()
      AND benefit = 'mentor_checkpoint'
      AND consumed_at IS NULL
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE;
    IF v_unlock_id IS NULL THEN
      RAISE EXCEPTION 'Attach at least 10 prospects or earn CT Verified mentor access before requesting a checkpoint';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.mentors WHERE id=p_mentor_id AND COALESCE(is_active, false)) THEN
    RAISE EXCEPTION 'Selected mentor is unavailable';
  END IF;
  IF p_redacted_brief IS NULL OR jsonb_typeof(p_redacted_brief) <> 'object' THEN
    RAISE EXCEPTION 'A redacted checkpoint brief is required';
  END IF;
  IF p_redacted_brief ?| ARRAY['profileUrl','profile_url','email','notes'] THEN
    RAISE EXCEPTION 'The checkpoint brief contains private fields';
  END IF;
  IF jsonb_typeof(COALESCE(p_redacted_brief->'contacts', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'The checkpoint contact summary must be an array';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_redacted_brief->'contacts', '[]'::jsonb)) contact
    WHERE jsonb_typeof(contact) <> 'object'
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(contact) field
         WHERE field NOT IN ('displayName','company','role','stage')
       )
       OR COALESCE(contact->>'displayName', '') !~ '^Prospect [1-9][0-9]*$'
       OR (contact ? 'company' AND jsonb_typeof(contact->'company') <> 'null')
       OR octet_length(COALESCE(contact->>'role', '')) > 200
       OR octet_length(COALESCE(contact->>'stage', '')) > 100
  ) THEN
    RAISE EXCEPTION 'The checkpoint contact summary is not redacted';
  END IF;
  IF octet_length(p_redacted_brief::text) > 20000 THEN RAISE EXCEPTION 'Checkpoint brief is too large'; END IF;

  IF v_sprint.checkpoint_status IN ('requested','scheduled','completed') THEN RETURN v_sprint; END IF;
  v_previous_status := v_sprint.checkpoint_status;
  v_brief := p_redacted_brief - ARRAY['contacts','profileUrl','profile_url','email','notes'];

  UPDATE public.first_customer_sprints
  SET mentor_id = p_mentor_id,
      checkpoint_status = 'requested',
      checkpoint_requested_at = now(),
      checkpoint_scheduled_for = NULL,
      checkpoint_verified_by = NULL,
      checkpoint_verified_at = NULL,
      checkpoint_redacted_brief = v_brief,
      mentor_brief_snapshot = v_brief,
      discovery_call_id = NULL,
      updated_at = now()
  WHERE id = p_sprint_id
  RETURNING * INTO v_sprint;

  IF v_unlock_id IS NOT NULL THEN
    UPDATE public.ct_access_unlocks SET consumed_at = now() WHERE id = v_unlock_id;
  END IF;
  INSERT INTO public.first_customer_sprint_checkpoint_events(
    sprint_id, actor_user_id, previous_status, next_status, metadata
  ) VALUES (
    p_sprint_id, auth.uid(), v_previous_status, 'requested',
    jsonb_build_object('mentorId', p_mentor_id, 'creditsDeducted', 0, 'ctVerifiedUnlockId', v_unlock_id)
  );
  RETURN v_sprint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_first_customer_sprint_checkpoint_v1(uuid,uuid,jsonb) TO authenticated;

-- Existing traction rows accept the expanded decision vocabulary. Historical
-- records retain their current values.
ALTER TABLE public.traction_engine_experiments
  DROP CONSTRAINT IF EXISTS traction_engine_experiments_decision_check;
ALTER TABLE public.traction_engine_experiments
  ADD CONSTRAINT traction_engine_experiments_decision_check
  CHECK (decision IN ('double_down', 'iterate', 'narrow', 'pivot', 'kill'));

COMMENT ON TABLE public.market_experiments IS
  'Immutable-after-preregistration acquisition experiment versions connecting ICP, Demo, GTM, Traction, and First Customer Sprint lineage.';
COMMENT ON TABLE public.verification_claims IS
  'Claim-level proof. CT Verified means the evidence and observed result are trustworthy; it does not guarantee startup success.';
