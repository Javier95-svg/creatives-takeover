-- Delivery is recorded separately from eligibility. A failed email must not
-- silently turn a valid invitation into a completed communication.
ALTER TABLE public.account_invitations
  ADD COLUMN IF NOT EXISTS last_emailed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_email_error text;
