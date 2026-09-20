-- Two problems, one migration.
--
-- 1. A mentor, marketplace member or investor who picks their type in the quiz
--    exits at step 0 and never reaches handleComplete(), so onboarding_completed
--    is never written. shouldRedirectToGuidedOnboarding() ends with
--    `onboarding_completed !== true`, so / and /dashboard redirect to
--    /onboarding forever, which re-shows the founder quiz. Nobody is affected
--    yet only because the 59 existing accounts came from a backfill and had
--    already onboarded.
--
--    They HAVE finished their onboarding: theirs is two questions long. So the
--    submission marks it complete and drops requires_guided_onboarding, all in
--    one statement rather than a read-modify-write from the client that would
--    race anything else touching user_preferences.
--
-- 2. Account type has to reach the shell, the sidebar, the home and the
--    dashboard without four round trips. account_context() is that one call.

-- The per-type profile answers. One jsonb rather than a column per field, so a
-- sixth account type is an entry in the schema module and no migration at all.
-- Contents are validated in src/lib/roleProfileSchema.ts, which drives both the
-- onboarding step and the profile editor from the same definition.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_profile jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.submit_account_application(
  p_user_type text,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_application_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to send this request';
  END IF;

  IF p_user_type NOT IN ('mentor', 'marketplace', 'investor') THEN
    RAISE EXCEPTION 'Only mentor, marketplace and investor requests are reviewed';
  END IF;

  UPDATE public.profiles
  SET user_type = p_user_type,
      approval_status = 'pending',
      -- Their onboarding is over. Without this the entry gate sends them
      -- straight back into the founder quiz on every load.
      onboarding_completed = true,
      quiz_completed = true,
      user_preferences = COALESCE(user_preferences, '{}'::jsonb) - 'requires_guided_onboarding',
      updated_at = now()
  WHERE id = v_user;

  INSERT INTO public.account_applications (user_id, user_type, full_name, email)
  VALUES (
    v_user,
    p_user_type,
    NULLIF(btrim(COALESCE(p_full_name, '')), ''),
    NULLIF(btrim(COALESCE(p_email, '')), '')
  )
  -- A second submission is the intended outcome of the one-pending index, not
  -- an error the applicant needs to see.
  ON CONFLICT (user_id) WHERE status = 'pending' DO NOTHING
  RETURNING id INTO v_application_id;

  RETURN jsonb_build_object('applicationId', v_application_id, 'userType', p_user_type);
END;
$function$;

COMMENT ON FUNCTION public.submit_account_application(text, text, text) IS
  'Files a mentor, marketplace or investor request and settles the account in one statement. Marks onboarding complete because theirs is two questions long, which is what stops the entry gate looping them back into the founder quiz.';

-- Everything the workspace needs to know about who is signed in, in one call.
-- Absorbs the project_setup_status payload so the shell, sidebar, home and
-- dashboard share a single round trip.
CREATE OR REPLACE FUNCTION public.account_context()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'userType', COALESCE(p.user_type, 'founder'),
    'approvalStatus', COALESCE(p.approval_status, 'approved'),
    -- Founders and builders are always in. The other three need a decision.
    'hasCategoryAccess',
      COALESCE(p.user_type, 'founder') IN ('founder', 'builder')
      OR COALESCE(p.approval_status, 'approved') = 'approved',
    'roleProfile', COALESCE(p.role_profile, '{}'::jsonb),
    'requiresProject', NOT public.is_service_provider(auth.uid()),
    'hasProject', EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.user_id = auth.uid() AND pr.archived_at IS NULL
    ),
    'startupName', NULLIF(btrim(p.startup_name), '')
  )
  FROM public.profiles p
  WHERE p.id = auth.uid();
$function$;

COMMENT ON FUNCTION public.account_context() IS
  'Account type, approval and project state for the signed-in user, in one call. The client defaults to founder and approved while this is in flight, so no type-specific UI can flash at the wrong person.';

GRANT EXECUTE ON FUNCTION public.submit_account_application(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_context() TO authenticated;
