-- Discovery Call Request Workflow V2: platform-owned scheduling negotiation,
-- credit holds, and hashed mentor action tokens.

ALTER TABLE public.discovery_calls
  ADD COLUMN IF NOT EXISTS workflow_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS request_topic TEXT,
  ADD COLUMN IF NOT EXISTS desired_outcome TEXT,
  ADD COLUMN IF NOT EXISTS founder_notes TEXT,
  ADD COLUMN IF NOT EXISTS founder_timezone TEXT,
  ADD COLUMN IF NOT EXISTS mentor_contact_email_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS founder_email_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meeting_instructions TEXT,
  ADD COLUMN IF NOT EXISTS confirmation_source TEXT,
  ADD COLUMN IF NOT EXISTS calendar_sequence INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_state_changed_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Provider columns are mandatory for legacy V1, but intentionally empty for
-- platform-owned V2 bookings.
ALTER TABLE public.discovery_calls ALTER COLUMN provider_name DROP NOT NULL;
ALTER TABLE public.discovery_calls ALTER COLUMN provider_name DROP DEFAULT;
ALTER TABLE public.discovery_calls
  ADD CONSTRAINT discovery_calls_v2_confirmed_meeting_details_check CHECK (
    workflow_version <> 2 OR confirmed_at IS NULL OR (
      length(COALESCE(meeting_instructions, '')) <= 1000
      AND (
        (meeting_url IS NOT NULL AND meeting_url ~* '^https://')
        OR length(COALESCE(meeting_instructions, '')) BETWEEN 10 AND 1000
      )
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS discovery_calls_one_active_mentor_pair_idx
  ON public.discovery_calls (founder_id, mentor_id)
  WHERE workflow_version = 2
    AND mentor_id IS NOT NULL
    AND status IN (
      'pending_mentor_response', 'pending_founder_response',
      'scheduled', 'awaiting_outcome'
    );

CREATE INDEX IF NOT EXISTS discovery_calls_v2_deadline_idx
  ON public.discovery_calls (response_due_at)
  WHERE workflow_version = 2
    AND status IN ('pending_mentor_response', 'pending_founder_response');

CREATE TABLE IF NOT EXISTS public.discovery_call_scheduling_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_call_id UUID NOT NULL REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  round_type TEXT NOT NULL CHECK (round_type IN ('initial', 'reschedule')),
  proposer_role TEXT NOT NULL CHECK (proposer_role IN ('founder', 'mentor', 'admin')),
  responder_role TEXT NOT NULL CHECK (responder_role IN ('founder', 'mentor')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'superseded', 'expired')),
  counter_depth SMALLINT NOT NULL DEFAULT 0 CHECK (counter_depth BETWEEN 0 AND 1),
  response_due_at TIMESTAMPTZ NOT NULL,
  reminder_24h_sent_at TIMESTAMPTZ,
  reminder_48h_sent_at TIMESTAMPTZ,
  accepted_slot_id UUID,
  meeting_url TEXT,
  meeting_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT discovery_call_round_meeting_url_check CHECK (
    meeting_url IS NULL OR meeting_url ~* '^https://'
  ),
  CONSTRAINT discovery_call_round_instructions_length_check CHECK (
    meeting_instructions IS NULL OR length(meeting_instructions) <= 1000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS discovery_call_one_pending_round_idx
  ON public.discovery_call_scheduling_rounds (discovery_call_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS discovery_call_rounds_due_idx
  ON public.discovery_call_scheduling_rounds (response_due_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.discovery_call_scheduling_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.discovery_call_scheduling_rounds(id) ON DELETE CASCADE,
  ordinal SMALLINT NOT NULL CHECK (ordinal BETWEEN 1 AND 3),
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes = 30),
  proposed_timezone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, ordinal),
  UNIQUE (round_id, starts_at)
);

ALTER TABLE public.discovery_call_scheduling_rounds
  DROP CONSTRAINT IF EXISTS discovery_call_rounds_accepted_slot_id_fkey;
ALTER TABLE public.discovery_call_scheduling_rounds
  ADD CONSTRAINT discovery_call_rounds_accepted_slot_id_fkey
  FOREIGN KEY (accepted_slot_id) REFERENCES public.discovery_call_scheduling_slots(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.discovery_call_credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_call_id UUID UNIQUE REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  listed_price INTEGER NOT NULL DEFAULT 10 CHECK (listed_price = 10),
  held_amount INTEGER NOT NULL DEFAULT 10 CHECK (held_amount = 10),
  used_from_quota INTEGER NOT NULL DEFAULT 0 CHECK (used_from_quota >= 0),
  used_from_balance INTEGER NOT NULL DEFAULT 0 CHECK (used_from_balance >= 0),
  billing_period_start TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'finalized', 'released', 'expired', 'refunded')),
  expires_at TIMESTAMPTZ NOT NULL,
  finalized_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  credit_transaction_id UUID REFERENCES public.credit_transactions(id) ON DELETE SET NULL,
  refund_transaction_id UUID REFERENCES public.credit_transactions(id) ON DELETE SET NULL,
  release_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CHECK (used_from_quota + used_from_balance = held_amount)
);

