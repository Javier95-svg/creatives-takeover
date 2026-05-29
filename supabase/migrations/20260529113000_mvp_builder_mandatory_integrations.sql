-- Mandatory MVP Builder integrations.
-- Token material is encrypted by Edge Functions before insert and kept in
-- service-role-only tables. User-facing tables expose status and selected
-- repo/project metadata only.

CREATE TABLE IF NOT EXISTS public.mvp_builder_github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mvp_project_id UUID REFERENCES public.mvp_projects(id) ON DELETE SET NULL,
  github_user_login TEXT,
  github_user_name TEXT,
  github_avatar_url TEXT,
  installation_id BIGINT,
  repository_id BIGINT,
  repository_full_name TEXT,
  repository_html_url TEXT,
  branch TEXT NOT NULL DEFAULT 'main',
  default_branch TEXT NOT NULL DEFAULT 'main',
  base_commit_sha TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connecting', 'connected', 'syncing', 'expired', 'error')),
  scopes TEXT[] NOT NULL DEFAULT '{}'::text[],
  token_expires_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mvp_builder_supabase_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mvp_project_id UUID REFERENCES public.mvp_projects(id) ON DELETE SET NULL,
  supabase_account_id TEXT,
  organization_id TEXT,
  organization_name TEXT,
  project_ref TEXT,
  project_name TEXT,
  project_region TEXT,
  project_status TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connecting', 'connected', 'syncing', 'expired', 'error')),
  scopes TEXT[] NOT NULL DEFAULT '{}'::text[],
  token_expires_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mvp_builder_github_connection_secrets (
  connection_id UUID PRIMARY KEY REFERENCES public.mvp_builder_github_connections(id) ON DELETE CASCADE,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mvp_builder_supabase_connection_secrets (
  connection_id UUID PRIMARY KEY REFERENCES public.mvp_builder_supabase_connections(id) ON DELETE CASCADE,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mvp_builder_oauth_states (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'supabase')),
  redirect_to TEXT NOT NULL,
  mvp_project_id UUID REFERENCES public.mvp_projects(id) ON DELETE SET NULL,
  code_verifier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '15 minutes',
  consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mvp_builder_github_connections_user
  ON public.mvp_builder_github_connections(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_mvp_builder_supabase_connections_user
  ON public.mvp_builder_supabase_connections(user_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mvp_builder_github_connections_one_active_per_user
  ON public.mvp_builder_github_connections(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mvp_builder_supabase_connections_one_active_per_user
  ON public.mvp_builder_supabase_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_mvp_builder_oauth_states_user_provider
  ON public.mvp_builder_oauth_states(user_id, provider, created_at DESC);

ALTER TABLE public.mvp_builder_github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_builder_supabase_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_builder_github_connection_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_builder_supabase_connection_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_builder_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own GitHub MVP integration metadata" ON public.mvp_builder_github_connections;
CREATE POLICY "Users can read own GitHub MVP integration metadata"
  ON public.mvp_builder_github_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Supabase MVP integration metadata" ON public.mvp_builder_supabase_connections;
CREATE POLICY "Users can read own Supabase MVP integration metadata"
  ON public.mvp_builder_supabase_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own OAuth state metadata" ON public.mvp_builder_oauth_states;
CREATE POLICY "Users can read own OAuth state metadata"
  ON public.mvp_builder_oauth_states
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.mvp_builder_github_connection_secrets FROM anon, authenticated;
REVOKE ALL ON public.mvp_builder_supabase_connection_secrets FROM anon, authenticated;

ALTER TABLE public.mvp_projects
  ADD COLUMN IF NOT EXISTS github_connection_id UUID REFERENCES public.mvp_builder_github_connections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS supabase_connection_id UUID REFERENCES public.mvp_builder_supabase_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mvp_projects_github_connection
  ON public.mvp_projects(github_connection_id)
  WHERE github_connection_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mvp_projects_supabase_connection
  ON public.mvp_projects(supabase_connection_id)
  WHERE supabase_connection_id IS NOT NULL;
