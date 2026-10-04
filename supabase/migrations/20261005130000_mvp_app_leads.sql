-- Form submissions from published MVP Builder apps ({slug}.creatives-takeover.com).
-- Written only by the mvp-app-lead edge function (service role) after a rate
-- limit and size checks; founders read and delete their own app's leads.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.mvp_app_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.mvp_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  message text,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_path text,
  visitor_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mvp_app_leads_sizes CHECK (
    octet_length(fields::text) <= 8000
    AND (email IS NULL OR char_length(email) <= 320)
    AND (name IS NULL OR char_length(name) <= 200)
    AND (message IS NULL OR char_length(message) <= 4000)
    AND (page_path IS NULL OR char_length(page_path) <= 300)
    AND (visitor_id IS NULL OR char_length(visitor_id) <= 64)
  )
);

CREATE INDEX IF NOT EXISTS mvp_app_leads_project_created_idx
  ON public.mvp_app_leads (project_id, created_at DESC);

ALTER TABLE public.mvp_app_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mvp_app_leads_owner_read ON public.mvp_app_leads;
CREATE POLICY mvp_app_leads_owner_read ON public.mvp_app_leads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS mvp_app_leads_owner_delete ON public.mvp_app_leads;
CREATE POLICY mvp_app_leads_owner_delete ON public.mvp_app_leads
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.mvp_app_leads FROM anon;
GRANT SELECT, DELETE ON public.mvp_app_leads TO authenticated;

COMMIT;
