-- Create collaboration sessions table
CREATE TABLE public.collaboration_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type TEXT NOT NULL, -- 'sprint', 'chat_session', 'business_plan'
  resource_id UUID NOT NULL,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '4 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user presence table for real-time collaboration
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  cursor_position JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_id)
);

-- Create collaborative edits table for tracking live changes
CREATE TABLE public.collaborative_edits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  edit_type TEXT NOT NULL, -- 'insert', 'delete', 'format', 'comment'
  content_path TEXT NOT NULL, -- JSON path to the content being edited
  edit_data JSONB NOT NULL,
  sequence_number BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live comments table for contextual collaboration
CREATE TABLE public.live_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  context_path TEXT, -- Where in the document this comment applies
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaboration_sessions
CREATE POLICY "Users can view sessions for resources they can access"
ON public.collaboration_sessions FOR SELECT
USING (
  resource_type = 'sprint' AND resource_id IN (
    SELECT id FROM sprints WHERE user_id = auth.uid() OR (is_public = true AND community_visible = true)
  )
  OR
  resource_type = 'chat_session' AND resource_id IN (
    SELECT id FROM chat_sessions WHERE user_id = auth.uid()
  )
  OR
  created_by = auth.uid()
);

CREATE POLICY "Users can create sessions for their resources"
ON public.collaboration_sessions FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    resource_type = 'sprint' AND resource_id IN (
      SELECT id FROM sprints WHERE user_id = auth.uid()
    )
    OR
    resource_type = 'chat_session' AND resource_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Creators can update their sessions"
ON public.collaboration_sessions FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for user_presence
CREATE POLICY "Users can view presence in accessible sessions"
ON public.user_presence FOR SELECT
USING (
  session_id IN (
    SELECT id FROM collaboration_sessions 
    WHERE created_by = auth.uid() OR id IN (
      SELECT session_id FROM user_presence WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can manage their own presence"
ON public.user_presence FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for collaborative_edits
CREATE POLICY "Users can view edits in accessible sessions"
ON public.collaborative_edits FOR SELECT
USING (
  session_id IN (
    SELECT id FROM collaboration_sessions 
    WHERE created_by = auth.uid() OR id IN (
      SELECT session_id FROM user_presence WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create edits in sessions they're part of"
ON public.collaborative_edits FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND session_id IN (
    SELECT session_id FROM user_presence WHERE user_id = auth.uid()
  )
);

-- RLS Policies for live_comments
CREATE POLICY "Users can view comments in accessible sessions"
ON public.live_comments FOR SELECT
USING (
  session_id IN (
    SELECT id FROM collaboration_sessions 
    WHERE created_by = auth.uid() OR id IN (
      SELECT session_id FROM user_presence WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create comments in sessions they're part of"
ON public.live_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND session_id IN (
    SELECT session_id FROM user_presence WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own comments"
ON public.live_comments FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = resolved_by);

-- Create indexes for performance
CREATE INDEX idx_collaboration_sessions_resource ON public.collaboration_sessions(resource_type, resource_id);
CREATE INDEX idx_user_presence_session ON public.user_presence(session_id, is_active);
CREATE INDEX idx_collaborative_edits_session_seq ON public.collaborative_edits(session_id, sequence_number);
CREATE INDEX idx_live_comments_session ON public.live_comments(session_id, created_at);

-- Create trigger to update updated_at columns
CREATE TRIGGER update_collaboration_sessions_updated_at
  BEFORE UPDATE ON public.collaboration_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_live_comments_updated_at
  BEFORE UPDATE ON public.live_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for collaboration tables
ALTER TABLE public.collaboration_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.collaborative_edits REPLICA IDENTITY FULL;
ALTER TABLE public.live_comments REPLICA IDENTITY FULL;