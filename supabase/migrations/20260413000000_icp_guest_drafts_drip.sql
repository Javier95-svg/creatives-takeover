-- Add drip-email tracking columns to icp_guest_drafts.
-- followup_count  : how many drip emails have been sent after the initial delivery (0, 1, or 2)
-- next_followup_at: when the next drip email should fire; NULL when the sequence is complete
-- converted_at    : set when the guest resumes and creates an account — stops the drip

ALTER TABLE public.icp_guest_drafts
  ADD COLUMN IF NOT EXISTS followup_count     INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_followup_at   TIMESTAMPTZ  NULL,
  ADD COLUMN IF NOT EXISTS converted_at       TIMESTAMPTZ  NULL;

-- Index used by process-icp-guest-drip to fetch pending rows efficiently
CREATE INDEX IF NOT EXISTS idx_icp_guest_drafts_drip
  ON public.icp_guest_drafts (next_followup_at)
  WHERE converted_at IS NULL AND followup_count < 2;