ALTER TABLE public.discovery_calls
  ADD COLUMN IF NOT EXISTS credit_reservation_id UUID
    REFERENCES public.discovery_call_credit_reservations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS discovery_call_reservations_expiry_idx
  ON public.discovery_call_credit_reservations (expires_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.discovery_call_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_call_id UUID NOT NULL REFERENCES public.discovery_calls(id) ON DELETE CASCADE,
  round_id UUID REFERENCES public.discovery_call_scheduling_rounds(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('mentor_request_response', 'mentor_booking_manage')),
  recipient_role TEXT NOT NULL CHECK (recipient_role = 'mentor'),
  token_hash TEXT NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discovery_call_action_tokens_call_idx
  ON public.discovery_call_action_tokens (discovery_call_id, purpose)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.discovery_call_portal_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discovery_call_scheduling_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_call_scheduling_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_call_credit_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_call_action_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_call_portal_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.discovery_calls FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.discovery_call_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.discovery_call_cycle_counters FROM anon, authenticated;

CREATE POLICY "Founders can read their discovery call rounds"
  ON public.discovery_call_scheduling_rounds FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.discovery_calls dc
    WHERE dc.id = discovery_call_id
      AND (dc.founder_id = auth.uid() OR public.is_discovery_call_admin(auth.uid()))
  ));
CREATE POLICY "Founders can read their discovery call slots"
  ON public.discovery_call_scheduling_slots FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.discovery_call_scheduling_rounds r
    JOIN public.discovery_calls dc ON dc.id = r.discovery_call_id
    WHERE r.id = round_id
      AND (dc.founder_id = auth.uid() OR public.is_discovery_call_admin(auth.uid()))
  ));
CREATE POLICY "Founders can read their discovery call holds"
  ON public.discovery_call_credit_reservations FOR SELECT
  USING (user_id = auth.uid() OR public.is_discovery_call_admin(auth.uid()));

REVOKE ALL ON public.discovery_call_scheduling_rounds FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.discovery_call_scheduling_slots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.discovery_call_credit_reservations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.discovery_call_action_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.discovery_call_portal_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.discovery_call_scheduling_rounds TO authenticated;
GRANT SELECT ON public.discovery_call_scheduling_slots TO authenticated;
GRANT SELECT ON public.discovery_call_credit_reservations TO authenticated;
GRANT ALL ON public.discovery_call_scheduling_rounds TO service_role;
GRANT ALL ON public.discovery_call_scheduling_slots TO service_role;
GRANT ALL ON public.discovery_call_credit_reservations TO service_role;
GRANT ALL ON public.discovery_call_action_tokens TO service_role;
GRANT ALL ON public.discovery_call_portal_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.set_discovery_call_v2_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS discovery_call_rounds_updated_at ON public.discovery_call_scheduling_rounds;
CREATE TRIGGER discovery_call_rounds_updated_at
  BEFORE UPDATE ON public.discovery_call_scheduling_rounds
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();
DROP TRIGGER IF EXISTS discovery_call_reservations_updated_at ON public.discovery_call_credit_reservations;
CREATE TRIGGER discovery_call_reservations_updated_at
  BEFORE UPDATE ON public.discovery_call_credit_reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_discovery_call_v2_updated_at();
