-- App Builder: custom domain management
-- Each project (identified by a client-side UUID) can have one custom domain.
-- Supports both apex domains (A record) and subdomains (CNAME).

CREATE TABLE IF NOT EXISTS public.app_builder_domains (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           TEXT        NOT NULL,
  user_id              UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  domain               TEXT        NOT NULL,
  verification_token   TEXT        NOT NULL,

  -- DNS state
  txt_verified         BOOLEAN     NOT NULL DEFAULT FALSE,
  routing_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
  status               TEXT        NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'verified', 'failed')),
  verified_at          TIMESTAMPTZ,
  last_checked_at      TIMESTAMPTZ,

  -- Computed DNS record values persisted so the UI is consistent across reloads
  txt_host             TEXT,
  txt_value            TEXT,
  routing_record_type  TEXT        CHECK (routing_record_type IN ('A', 'CNAME')),
  routing_host         TEXT,
  routing_values       TEXT[],

  -- Full verification details from the last check (JSON blob)
  verification_details JSONB,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(project_id)
);

ALTER TABLE public.app_builder_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own domain records"
  ON public.app_builder_domains
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION public.update_app_builder_domains_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_builder_domains_updated_at
  BEFORE UPDATE ON public.app_builder_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_app_builder_domains_updated_at();
