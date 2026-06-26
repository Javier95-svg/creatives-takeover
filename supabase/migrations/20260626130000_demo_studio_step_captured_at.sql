-- Demo Studio anti-staleness: track when each step's screenshot was captured so the
-- editor/analytics can prompt founders to refresh demos that have gone stale after a
-- product UI change. Backfill existing image steps from created_at.

ALTER TABLE public.demo_studio_demo_steps
  ADD COLUMN IF NOT EXISTS asset_captured_at timestamptz;

UPDATE public.demo_studio_demo_steps
  SET asset_captured_at = created_at
  WHERE asset_captured_at IS NULL AND asset_url IS NOT NULL;

COMMENT ON COLUMN public.demo_studio_demo_steps.asset_captured_at IS
  'When this step''s screenshot was captured/last replaced. Drives the staleness prompt.';
