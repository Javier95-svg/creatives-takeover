-- Fix the two errors that have been breaking the founder dashboard since 30 July 2026.
--
-- `dashboard_snapshot_failed` fires from DashboardDataContext when the snapshot RPC
-- throws. In the eight weeks to 23 August it fired 131 times across 5 distinct users,
-- against a base of roughly 15 monthly actives. Two distinct causes, both reproduced:
--
--   42P01  get_dashboard_snapshot_v1 line 717 reads public.user_funding_bookmarks,
--          which does not exist on this database. The migration that creates it
--          (20251109001311_create_user_funding_bookmarks.sql) is in the repo but was
--          never applied here, so v3 -> v2 -> v1 aborts for every caller.
--
--   42P17  get_dashboard_snapshot_v1 line 524 reads public.demo_calls. The SELECT
--          policy on demo_calls subqueries demo_call_participants, whose own SELECT
--          policy subqueries demo_calls *and* demo_call_participants. Reading either
--          table loops until Postgres gives up. Both tables are empty, so a feature
--          with zero rows has been taking down the primary logged-in surface.
--
-- The client asks for v3 first, which is SECURITY DEFINER and so survives the RLS
-- recursion but still hits the missing table. Its error message carries the PL/pgSQL
-- CONTEXT chain naming v2, which the client's fallback matched on, so it then called
-- v1 directly. v1 is not SECURITY DEFINER, so RLS applied and the recursion surfaced.
-- That is why 42P17 outnumbers 42P01 four to one: it is the terminal error after a
-- fallback that should never have triggered. The client-side half of this fix stops
-- that fallback firing on anything but a genuine 42883.

-- ─── 1. The missing table ────────────────────────────────────────────────────
--
-- Reproduced verbatim from the unapplied migration rather than rewritten, so that
-- applying this file and applying the original produce the same object. Every
-- statement is idempotent because the original may yet be replayed on other
-- environments where it did land.

CREATE TABLE IF NOT EXISTS public.user_funding_bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funding_opportunity_id uuid NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, funding_opportunity_id)
);

ALTER TABLE public.user_funding_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.user_funding_bookmarks;
CREATE POLICY "Users can manage their own bookmarks"
  ON public.user_funding_bookmarks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.user_funding_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_opportunity ON public.user_funding_bookmarks(funding_opportunity_id);

-- ─── 2. Break the demo_calls <-> demo_call_participants policy cycle ─────────
--
-- A policy cannot read the table it protects, directly or through a second table
-- whose policy reads back. The standard break is a SECURITY DEFINER helper: it
-- reads the row without re-entering RLS, so the cycle terminates. Same pattern the
-- codebase already uses for admin checks via is_admin_user().
--
-- Each helper takes the user id explicitly rather than calling auth.uid() inside,
-- so the policy stays readable about whose access it is testing, and the function
-- stays usable from a service-role context where auth.uid() is null.
--
-- search_path is pinned on all three. These are new SECURITY DEFINER functions and
-- the database already carries 66 advisories for mutable search_path; none of them
-- should be added by this file.

CREATE OR REPLACE FUNCTION public.is_demo_call_participant(p_demo_call_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.demo_call_participants
    WHERE demo_call_id = p_demo_call_id
      AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_demo_call(p_demo_call_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.demo_calls
    WHERE id = p_demo_call_id
      AND user_id = p_user_id
  );
$$;

-- Mirrors the original demo_calls SELECT rule exactly: owner, or public call, or
-- the viewer is on the participant list.
CREATE OR REPLACE FUNCTION public.can_view_demo_call(p_demo_call_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.demo_calls
    WHERE id = p_demo_call_id
      AND (is_public = true OR (p_user_id IS NOT NULL AND user_id = p_user_id))
  ) OR public.is_demo_call_participant(p_demo_call_id, p_user_id);
$$;

COMMENT ON FUNCTION public.is_demo_call_participant(uuid, uuid) IS
  'RLS cycle breaker. Reads demo_call_participants without re-entering its own policy.';
COMMENT ON FUNCTION public.can_view_demo_call(uuid, uuid) IS
  'RLS cycle breaker. Same visibility rule the demo_calls SELECT policy used to inline.';

-- The originating policies were granted to the public role, so anon must keep being
-- able to evaluate them for is_public demo calls. Postgres does not guarantee
-- short-circuit evaluation of the OR branches, so the grant cannot be narrowed to
-- authenticated without risking a permission error on public calls.
GRANT EXECUTE ON FUNCTION public.is_demo_call_participant(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owns_demo_call(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_demo_call(uuid, uuid) TO anon, authenticated;

-- ─── 3. Replace the recursive policies ──────────────────────────────────────
--
-- Access semantics are unchanged; only the mechanism by which each rule reads the
-- other table changes. Written as DROP + CREATE because ALTER POLICY cannot
-- restate a USING clause that references a function created in the same migration
-- on some Postgres versions.

DROP POLICY IF EXISTS "Users can view demo calls they're involved in or public ones" ON public.demo_calls;
CREATE POLICY "Users can view demo calls they're involved in or public ones"
  ON public.demo_calls
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_public = true
    OR public.is_demo_call_participant(id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can view participants for accessible demo calls" ON public.demo_call_participants;
CREATE POLICY "Users can view participants for accessible demo calls"
  ON public.demo_call_participants
  FOR SELECT
  USING (public.can_view_demo_call(demo_call_id, auth.uid()));

DROP POLICY IF EXISTS "Demo call owners can manage participants" ON public.demo_call_participants;
CREATE POLICY "Demo call owners can manage participants"
  ON public.demo_call_participants
  FOR ALL
  USING (public.owns_demo_call(demo_call_id, auth.uid()))
  WITH CHECK (public.owns_demo_call(demo_call_id, auth.uid()));

-- "Users can join demo calls" (INSERT) and "Users can update their own
-- participation" (UPDATE) are left untouched. Neither reads across tables, so
-- neither participates in the cycle.
