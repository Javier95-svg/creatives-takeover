-- PMF Lab — Customer Discovery List.
-- Saves the "who to talk to & where" deliverable (communities + live threads)
-- generated from the founder's product/problem via web-search. Per-user rows;
-- regenerate keeps history, the UI loads the latest.

CREATE TABLE IF NOT EXISTS public.pmf_customer_discovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT,
  target_audience TEXT,
  problem TEXT,
  communities JSONB NOT NULL DEFAULT '[]'::jsonb,
  threads JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmf_customer_discovery_user_created
  ON public.pmf_customer_discovery(user_id, created_at DESC);

ALTER TABLE public.pmf_customer_discovery ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pmf_customer_discovery'
      AND policyname = 'Users can manage own pmf_customer_discovery'
  ) THEN
    CREATE POLICY "Users can manage own pmf_customer_discovery"
      ON public.pmf_customer_discovery
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
