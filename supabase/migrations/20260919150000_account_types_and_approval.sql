-- Five account types, three of which an admin has to approve.
--
-- Founders and builders keep the self serve flow and are approved on arrival.
-- Mentors, marketplace providers and investors are offering something to the
-- network rather than using it to build, so their request is reviewed first.
--
-- founder_segment already holds founder or builder for every profile. user_type
-- is the wider field that supersedes it, seeded from it here so nobody's
-- existing classification is lost, and the two stay consistent because the quiz
-- writes both.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type text,
  ADD COLUMN IF NOT EXISTS approval_status text;

UPDATE public.profiles
SET user_type = COALESCE(user_type, founder_segment, 'founder'),
    approval_status = COALESCE(approval_status, 'approved')
WHERE user_type IS NULL OR approval_status IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN user_type SET DEFAULT 'founder',
  ALTER COLUMN approval_status SET DEFAULT 'approved';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IN ('founder', 'builder', 'mentor', 'marketplace', 'investor'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- A founder or a builder is never pending. Stating it here means no code path
-- can leave one of them waiting on an approval that will never be reviewed.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_self_serve_is_approved;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_self_serve_is_approved
  CHECK (user_type NOT IN ('founder', 'builder') OR approval_status = 'approved');

CREATE TABLE IF NOT EXISTS public.account_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Only the reviewed types reach this table.
  user_type text NOT NULL CHECK (user_type IN ('mentor', 'marketplace', 'investor')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  full_name text,
  email text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One open request per account. Re-applying after a rejection is allowed,
-- because a partial index only covers the pending row.
CREATE UNIQUE INDEX IF NOT EXISTS account_applications_one_pending
  ON public.account_applications (user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS account_applications_status_submitted
  ON public.account_applications (status, submitted_at DESC);

ALTER TABLE public.account_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicants read their own request" ON public.account_applications;
CREATE POLICY "Applicants read their own request"
  ON public.account_applications FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin_user());

DROP POLICY IF EXISTS "Applicants create their own request" ON public.account_applications;
CREATE POLICY "Applicants create their own request"
  ON public.account_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Deliberately no UPDATE policy. A decision is only ever made through
-- review_account_application, which is admin only, so an applicant cannot
-- approve themselves by writing to their own row.
DROP POLICY IF EXISTS "Admins review requests" ON public.account_applications;
CREATE POLICY "Admins review requests"
  ON public.account_applications FOR UPDATE
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

COMMENT ON TABLE public.account_applications IS
  'Pending mentor, marketplace and investor requests. Founders and builders never appear here; they are approved on arrival.';

-- Outbox, mirroring the connection request notifications: the row records the
-- attempt so a failed send is visible rather than lost, and the dispatch is
-- fire and forget through net.http_post.
CREATE TABLE IF NOT EXISTS public.account_application_email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.account_applications(id) ON DELETE CASCADE,
  -- admin_alert goes to the reviewer; approved and rejected go to the applicant.
  kind text NOT NULL CHECK (kind IN ('admin_alert', 'approved', 'rejected')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped')),
  net_request_id bigint,
  resend_email_id text,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS account_application_email_once
  ON public.account_application_email_notifications (application_id, kind);

ALTER TABLE public.account_application_email_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read application email log" ON public.account_application_email_notifications;
CREATE POLICY "Admins read application email log"
  ON public.account_application_email_notifications FOR SELECT
  USING (public.is_admin_user());

CREATE OR REPLACE FUNCTION public.queue_account_application_email(p_application_id uuid, p_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_delivery_id uuid;
  v_request_id bigint;
  v_url text := (SELECT value FROM private.service_config WHERE key = 'supabase_url');
  v_service_key text := (SELECT value FROM private.service_config WHERE key = 'supabase_service_key');
BEGIN
  INSERT INTO public.account_application_email_notifications (application_id, kind, metadata)
  VALUES (p_application_id, p_kind, jsonb_build_object('queued_at_iso', now()::text))
  ON CONFLICT (application_id, kind) DO NOTHING
  RETURNING id INTO v_delivery_id;

  -- Already queued once. Re-approving is a no-op rather than a second email.
  IF v_delivery_id IS NULL THEN
    RETURN;
  END IF;

  IF v_url IS NULL OR v_service_key IS NULL THEN
    UPDATE public.account_application_email_notifications
    SET status = 'failed',
        last_error = 'private.service_config missing supabase_url or supabase_service_key',
        updated_at = now()
    WHERE id = v_delivery_id;
    RETURN;
  END IF;

  UPDATE public.account_application_email_notifications
  SET status = 'sending', updated_at = now()
  WHERE id = v_delivery_id;

  SELECT net.http_post(
    url := v_url || '/functions/v1/send-account-application-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object('applicationId', p_application_id, 'kind', p_kind)
  ) INTO v_request_id;

  UPDATE public.account_application_email_notifications
  SET net_request_id = v_request_id, updated_at = now()
  WHERE id = v_delivery_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_account_application_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  PERFORM public.queue_account_application_email(NEW.id, 'admin_alert');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS account_application_created ON public.account_applications;
CREATE TRIGGER account_application_created
  AFTER INSERT ON public.account_applications
  FOR EACH ROW EXECUTE FUNCTION public.on_account_application_created();

-- The one way a decision is made. Definer so it can write the profile, and
-- guarded so only an admin can call it whatever the client sends.
CREATE OR REPLACE FUNCTION public.review_account_application(
  p_application_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_app public.account_applications%ROWTYPE;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Only an administrator can review account applications';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  SELECT * INTO v_app FROM public.account_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.status <> 'pending' THEN
    RETURN jsonb_build_object('status', v_app.status, 'alreadyReviewed', true);
  END IF;

  UPDATE public.account_applications
  SET status = p_decision,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      decision_note = p_note,
      updated_at = now()
  WHERE id = p_application_id;

  -- A rejected account keeps its requested type but stays unapproved, so the
  -- category gates refuse it and nothing else about the account changes.
  UPDATE public.profiles
  SET approval_status = p_decision,
      updated_at = now()
  WHERE id = v_app.user_id;

  PERFORM public.queue_account_application_email(p_application_id, p_decision);

  RETURN jsonb_build_object('status', p_decision, 'alreadyReviewed', false);
END;
$function$;

-- Listing is admin only and returns what the review screen shows, nothing more.
CREATE OR REPLACE FUNCTION public.list_account_applications(p_status text DEFAULT 'pending')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'submittedAt' DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', a.id,
      'userId', a.user_id,
      'userType', a.user_type,
      'status', a.status,
      'fullName', COALESCE(NULLIF(btrim(a.full_name), ''), p.full_name),
      'email', a.email,
      'username', p.username,
      'submittedAt', a.submitted_at,
      'reviewedAt', a.reviewed_at,
      'decisionNote', a.decision_note
    ) AS row
    FROM public.account_applications a
    LEFT JOIN public.profiles p ON p.id = a.user_id
    WHERE public.is_admin_user()
      AND (p_status IS NULL OR a.status = p_status)
    LIMIT 500
  ) rows;
$function$;

REVOKE ALL ON FUNCTION public.queue_account_application_email(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_account_application(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_account_applications(text) TO authenticated;
