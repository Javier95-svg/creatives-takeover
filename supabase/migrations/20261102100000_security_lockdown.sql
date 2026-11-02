-- Security lockdown, phase 0 (2026-11-02).
--
-- The 2026-11-01 audit found that anyone holding the public anon key could:
--   * set their own credit balance and plan (user_credits / profiles rows were
--     writable by their owner, billing columns included);
--   * call SECURITY DEFINER functions that act for any user id they pass
--     (increment_credit_balance, purchase/refund/grant MVP credits, referral
--     rewards, reputation, account emails, notifications...);
--   * list and download every object in every storage bucket once signed in
--     (a SELECT policy with no bucket filter), and upload into any bucket;
--   * overwrite admin-managed content (mentors, site images).
--
-- This migration closes those paths. It is written to be safe to run once and
-- idempotent where Postgres allows. Run 20261102101000 only after the app
-- release that calls the new *_mine functions is live.

-- 1. Credits, plans and billing fields -------------------------------------

-- Balances, quotas and the ledger change only through server code (service
-- role and SECURITY DEFINER functions). Owners keep read access.
DROP POLICY IF EXISTS "Users can update their own credit row" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert their credit row" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert their credit transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users manage own quotas" ON public.user_monthly_quotas;
DROP POLICY IF EXISTS "Users can view own quotas" ON public.user_monthly_quotas;
CREATE POLICY "Users can view own quotas"
  ON public.user_monthly_quotas FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own reputation" ON public.user_reputation;

-- Owners may edit their profile, but not its billing fields. Direct API writes
-- run as anon/authenticated; webhooks, the service role and SECURITY DEFINER
-- functions run as another role and are unaffected. Not SECURITY DEFINER on
-- purpose: current_user must be the caller.
CREATE OR REPLACE FUNCTION public.guard_profile_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.subscription_tier := 'rookie';
      NEW.subscribed := false;
      NEW.stripe_customer_id := NULL;
      NEW.subscription_end := NULL;
      NEW.billing_cycle := NULL;
      NEW.credit_balance := 0;
      NEW.monthly_credits := 10;
    ELSE
      NEW.subscription_tier := OLD.subscription_tier;
      NEW.subscribed := OLD.subscribed;
      NEW.stripe_customer_id := OLD.stripe_customer_id;
      NEW.subscription_end := OLD.subscription_end;
      NEW.billing_cycle := OLD.billing_cycle;
      NEW.credit_balance := OLD.credit_balance;
      NEW.monthly_credits := OLD.monthly_credits;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_billing_fields ON public.profiles;
CREATE TRIGGER guard_profile_billing_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_billing_fields();

-- 2. Caller-scoped versions of the browser's user-id functions ---------------

