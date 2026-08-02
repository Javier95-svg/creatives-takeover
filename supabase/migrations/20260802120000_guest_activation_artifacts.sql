-- Durable, service-only artifacts for the value-before-signup funnel.
-- The raw resume token is returned once to the browser; only its SHA-256 hash
-- is stored. Direct table access is intentionally unavailable to browsers.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.guest_activation_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('icp', 'demo')),
  source TEXT NOT NULL,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  compact_payload JSONB NULL,
  deep_payload JSONB NULL,
  generation_status TEXT NOT NULL DEFAULT 'compact_generating'
    CHECK (generation_status IN ('compact_generating', 'compact_ready', 'deep_running', 'deep_ready', 'deep_failed', 'failed')),
  generation_error_code TEXT NULL,
  resume_token_hash TEXT NOT NULL UNIQUE,
  share_slug TEXT NULL UNIQUE,
  claimed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  claim_state TEXT NOT NULL DEFAULT 'unclaimed'
    CHECK (claim_state IN ('unclaimed', 'claiming', 'claimed', 'failed')),
  native_artifact_id TEXT NULL,
  claimed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

ALTER TABLE public.guest_activation_artifacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.guest_activation_artifacts FROM anon, authenticated;
-- No policies on purpose: only service-role edge functions may read or write.

CREATE INDEX IF NOT EXISTS guest_activation_artifacts_expiry_idx
  ON public.guest_activation_artifacts (expires_at)
  WHERE claim_state <> 'claimed';

CREATE INDEX IF NOT EXISTS guest_activation_artifacts_claim_idx
  ON public.guest_activation_artifacts (claimed_by, claim_state)
  WHERE claimed_by IS NOT NULL;

-- Convert an ICP guest artifact and mark it claimed in one database
-- transaction. Repeating the call for the same user returns the same native
-- artifact; a different user can never claim the token after the first call.
CREATE OR REPLACE FUNCTION public.claim_guest_icp_artifact(
  p_guest_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guest_row public.guest_activation_artifacts%ROWTYPE;
  analysis_id UUID;
  confidence_level TEXT;
  business_description TEXT;
  target_audience TEXT;
BEGIN
  SELECT * INTO guest_row
  FROM public.guest_activation_artifacts
  WHERE id = p_guest_id
  FOR UPDATE;

  IF NOT FOUND OR guest_row.artifact_type <> 'icp' OR guest_row.expires_at <= now() THEN
    RAISE EXCEPTION 'GUEST_ARTIFACT_NOT_FOUND';
  END IF;
  IF guest_row.claimed_by IS NOT NULL AND guest_row.claimed_by <> p_user_id THEN
    RAISE EXCEPTION 'GUEST_ARTIFACT_ALREADY_CLAIMED';
  END IF;
  IF guest_row.native_artifact_id IS NOT NULL AND guest_row.claimed_by = p_user_id THEN
    RETURN guest_row.native_artifact_id::UUID;
  END IF;
  IF guest_row.deep_payload IS NULL THEN
    RAISE EXCEPTION 'GUEST_ARTIFACT_NOT_READY';
  END IF;

  confidence_level := guest_row.deep_payload #>> '{draftDocument,confidence,level}';
  business_description := CASE
    WHEN guest_row.deep_payload #>> '{founderInputs,mode}' = 'guided'
      THEN guest_row.deep_payload #>> '{founderInputs,guided,seed}'
    ELSE guest_row.deep_payload #>> '{founderInputs,fastDescription}'
  END;
  target_audience := COALESCE(
    NULLIF(guest_row.deep_payload #>> '{founderInputs,guided,specificity}', ''),
    NULLIF(guest_row.deep_payload #>> '{founderInputs,guided,persona,role}', ''),
    NULLIF(guest_row.deep_payload #>> '{draftDocument,customer,roleLine}', '')
  );

  INSERT INTO public.icp_analysis_results (
    user_id,
    business_description,
    target_audience,
    niche_score,
    verdict,
    analysis_data
  ) VALUES (
    p_user_id,
    COALESCE(business_description, ''),
    target_audience,
    CASE confidence_level WHEN 'high' THEN 82 WHEN 'medium' THEN 64 ELSE 41 END,
    CASE confidence_level WHEN 'high' THEN 'Highly Viable' WHEN 'medium' THEN 'Promising' ELSE 'Needs Refinement' END,
    guest_row.deep_payload
  )
  RETURNING id INTO analysis_id;

  UPDATE public.guest_activation_artifacts
  SET claimed_by = p_user_id,
      claim_state = 'claimed',
      native_artifact_id = analysis_id::TEXT,
      claimed_at = now(),
      updated_at = now()
  WHERE id = p_guest_id;

  RETURN analysis_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_guest_icp_artifact(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_icp_artifact(UUID, UUID) TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.prune_expired_guest_activation_artifacts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.guest_activation_artifacts
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_expired_guest_activation_artifacts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_expired_guest_activation_artifacts() TO service_role, postgres;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-guest-activation-artifacts-daily') THEN
      PERFORM cron.unschedule('prune-guest-activation-artifacts-daily');
    END IF;
    PERFORM cron.schedule(
      'prune-guest-activation-artifacts-daily',
      '17 4 * * *',
      'SELECT public.prune_expired_guest_activation_artifacts();'
    );
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_function THEN
    -- Local Supabase stacks may omit pg_cron; the function remains callable by
    -- the platform scheduler in those environments.
    NULL;
END;
$$;
