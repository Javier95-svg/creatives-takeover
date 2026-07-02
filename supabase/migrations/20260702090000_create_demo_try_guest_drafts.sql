-- Recovery loop for anonymous /demo-studio/try visitors: stores the generated
-- demo draft server-side so a resume email can bring the visitor back on any
-- device. Mirrors icp_guest_drafts (20260411113000 + 20260413000000) with two
-- fixes the ICP version lacks: an unsubscribed_at column for drip suppression,
-- and the drip columns included from day one.
--
-- artifact holds the client TryDraft JSON (v1: productName, contextUrl, steps
-- with downscaled JPEG data URLs) — typically 120-400KB; the edge function
-- rejects payloads over 1MB.

CREATE TABLE IF NOT EXISTS public.demo_try_guest_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  artifact JSONB NOT NULL,
  delivered_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  -- Drip tracking (see process-demo-try-drip):
  -- followup_count  : drip emails sent after initial delivery (0, 1, or 2)
  -- next_followup_at: when the next drip email fires; NULL when sequence done
  -- converted_at    : set when the guest resumes — stops the drip
  -- unsubscribed_at : set via the email unsubscribe link — stops the drip
  followup_count INTEGER NOT NULL DEFAULT 0,
  next_followup_at TIMESTAMPTZ NULL,
  converted_at TIMESTAMPTZ NULL,
  unsubscribed_at TIMESTAMPTZ NULL
);

ALTER TABLE public.demo_try_guest_drafts ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the service role (edge functions) touches this table.

CREATE INDEX IF NOT EXISTS idx_demo_try_guest_drafts_resume_token
  ON public.demo_try_guest_drafts (resume_token);

CREATE INDEX IF NOT EXISTS idx_demo_try_guest_drafts_expires_at
  ON public.demo_try_guest_drafts (expires_at DESC);

-- Index used by process-demo-try-drip to fetch pending rows efficiently
CREATE INDEX IF NOT EXISTS idx_demo_try_guest_drafts_drip
  ON public.demo_try_guest_drafts (next_followup_at)
  WHERE converted_at IS NULL AND unsubscribed_at IS NULL AND followup_count < 2;