-- The app called these seven with p_user_id = the signed-in user. Anyone could
-- pass someone else's id. These versions take the user from the session; the
-- originals stay for server code and are closed to the API by 20261102101000.
CREATE OR REPLACE FUNCTION public.check_and_award_badges_mine()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  RETURN public.check_and_award_badges(v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_increment_usage_mine(p_feature_name text, p_increment_by integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  -- A negative increment would reset the counter.
  IF p_increment_by IS NULL OR p_increment_by < 1 OR p_increment_by > 100 THEN
    RAISE EXCEPTION 'Invalid increment' USING ERRCODE = '22023';
  END IF;
  RETURN public.check_and_increment_usage(v_user, p_feature_name, p_increment_by);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_daily_challenge_mine(
  p_challenge_id uuid,
  p_proof_reference_id uuid DEFAULT NULL,
  p_proof_reference_type text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  RETURN public.complete_daily_challenge(v_user, p_challenge_id, p_proof_reference_id, p_proof_reference_type);
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_mvp_credits_atomic_mine(
  p_amount integer,
  p_feature text,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  -- A negative amount would add credits.
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;
  RETURN public.deduct_mvp_credits_atomic(v_user, p_amount, p_feature, p_reason, coalesce(p_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_mvp_credit_balance_mine()
RETURNS public.mvp_credit_balances LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  -- The app always passed 'rookie' (it only creates a missing row); the plan
  -- is never taken from the caller.
  RETURN public.ensure_mvp_credit_balance(v_user, 'rookie');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code_mine()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  RETURN public.generate_referral_code(v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_deadline_expired_mine()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  RETURN public.notify_task_deadline_expired(v_user);
END;
$$;

-- 3. Database functions: callable only when the app uses them -----------------

-- 177 SECURITY DEFINER functions are used by the app (quoted in src/
-- or api/, referenced by an RLS policy, a column default, a view, an invoker
-- function or a check constraint, or called through the caller's own client in
-- an edge function). The other 194 (94 trigger functions, functions
-- nothing calls from outside, and server-only ones such as
-- increment_credit_balance, purchase/refund/grant MVP credits, referral
-- rewards, reputation points, account emails and notifications) are closed to
-- anon and authenticated. The service role, triggers and other SECURITY
-- DEFINER functions keep working: they do not need the API roles' grant.
DO $$
DECLARE
  r record;
  v_keep text[] := ARRAY[
    'abandon_onboarding_v1',
    'account_context',
    'account_home_digest',
    'account_onboarding_funnel',
    'act_on_task_recommendation_v1',
    'admin_adoption_metrics',
    'admin_discovery_funnel',
    'admin_rooms_engagement',
    'admin_update_first_customer_sprint_checkpoint_v1',
    'answer_founder_stage_boundary_v1',
    'attach_first_customer_sprint_contact_v1',
    'begin_onboarding_v1',
    'block_cofounder_interest_v1',
    'browse_cofounder_listings_v1',
    'calculate_business_success_score',
    'calculate_founder_profile_completeness',
    'can_view_accelerator',
    'can_view_demo_call',
    'can_view_vc',
    'capture_my_attribution',
    'check_and_award_badges',
    'check_and_increment_usage',
    'claim_first_use_gift',
    'claim_referral',
    'cohort_context_v1',
    'cohort_dashboard_v1',
    'cohort_invite_v1',
    'cohort_pilot_plan_v1',
    'cohort_showcase_membership_v1',
    'cohort_showcase_settings_v1',
    'complete_daily_challenge',
    'complete_first_customer_sprint_v1',
    'complete_onboarding_v1',
    'complete_rooms_reply_cues_v1',
    'complete_user_return_cue_v1',
    'compute_monthly_billing_window',
    'confirm_founder_stage_v1',
    'connection_count',
    'create_message_group_v1',
    'create_next_market_experiment_version_v1',
    'create_or_get_direct_conversation',
    'deduct_mvp_credits_atomic',
    'edit_direct_message_v1',
    'ensure_mvp_credit_balance',
    'entity_analytics',
    'evaluate_market_experiment_v1',
    'generate_referral_code',
    'get_activation_funnel_v2',
    'get_angel_contacts_v1',
    'get_cofounder_marketplace_admin_v1',
    'get_cofounder_matches_v1',
    'get_credit_wallet_summary',
    'get_credit_wallet_v1',
    'get_current_billing_period_start',
    'get_dashboard_snapshot_v2',
    'get_dashboard_snapshot_v3',
    'get_dashboard_snapshot_v4',
    'get_direct_message_quote_v1',
    'get_feature_usage',
    'get_first_customer_sprint_cohort_admin_v1',
    'get_first_customer_sprint_snapshot_v1',
    'get_founder_cycle_snapshot_v1',
    'get_founder_stage_accuracy_v1',
    'get_inbox_v1',
    'get_inbox_v2',
    'get_mentor_discovery_call_availability',
    'get_mentor_discovery_call_availability_bulk',
    'get_message_page_v1',
    'get_message_page_v2',
    'get_message_performance_summary_v1',
    'get_monthly_accelerator_view_count',
    'get_monthly_directory_view_count',
    'get_monthly_vc_view_count',
    'get_mvp_retention_snapshot',
    'get_my_cofounder_listing_v1',
    'get_my_first_customer_sprint_application_v1',
    'get_my_outcome_journey_v1',
    'get_notification_actor_info',
    'get_onboarding_dashboard_outcomes_v1',
    'get_outcome_journey_pilot_scorecard_v1',
    'get_post_author_info',
    'get_recommendation_learning_report_v2',
    'get_today_task_plan_v1',
    'get_todays_challenge',
    'get_traction_category_benchmarks',
    'get_user_normalized_subscription_tier',
    'get_workspace_header_counts',
    'grant_monthly_credits',
    'has_completed_todays_challenge',
    'has_role',
    'investor_matches',
    'is_cohort_member',
    'is_demo_call_participant',
    'is_discovery_call_admin',
    'is_service_marketplace_admin',
    'is_username_available',
    'join_cohort_v1',
    'launchpad_enter_launch',
    'launchpad_round',
    'launchpad_supporter_status',
    'launchpad_toggle_launch_vote',
    'launchpad_topic_stats',
    'leave_cohort_v1',
    'link_first_customer_proof_to_gtm_v1',
    'list_account_applications',
    'list_account_invitations',
    'manage_account_invitation',
    'mark_conversation_read_v1',
    'mentor_bookings',
    'mentor_interest',
    'moderate_cofounder_report_v1',
    'my_account_invitation_types',
    'notify_task_deadline_expired',
    'owns_demo_call',
    'project_outcomes',
    'public_cohort_showcase_v1',
    'public_founder_progress_v1',
    'public_profile_connections_v1',
    'public_profile_support_v1',
    'publish_cofounder_listing_v2',
    'record_analytics_consent',
    'record_customer_evidence_event_v1',
    'record_entity_view',
    'record_founder_cycle_action_feedback_v1',
    'record_founder_stage_evidence_v1',
    'record_message_performance_v1',
    'record_recommendation_decision_v1',
    'record_recommendation_feedback_v1',
    'record_recommendation_outcome_v1',
    'record_retention_email_return',
    'record_roadmap_activity',
    'record_section_time',
    'record_section_visit',
    'remove_profile_connection_v1',
    'renew_cofounder_listing_v2',
    'reorder_today_task_plan_v1',
    'report_cofounder_target_v1',
    'report_profile_support_link_v1',
    'request_first_customer_sprint_checkpoint_v1',
    'respond_cofounder_interest_v1',
    'restore_demo_edit',
    'review_account_application',
    'review_first_customer_sprint_application_v1',
    'review_journey_evidence_v1',
    'save_cofounder_listing_draft_v2',
    'save_onboarding_progress_v1',
    'search_message_recipients_v1',
    'search_message_recipients_v2',
    'search_messages',
    'segment_check_needed',
    'send_cofounder_interest_v1',
    'send_direct_message_v2',
    'send_group_message_v1',
    'send_voice_message_v1',
    'set_cofounder_listing_status_v2',
    'set_cohort_showcase_opt_in_v1',
    'set_cohort_showcase_v1',
    'set_conversation_state_v1',
    'set_message_context_v1',
    'set_message_request_status_v1',
    'soft_delete_message_v1',
    'start_first_customer_sprint_v1',
    'start_outcome_journey_v1',
    'state_founder_segment',
    'submit_account_application',
    'submit_first_customer_sprint_application_v1',
    'submit_first_customer_sprint_review_v1',
    'submit_journey_evidence_v1',
    'sync_founder_stage_state_v1',
    'transition_founder_customer_contact_v1',
    'update_cofounder_listing_v2',
    'update_first_customer_sprint_v1',
    'update_onboarding_focus_v1',
    'upsert_founder_customer_contact_v1',
    'upsert_founder_cycle_state_v1',
    'upsert_user_return_cue_v1',
    'withdraw_cofounder_interest_v1'
  ]::text[];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    IF r.proname LIKE '%\_mine' ESCAPE '\' THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    ELSIF NOT (r.proname = ANY (v_keep)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    END IF;
  END LOOP;
END;
$$;

-- New functions start closed. A migration that adds a function the browser
-- calls must GRANT EXECUTE to authenticated (or anon) explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- 4. Storage -----------------------------------------------------------------

-- These two had no bucket filter: any signed-in user could list and download
-- every object in every bucket (private ones included), and upload anywhere.
DROP POLICY IF EXISTS "Authenticated users can view collaboration files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;

-- Buckets holding private user files: no public URLs. The app reads them with
-- signed URLs or authenticated downloads.
UPDATE storage.buckets SET public = false
WHERE id IN ('cv-uploads', 'message-attachments', 'chatbot-attachments', 'dashboard-files', 'collaboration-files');

-- CVs: the applicant writes into their own folder; the applicant and admins read.
DROP POLICY IF EXISTS "cv_uploads_owner_insert" ON storage.objects;
CREATE POLICY "cv_uploads_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cv-uploads' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
DROP POLICY IF EXISTS "cv_uploads_owner_or_admin_read" ON storage.objects;
CREATE POLICY "cv_uploads_owner_or_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'cv-uploads' AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  ));

-- Collaboration files are stored as <session>/<user>/<file>.
DROP POLICY IF EXISTS "collaboration_files_owner_insert" ON storage.objects;
CREATE POLICY "collaboration_files_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'collaboration-files' AND (storage.foldername(name))[2] = (SELECT auth.uid())::text);
DROP POLICY IF EXISTS "collaboration_files_owner_or_admin_read" ON storage.objects;
CREATE POLICY "collaboration_files_owner_or_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'collaboration-files' AND (
    (storage.foldername(name))[2] = (SELECT auth.uid())::text
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  ));

-- Site images managed by admins only.
DROP POLICY IF EXISTS "Authenticated users can upload hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete hero images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete mentor pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete story banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload value proposition images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update value proposition images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete value proposition images" ON storage.objects;

DROP POLICY IF EXISTS "admin_site_images_insert" ON storage.objects;
CREATE POLICY "admin_site_images_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('hero-images', 'mentor-pictures', 'story-banners', 'value-proposition-images', 'angel-pictures', 'angel-investor-pics')
    AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );
DROP POLICY IF EXISTS "admin_site_images_update" ON storage.objects;
CREATE POLICY "admin_site_images_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('hero-images', 'mentor-pictures', 'story-banners', 'value-proposition-images', 'angel-pictures', 'angel-investor-pics')
    AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );
DROP POLICY IF EXISTS "admin_site_images_delete" ON storage.objects;
CREATE POLICY "admin_site_images_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('hero-images', 'mentor-pictures', 'story-banners', 'value-proposition-images', 'angel-pictures', 'angel-investor-pics')
    AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  );

-- public-assets: members upload waitlist images into their own folder
-- (<user>/waitlists/...); admins upload VC and accelerator logos anywhere.
DROP POLICY IF EXISTS "Authenticated users can upload public assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update public assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete public assets" ON storage.objects;
DROP POLICY IF EXISTS "public_assets_owner_or_admin_insert" ON storage.objects;
CREATE POLICY "public_assets_owner_or_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'public-assets' AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  ));
DROP POLICY IF EXISTS "public_assets_owner_or_admin_update" ON storage.objects;
CREATE POLICY "public_assets_owner_or_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'public-assets' AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  ));
DROP POLICY IF EXISTS "public_assets_owner_or_admin_delete" ON storage.objects;
CREATE POLICY "public_assets_owner_or_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'public-assets' AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  ));

-- 5. Admin-managed content ---------------------------------------------------

-- Any signed-in user could insert, edit or delete mentors (payout and contact
-- fields included). Only the admin editor writes this table.
DROP POLICY IF EXISTS "Authenticated users can create mentors" ON public.mentors;
DROP POLICY IF EXISTS "Authenticated users can update mentors" ON public.mentors;
DROP POLICY IF EXISTS "Authenticated users can delete mentors" ON public.mentors;
DROP POLICY IF EXISTS "Admins can create mentors" ON public.mentors;
DROP POLICY IF EXISTS "Admins can update mentors" ON public.mentors;
DROP POLICY IF EXISTS "Admins can delete mentors" ON public.mentors;
CREATE POLICY "Admins can create mentors" ON public.mentors FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admins can update mentors" ON public.mentors FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Admins can delete mentors" ON public.mentors FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 6. Remaining API exposure --------------------------------------------------

REVOKE SELECT ON public.admin_reputation_analytics FROM anon, authenticated;

DROP POLICY IF EXISTS "Service role can manage refresh jobs" ON public.data_refresh_jobs;
CREATE POLICY "Service role can manage refresh jobs" ON public.data_refresh_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert analytics" ON public.founder_analytics;
CREATE POLICY "Service role can insert analytics" ON public.founder_analytics
  FOR INSERT TO service_role WITH CHECK (true);

-- 7. The account that set its own balance ------------------------------------

-- Signed up 2026-03-04 and never signed in again; its row held 69,697,969
-- credits and the 'pro' label with no subscription behind either. Its ledger
-- holds only the 25-credit signup grant. Reset to that, and record why.
UPDATE public.user_credits
SET balance = 25, subscription_tier = 'rookie', updated_at = now()
WHERE user_id = '8bcc515e-c6f1-4b4a-917a-ee9b7f71299b' AND balance > 1000;

INSERT INTO public.credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
SELECT '8bcc515e-c6f1-4b4a-917a-ee9b7f71299b', 0, 'adjustment', 'security_reset',
  'security_lockdown_2026_11_02',
  jsonb_build_object('note', 'Balance written outside the ledger reset to the ledger total (25).')
WHERE NOT EXISTS (
  SELECT 1 FROM public.credit_transactions
  WHERE user_id = '8bcc515e-c6f1-4b4a-917a-ee9b7f71299b' AND reason = 'security_reset'
);

NOTIFY pgrst, 'reload schema';
