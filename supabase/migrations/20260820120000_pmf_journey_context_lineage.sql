-- Additive lineage for exact project/context continuation. Legacy outcomes remain
-- visible with null lineage and are never assigned to a context automatically.

ALTER TABLE public.journey_outcomes
  ADD COLUMN IF NOT EXISTS validation_context_id uuid
    REFERENCES public.prebuild_validation_contexts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_handoff_id uuid
    REFERENCES public.journey_handoffs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS artifact_version text;

CREATE INDEX IF NOT EXISTS journey_outcomes_context_idx
  ON public.journey_outcomes(user_id, validation_context_id, tool, updated_at DESC);

COMMENT ON COLUMN public.journey_outcomes.validation_context_id IS
  'Owner-scoped validation context explicitly selected by the founder; null means legacy or unscoped.';
COMMENT ON COLUMN public.journey_outcomes.source_handoff_id IS
  'Exact handoff consumed to create this outcome. Never inferred from another project.';
