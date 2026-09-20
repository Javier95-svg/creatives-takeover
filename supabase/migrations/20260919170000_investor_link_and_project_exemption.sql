-- Investors get no feature of their own: platform access and the founder
-- network, which every account already has. What was missing is the link
-- between an approved investor account and its directory entry, which mentors
-- have through mentors.user_id and marketplace providers through
-- services.delivered_by_user_id. Publishing stays admin only for all three.
ALTER TABLE public.angel_investors
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS angel_investors_user_id_idx
  ON public.angel_investors (user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN public.angel_investors.user_id IS
  'The approved investor account this directory entry belongs to. Set by an admin, mirroring mentors.user_id.';

-- A project is not mandatory for mentors, marketplace providers or investors.
-- They are welcome to start one, and five already have; they are simply never
-- asked for one.
--
-- This function answers only that question. It does not grant or withhold
-- anything: creating a project is governed by the projects RLS policy, which is
-- auth.uid() = user_id and looks at no account type at all.
--
-- It previously read only the mentors and services tables, which predates
-- investors existing. An approved investor is in neither, so the mandatory
-- project prompt would have chased them for a venture they are not here to
-- build. The account type is now the primary signal, with the directory tables
-- kept as a fallback for accounts that predate user_type.
CREATE OR REPLACE FUNCTION public.is_service_provider(target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = target_id
        AND p.user_type IN ('mentor', 'marketplace', 'investor')
    )
    OR EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.user_id = target_id AND COALESCE(m.is_active, true)
    )
    OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.delivered_by_user_id = target_id AND COALESCE(s.is_active, true)
    )
    OR EXISTS (
      SELECT 1 FROM public.angel_investors a
      WHERE a.user_id = target_id AND COALESCE(a.is_active, true)
    );
$function$;

COMMENT ON FUNCTION public.is_service_provider(uuid) IS
  'Whether a project is optional for this account. True for mentors, marketplace providers and investors, by account type or by a live directory entry. They may still create one; they are never required to.';

-- Match the account type to what the platform already publishes about someone,
-- so the five-way classification and the directories agree.
UPDATE public.profiles p
SET user_type = 'mentor'
WHERE p.user_type IN ('founder', 'builder')
  AND EXISTS (SELECT 1 FROM public.mentors m WHERE m.user_id = p.id AND COALESCE(m.is_active, true));

UPDATE public.profiles p
SET user_type = 'marketplace'
WHERE p.user_type IN ('founder', 'builder')
  AND EXISTS (SELECT 1 FROM public.services s WHERE s.delivered_by_user_id = p.id AND COALESCE(s.is_active, true));
