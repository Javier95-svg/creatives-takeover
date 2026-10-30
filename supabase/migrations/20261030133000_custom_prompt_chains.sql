-- Create custom_prompt_chains in production.
--
-- /prompt-library reads published chains from this table on every visit, but
-- 20251122000000_create_custom_prompt_chains.sql was never applied, so each
-- visit logged PGRST205 ("Could not find the table") and a 404. This creates
-- the table as that migration defined it, with the auth calls wrapped so they
-- run once per query.
--
-- Publishing: 20251124053456 gated it on plan names that no longer exist
-- ("creator", "professional", "enterprise"), which would block everyone. The
-- app allows Rising and Pro to publish (useCustomPromptChains); the database
-- now enforces the same rule. subscribers.subscription_tier holds the current
-- lowercase plan ids (rookie, starter, rising, pro).
--
-- Every statement is idempotent, so it is safe to run whether or not either
-- older migration ever ran.

CREATE TABLE IF NOT EXISTS public.custom_prompt_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concept_title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  steps JSONB NOT NULL,
  author_name TEXT NOT NULL,
  published BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.custom_prompt_chains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published prompt chains are viewable by everyone" ON public.custom_prompt_chains;
CREATE POLICY "Published prompt chains are viewable by everyone"
  ON public.custom_prompt_chains
  FOR SELECT
  USING (published = true);

DROP POLICY IF EXISTS "Users can view their own prompt chains" ON public.custom_prompt_chains;
CREATE POLICY "Users can view their own prompt chains"
  ON public.custom_prompt_chains
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own prompt chains" ON public.custom_prompt_chains;
CREATE POLICY "Users can create their own prompt chains"
  ON public.custom_prompt_chains
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own prompt chains" ON public.custom_prompt_chains;
CREATE POLICY "Users can update their own prompt chains"
  ON public.custom_prompt_chains
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own prompt chains" ON public.custom_prompt_chains;
CREATE POLICY "Users can delete their own prompt chains"
  ON public.custom_prompt_chains
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- The library lists published chains newest first; owners list their own.
CREATE INDEX IF NOT EXISTS custom_prompt_chains_published_created_idx
  ON public.custom_prompt_chains (created_at DESC)
  WHERE published;
CREATE INDEX IF NOT EXISTS idx_custom_prompt_chains_user_id
  ON public.custom_prompt_chains (user_id);

CREATE OR REPLACE FUNCTION public.update_custom_prompt_chains_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_custom_prompt_chains_updated_at ON public.custom_prompt_chains;
CREATE TRIGGER update_custom_prompt_chains_updated_at
  BEFORE UPDATE ON public.custom_prompt_chains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_custom_prompt_chains_updated_at();

-- Only Rising and Pro may publish, matching the app.
CREATE OR REPLACE FUNCTION public.can_publish_prompt_chain(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT lower(coalesce(s.subscription_tier, 'rookie'))
  INTO v_tier
  FROM public.subscribers s
  WHERE s.user_id = user_id_param
  LIMIT 1;

  RETURN coalesce(v_tier, 'rookie') IN ('rising', 'pro');
END;
$$;

CREATE OR REPLACE FUNCTION public.check_prompt_chain_publish_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.published = true
     AND (TG_OP = 'INSERT' OR OLD.published IS DISTINCT FROM true)
     AND NOT public.can_publish_prompt_chain(NEW.user_id) THEN
    RAISE EXCEPTION 'Upgrade to Rising or Pro to publish prompt chains.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_prompt_chain_publish_permission ON public.custom_prompt_chains;
CREATE TRIGGER enforce_prompt_chain_publish_permission
  BEFORE INSERT OR UPDATE ON public.custom_prompt_chains
  FOR EACH ROW
  EXECUTE FUNCTION public.check_prompt_chain_publish_permission();

REVOKE ALL ON FUNCTION public.can_publish_prompt_chain(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_publish_prompt_chain(UUID) TO authenticated;
