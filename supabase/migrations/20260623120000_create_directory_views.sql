-- Directory "Visit" tracking for the quota-metered Directories tool.
-- Mirrors vc_views: every plan gets a few free directory opens per month
-- (Rookie 3 / Starter 10 / Rising 15 / Pro unlimited). The canonical limits
-- live in src/config/planPermissions.ts (MONTHLY_FREE_QUOTAS.directory_visits);
-- this table just records and counts opens within the calendar month.

CREATE TABLE IF NOT EXISTS public.directory_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  directory_key text NOT NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  subscription_tier text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_directory_views_user_month
  ON public.directory_views(user_id, viewed_at);

ALTER TABLE public.directory_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own directory views" ON public.directory_views;
CREATE POLICY "Users can view their own directory views"
  ON public.directory_views FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own directory views" ON public.directory_views;
CREATE POLICY "Users can insert their own directory views"
  ON public.directory_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Monthly (calendar month) directory-visit count for a user.
CREATE OR REPLACE FUNCTION public.get_monthly_directory_view_count(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM public.directory_views
  WHERE user_id = p_user_id
    AND viewed_at >= date_trunc('month', now());
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_monthly_directory_view_count(uuid) TO authenticated;
