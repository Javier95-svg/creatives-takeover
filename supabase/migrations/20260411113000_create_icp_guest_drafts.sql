CREATE TABLE IF NOT EXISTS public.icp_guest_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  artifact JSONB NOT NULL,
  builder_payload JSONB NOT NULL,
  delivered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days')
);

ALTER TABLE public.icp_guest_drafts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_icp_guest_drafts_resume_token
  ON public.icp_guest_drafts (resume_token);

CREATE INDEX IF NOT EXISTS idx_icp_guest_drafts_expires_at
  ON public.icp_guest_drafts (expires_at DESC);
