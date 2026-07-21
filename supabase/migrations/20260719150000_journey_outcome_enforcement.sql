-- Authoritative, versioned outcome contracts for the six core founder tools.
-- Existing journey_outcomes rows remain the current read model. Every change is
-- snapshotted and handoffs always point to the exact source version consumed.

ALTER TABLE public.journey_outcomes
  ADD COLUMN IF NOT EXISTS evaluation_version text NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS verification_mode text NOT NULL DEFAULT 'unverified'
    CHECK (verification_mode IN ('unverified', 'founder_reported', 'corroborated', 'platform_verified')),
  ADD COLUMN IF NOT EXISTS last_evaluated_at timestamptz;

DROP POLICY IF EXISTS "Users manage their journey outcomes" ON public.journey_outcomes;
DROP POLICY IF EXISTS "Users read their journey outcomes" ON public.journey_outcomes;
CREATE POLICY "Users read their journey outcomes" ON public.journey_outcomes
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.journey_outcome_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_outcome_id uuid NOT NULL REFERENCES public.journey_outcomes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  status text NOT NULL CHECK (status IN ('draft', 'ready', 'verified', 'reviewed')),
  verification_mode text NOT NULL CHECK (verification_mode IN ('unverified', 'founder_reported', 'corroborated', 'platform_verified')),
  evaluation_version text NOT NULL,
  quality_checks jsonb NOT NULL,
  evidence_manifest jsonb NOT NULL,
  completion_score numeric CHECK (completion_score IS NULL OR completion_score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_outcome_id, version_number)
);

CREATE INDEX IF NOT EXISTS journey_outcome_versions_lookup_idx
  ON public.journey_outcome_versions(journey_outcome_id, version_number DESC);

ALTER TABLE public.journey_outcome_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their journey outcome versions" ON public.journey_outcome_versions;
CREATE POLICY "Users read their journey outcome versions" ON public.journey_outcome_versions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage journey outcome versions" ON public.journey_outcome_versions;
CREATE POLICY "Admins manage journey outcome versions" ON public.journey_outcome_versions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.snapshot_journey_outcome_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.id::text));
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM public.journey_outcome_versions
    WHERE journey_outcome_id = NEW.id;

  INSERT INTO public.journey_outcome_versions (
    journey_outcome_id, user_id, version_number, status, verification_mode,
    evaluation_version, quality_checks, evidence_manifest, completion_score
  ) VALUES (
    NEW.id, NEW.user_id, next_version, NEW.status, NEW.verification_mode,
    NEW.evaluation_version, NEW.quality_checks, NEW.evidence_manifest, NEW.completion_score
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_journey_outcome_version ON public.journey_outcomes;
CREATE TRIGGER snapshot_journey_outcome_version
  AFTER INSERT OR UPDATE OF status, verification_mode, evaluation_version, quality_checks, evidence_manifest, completion_score
  ON public.journey_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_journey_outcome_version();

CREATE OR REPLACE FUNCTION public.reject_immutable_journey_version_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Journey outcome and assumption versions are immutable';
END;
$$;

DROP TRIGGER IF EXISTS reject_journey_outcome_version_update ON public.journey_outcome_versions;
CREATE TRIGGER reject_journey_outcome_version_update
  BEFORE UPDATE ON public.journey_outcome_versions
  FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_journey_version_update();

CREATE TABLE IF NOT EXISTS public.journey_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_outcome_id uuid NOT NULL REFERENCES public.journey_outcomes(id) ON DELETE CASCADE,
  source_version_id uuid NOT NULL REFERENCES public.journey_outcome_versions(id) ON DELETE RESTRICT,
  destination_tool text NOT NULL CHECK (destination_tool IN (
    'icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'traction_engine'
  )),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'consumed', 'failed')),
  idempotency_key text NOT NULL,
  consumed_artifact_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS journey_handoffs_destination_idx
  ON public.journey_handoffs(user_id, destination_tool, status, created_at DESC);

ALTER TABLE public.journey_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their journey handoffs" ON public.journey_handoffs;
CREATE POLICY "Users read their journey handoffs" ON public.journey_handoffs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage journey handoffs" ON public.journey_handoffs;
CREATE POLICY "Admins manage journey handoffs" ON public.journey_handoffs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS set_journey_handoffs_updated_at ON public.journey_handoffs;
CREATE TRIGGER set_journey_handoffs_updated_at
  BEFORE UPDATE ON public.journey_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.journey_outcome_versions IS 'Immutable evaluation history for each six-tool journey artifact.';
