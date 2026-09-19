-- A project is mandatory for founders and builders, and only for them.
--
-- The one-outcome-per-project rule only means anything if every founder has a
-- project to hold those outcomes. 190 of the 209 non-provider accounts have
-- none, because projects arrived after they signed up.
--
-- Mentors and marketplace providers are on the platform to offer a service, not
-- to build a venture, so they are exempt. The two signals are the same ones the
-- account search already uses for its Mentor and Marketplace tags, so a person
-- is exempt here exactly when they are labelled a provider there. Nothing stops
-- a provider from having a project; five already do.

CREATE OR REPLACE FUNCTION public.is_service_provider(target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.mentors m
    WHERE m.user_id = target_id AND COALESCE(m.is_active, true)
  ) OR EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.delivered_by_user_id = target_id AND COALESCE(s.is_active, true)
  );
$function$;

COMMENT ON FUNCTION public.is_service_provider(uuid) IS
  'True for mentors and marketplace providers. Same signals the account search uses for its Mentor and Marketplace tags, so the two can never disagree.';

-- Definer because it reads mentors and services, which a normal account cannot
-- freely scan, and because the answer is about the caller rather than about
-- anyone else's rows.
CREATE OR REPLACE FUNCTION public.project_setup_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    -- A provider needs no project. Anyone else who has signed up does.
    'requiresProject', auth.uid() IS NOT NULL AND NOT public.is_service_provider(auth.uid()),
    'hasProject', EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.user_id = auth.uid() AND p.archived_at IS NULL
    ),
    -- Carried through so the prompt can seed the name from what the founder
    -- already told us, rather than asking for it twice.
    'startupName', (SELECT NULLIF(btrim(pr.startup_name), '') FROM public.profiles pr WHERE pr.id = auth.uid()),
    'segment', (SELECT pr.founder_segment FROM public.profiles pr WHERE pr.id = auth.uid())
  );
$function$;

COMMENT ON FUNCTION public.project_setup_status() IS
  'Whether the signed-in account must have a project and whether it has one, plus a seed for the name. Providers are exempt.';

GRANT EXECUTE ON FUNCTION public.is_service_provider(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_setup_status() TO authenticated;
