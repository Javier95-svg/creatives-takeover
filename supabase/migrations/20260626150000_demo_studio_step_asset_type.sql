-- Demo Studio HTML/DOM capture: a step's asset can now be an imported, self-contained
-- HTML snapshot (rendered in a sandboxed iframe) instead of a screenshot. asset_url holds
-- the .html URL when asset_type='html'. Existing rows stay 'image'.

ALTER TABLE public.demo_studio_demo_steps
  ADD COLUMN IF NOT EXISTS asset_type text NOT NULL DEFAULT 'image';

ALTER TABLE public.demo_studio_demo_steps
  DROP CONSTRAINT IF EXISTS demo_studio_demo_steps_asset_type_check;
ALTER TABLE public.demo_studio_demo_steps
  ADD CONSTRAINT demo_studio_demo_steps_asset_type_check CHECK (asset_type IN ('image', 'html'));

COMMENT ON COLUMN public.demo_studio_demo_steps.asset_type IS
  'image = screenshot in asset_url; html = self-contained HTML snapshot in asset_url, rendered in a sandboxed iframe.';