COMMENT ON TABLE public.journey_handoffs IS 'Idempotent, version-pinned evidence handoffs between core founder tools.';

ALTER TABLE public.traction_engine_sprints
  ADD COLUMN IF NOT EXISTS activation_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS activation_idempotency_key text,
  ADD COLUMN IF NOT EXISTS review_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS kill_rule_status text NOT NULL DEFAULT 'collecting'
    CHECK (kill_rule_status IN ('collecting', 'on_track', 'at_risk', 'triggered')),
  ADD COLUMN IF NOT EXISTS kill_rule_evaluated_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS traction_sprint_activation_idempotency_idx
  ON public.traction_engine_sprints(user_id, activation_idempotency_key)
  WHERE activation_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.activate_gtm_play_v2(
  p_plan_id uuid,
  p_play_id uuid,
  p_channel text,
  p_activation_payload jsonb,
  p_idempotency_key text
)
RETURNS TABLE(sprint_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  resolved_sprint_id uuid;
  active_count integer;
  rewritten_plays jsonb;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gtm_plans WHERE id = p_plan_id AND user_id = caller_id) THEN
    RAISE EXCEPTION 'GTM plan not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gtm_plays WHERE id = p_play_id AND plan_id = p_plan_id AND user_id = caller_id) THEN
    RAISE EXCEPTION 'GTM play not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(caller_id::text || ':gtm-activation'));

  SELECT id INTO resolved_sprint_id
    FROM public.traction_engine_sprints
    WHERE user_id = caller_id
      AND (activation_idempotency_key = p_idempotency_key OR (status = 'active' AND lower(channel) = lower(trim(p_channel))))
    ORDER BY created_at DESC LIMIT 1;

  IF resolved_sprint_id IS NULL THEN
    SELECT count(*) INTO active_count FROM public.traction_engine_sprints WHERE user_id = caller_id AND status = 'active';
    IF active_count >= 2 THEN RAISE EXCEPTION 'Traction Engine supports two active channels at a time'; END IF;
    INSERT INTO public.traction_engine_sprints (
      user_id, channel, cycle_start_date, status, source_gtm_plan_id, source_gtm_play_id,
      activation_payload, activation_idempotency_key, review_due_at
    ) VALUES (
      caller_id, trim(p_channel), current_date, 'active', p_plan_id, p_play_id,
      COALESCE(p_activation_payload, '{}'::jsonb), p_idempotency_key, now() + interval '7 days'
    ) RETURNING id INTO resolved_sprint_id;
  ELSE
    UPDATE public.traction_engine_sprints SET
      source_gtm_plan_id = p_plan_id,
      source_gtm_play_id = p_play_id,
      activation_payload = COALESCE(p_activation_payload, activation_payload),
      activation_idempotency_key = COALESCE(activation_idempotency_key, p_idempotency_key),
      review_due_at = COALESCE(review_due_at, now() + interval '7 days')
    WHERE id = resolved_sprint_id AND user_id = caller_id;
  END IF;

  UPDATE public.gtm_plays SET
    status = 'active',
    play_content = play_content || jsonb_build_object('status', 'active', 'tractionSprintId', resolved_sprint_id::text)
  WHERE id = p_play_id AND user_id = caller_id;

  SELECT jsonb_agg(
    CASE WHEN item->>'id' = p_play_id::text
      THEN item || jsonb_build_object('status', 'active', 'tractionSprintId', resolved_sprint_id::text)
      ELSE item END
  ) INTO rewritten_plays
  FROM jsonb_array_elements((SELECT plan_content->'plays' FROM public.gtm_plans WHERE id = p_plan_id)) AS item;

  UPDATE public.gtm_plans SET
    plan_content = jsonb_set(plan_content, '{plays}', COALESCE(rewritten_plays, '[]'::jsonb), true),
    updated_at = now()
  WHERE id = p_plan_id AND user_id = caller_id;

  RETURN QUERY SELECT resolved_sprint_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_gtm_play_v2(uuid, uuid, text, jsonb, text) TO authenticated;

