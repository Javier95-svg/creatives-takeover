-- Create projects table (enhanced chat sessions)
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  idea_summary text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create project_messages table (enhanced chatbot messages)
CREATE TABLE IF NOT EXISTS public.project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content jsonb NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create project_artifacts table
CREATE TABLE IF NOT EXISTS public.project_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('overview', 'market', 'competitors', 'financials', 'pitch_deck', 'export')),
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_artifacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for project_messages
CREATE POLICY "Users can view messages in their projects"
  ON public.project_messages FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can create messages in their projects"
  ON public.project_messages FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- RLS Policies for project_artifacts
CREATE POLICY "Users can view artifacts in their projects"
  ON public.project_artifacts FOR SELECT
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can create artifacts in their projects"
  ON public.project_artifacts FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update artifacts in their projects"
  ON public.project_artifacts FOR UPDATE
  USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));

-- Create indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_project_messages_project_id ON public.project_messages(project_id);
CREATE INDEX idx_project_artifacts_project_id ON public.project_artifacts(project_id);

-- Create updated_at trigger for projects
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for artifacts
CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON public.project_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();