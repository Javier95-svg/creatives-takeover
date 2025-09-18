-- Create sprint planner tables for accountability system

-- Create sprints table
CREATE TABLE public.sprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'paused')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  community_visible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sprint tasks table
CREATE TABLE public.sprint_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours NUMERIC(4,2) NOT NULL DEFAULT 2.0,
  actual_hours NUMERIC(4,2),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  tags TEXT[] DEFAULT '{}',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sprint accountability table for community nudges
CREATE TABLE public.sprint_accountability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  accountability_partner_id UUID,
  daily_checkins_enabled BOOLEAN NOT NULL DEFAULT true,
  last_checkin_at TIMESTAMP WITH TIME ZONE,
  nudge_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sprint comments for community engagement
CREATE TABLE public.sprint_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'general' CHECK (comment_type IN ('general', 'nudge', 'celebration', 'feedback')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_accountability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sprint_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sprints
CREATE POLICY "Users can create their own sprints"
  ON public.sprints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sprints and public sprints"
  ON public.sprints FOR SELECT
  USING (auth.uid() = user_id OR (is_public = true AND community_visible = true));

CREATE POLICY "Users can update their own sprints"
  ON public.sprints FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sprints"
  ON public.sprints FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for sprint_tasks
CREATE POLICY "Users can manage tasks in their sprints"
  ON public.sprint_tasks FOR ALL
  USING (sprint_id IN (SELECT id FROM public.sprints WHERE user_id = auth.uid()));

CREATE POLICY "Users can view tasks in public sprints"
  ON public.sprint_tasks FOR SELECT
  USING (sprint_id IN (SELECT id FROM public.sprints WHERE is_public = true AND community_visible = true));

-- RLS Policies for sprint_accountability
CREATE POLICY "Users can manage their own accountability"
  ON public.sprint_accountability FOR ALL
  USING (user_id = auth.uid() OR accountability_partner_id = auth.uid());

-- RLS Policies for sprint_comments
CREATE POLICY "Users can create comments on public sprints"
  ON public.sprint_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND sprint_id IN (SELECT id FROM public.sprints WHERE is_public = true AND community_visible = true));

CREATE POLICY "Users can view comments on public sprints and their own sprints"
  ON public.sprint_comments FOR SELECT
  USING (sprint_id IN (SELECT id FROM public.sprints WHERE user_id = auth.uid() OR (is_public = true AND community_visible = true)));

CREATE POLICY "Users can update their own comments"
  ON public.sprint_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.sprint_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_sprints_updated_at
  BEFORE UPDATE ON public.sprints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sprint_tasks_updated_at
  BEFORE UPDATE ON public.sprint_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sprint_comments_updated_at
  BEFORE UPDATE ON public.sprint_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();