ALTER TABLE public.traction_engine_experiments
  ADD COLUMN IF NOT EXISTS recommended_decision text
    CHECK (recommended_decision IS NULL OR recommended_decision IN ('double_down', 'iterate', 'kill')),
  ADD COLUMN IF NOT EXISTS override_rationale text,
  ADD COLUMN IF NOT EXISTS assumption_fingerprint text,
  ADD COLUMN IF NOT EXISTS assumption_status text
    CHECK (assumption_status IS NULL OR assumption_status IN ('confirmed', 'rejected'));

ALTER TABLE public.traction_engine_weekly_logs
  ADD COLUMN IF NOT EXISTS verification_mode text NOT NULL DEFAULT 'founder_reported'
    CHECK (verification_mode IN ('founder_reported', 'corroborated', 'platform_verified'));

CREATE TABLE IF NOT EXISTS public.journey_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_artifact_id text NOT NULL,
  fingerprint text NOT NULL,
  statement text NOT NULL CHECK (length(trim(statement)) >= 5),
  status text NOT NULL DEFAULT 'untested' CHECK (status IN ('untested', 'confirmed', 'rejected')),
  current_version integer NOT NULL DEFAULT 1,
  latest_source_tool text CHECK (latest_source_tool IS NULL OR latest_source_tool IN (
    'icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'traction_engine'
  )),
  latest_source_artifact_id text,
  latest_rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS public.journey_assumption_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assumption_id uuid NOT NULL REFERENCES public.journey_assumptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  statement text NOT NULL,
  status text NOT NULL CHECK (status IN ('untested', 'confirmed', 'rejected')),
  source_tool text,
  source_artifact_id text,
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assumption_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.journey_assumption_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assumption_id uuid NOT NULL REFERENCES public.journey_assumptions(id) ON DELETE CASCADE,
  source_tool text NOT NULL CHECK (source_tool IN (
    'pmf_lab', 'demo_studio', 'mvp_builder', 'gtm_strategist', 'traction_engine'
  )),
  source_artifact_id text NOT NULL,
  participant_fingerprint text NOT NULL,
  status text NOT NULL CHECK (status IN ('confirmed', 'rejected')),
  verification_mode text NOT NULL DEFAULT 'founder_reported'
    CHECK (verification_mode IN ('founder_reported', 'corroborated', 'platform_verified')),
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, assumption_id, source_tool, source_artifact_id, participant_fingerprint)
);

ALTER TABLE public.journey_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_assumption_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_assumption_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their journey assumptions" ON public.journey_assumptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read their journey assumption versions" ON public.journey_assumption_versions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read their journey assumption signals" ON public.journey_assumption_signals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage journey assumptions" ON public.journey_assumptions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage journey assumption versions" ON public.journey_assumption_versions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage journey assumption signals" ON public.journey_assumption_signals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS journey_assumption_signals_evidence_idx
  ON public.journey_assumption_signals(user_id, assumption_id, created_at DESC);

DROP TRIGGER IF EXISTS set_journey_assumption_signals_updated_at ON public.journey_assumption_signals;
CREATE TRIGGER set_journey_assumption_signals_updated_at
  BEFORE UPDATE ON public.journey_assumption_signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS reject_journey_assumption_version_update ON public.journey_assumption_versions;
CREATE TRIGGER reject_journey_assumption_version_update
  BEFORE UPDATE ON public.journey_assumption_versions
  FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_journey_version_update();

CREATE OR REPLACE FUNCTION public.bump_journey_assumption_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.current_version := OLD.current_version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.snapshot_journey_assumption_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.journey_assumption_versions (
    assumption_id, user_id, version_number, statement, status, source_tool, source_artifact_id, rationale
  ) VALUES (
    NEW.id, NEW.user_id, NEW.current_version, NEW.statement, NEW.status,
    NEW.latest_source_tool, NEW.latest_source_artifact_id, NEW.latest_rationale
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bump_journey_assumption_version ON public.journey_assumptions;
CREATE TRIGGER bump_journey_assumption_version
  BEFORE UPDATE OF statement, status, latest_source_tool, latest_source_artifact_id, latest_rationale
  ON public.journey_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.bump_journey_assumption_version();

DROP TRIGGER IF EXISTS snapshot_journey_assumption_version ON public.journey_assumptions;
CREATE TRIGGER snapshot_journey_assumption_version
  AFTER INSERT OR UPDATE OF statement, status, latest_source_tool, latest_source_artifact_id, latest_rationale
  ON public.journey_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_journey_assumption_version();
