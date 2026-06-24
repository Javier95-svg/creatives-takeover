-- One-time "first run free" gifts (lifetime, once per account per feature).
-- Used by Tech Stack Builder: the first analysis is comped, then it bills normally.

CREATE TABLE IF NOT EXISTS public.feature_gifts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);

ALTER TABLE public.feature_gifts ENABLE ROW LEVEL SECURITY;

-- Read-only for the owner (so the UI can show "your first one is free").
DROP POLICY IF EXISTS "Users can view their own feature gifts" ON public.feature_gifts;
CREATE POLICY "Users can view their own feature gifts"
  ON public.feature_gifts FOR SELECT
  USING (auth.uid() = user_id);
-- Inserts go through claim_first_use_gift() (SECURITY DEFINER) only.

-- Atomically claim a one-time gift for the calling user. Returns true if THIS
-- call claimed it (first time), false if it was already claimed. Race-safe via
-- the primary key + ON CONFLICT DO NOTHING.
CREATE OR REPLACE FUNCTION public.claim_first_use_gift(p_feature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rows integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.feature_gifts (user_id, feature)
  VALUES (v_user_id, p_feature)
  ON CONFLICT (user_id, feature) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_first_use_gift(text) TO authenticated;
