-- Add collaborative whiteboard tables
CREATE TABLE public.collaboration_whiteboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Whiteboard',
  canvas_data JSONB NOT NULL DEFAULT '{}',
  width INTEGER NOT NULL DEFAULT 1200,
  height INTEGER NOT NULL DEFAULT 800,
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add whiteboard strokes/objects for real-time sync
CREATE TABLE public.whiteboard_objects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whiteboard_id UUID NOT NULL REFERENCES public.collaboration_whiteboards(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL CHECK (object_type IN ('path', 'rect', 'circle', 'text', 'image', 'line')),
  object_data JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Add polls and voting system
CREATE TABLE public.collaboration_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  poll_type TEXT NOT NULL DEFAULT 'single_choice' CHECK (poll_type IN ('single_choice', 'multiple_choice', 'rating', 'open_text')),
  options JSONB NOT NULL DEFAULT '[]',
  anonymous BOOLEAN NOT NULL DEFAULT false,
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  closes_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add poll votes
CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.collaboration_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  selected_options JSONB NOT NULL DEFAULT '[]',
  rating_value INTEGER,
  text_response TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Add shared file management
CREATE TABLE public.collaboration_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add file access/download tracking
CREATE TABLE public.file_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES public.collaboration_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'share')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.collaboration_whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whiteboard_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whiteboards
CREATE POLICY "Users can view whiteboards in accessible sessions"
ON public.collaboration_whiteboards FOR SELECT
USING (
  session_id IN (
    SELECT cs.id FROM public.collaboration_sessions cs
    WHERE cs.created_by = auth.uid() 
    OR cs.id IN (
      SELECT up.session_id FROM public.user_presence up 
      WHERE up.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create whiteboards in sessions they're part of"
ON public.collaboration_whiteboards FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  session_id IN (
    SELECT up.session_id FROM public.user_presence up 
    WHERE up.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update whiteboards in accessible sessions"
ON public.collaboration_whiteboards FOR UPDATE
USING (
  session_id IN (
    SELECT cs.id FROM public.collaboration_sessions cs
    WHERE cs.created_by = auth.uid() 
    OR cs.id IN (
      SELECT up.session_id FROM public.user_presence up 
      WHERE up.user_id = auth.uid()
    )
  )
);

-- RLS Policies for whiteboard objects
CREATE POLICY "Users can view whiteboard objects in accessible sessions"
ON public.whiteboard_objects FOR SELECT
USING (
  whiteboard_id IN (
    SELECT w.id FROM public.collaboration_whiteboards w
    WHERE w.session_id IN (
      SELECT cs.id FROM public.collaboration_sessions cs
      WHERE cs.created_by = auth.uid() 
      OR cs.id IN (
        SELECT up.session_id FROM public.user_presence up 
        WHERE up.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can create whiteboard objects"
ON public.whiteboard_objects FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own whiteboard objects"
ON public.whiteboard_objects FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for polls
CREATE POLICY "Users can view polls in accessible sessions"
ON public.collaboration_polls FOR SELECT
USING (
  session_id IN (
    SELECT cs.id FROM public.collaboration_sessions cs
    WHERE cs.created_by = auth.uid() 
    OR cs.id IN (
      SELECT up.session_id FROM public.user_presence up 
      WHERE up.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create polls in sessions they're part of"
ON public.collaboration_polls FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  session_id IN (
    SELECT up.session_id FROM public.user_presence up 
    WHERE up.user_id = auth.uid()
  )
);

CREATE POLICY "Poll creators can update their polls"
ON public.collaboration_polls FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for poll votes
CREATE POLICY "Users can view votes on accessible polls (anonymous check)"
ON public.poll_votes FOR SELECT
USING (
  poll_id IN (
    SELECT p.id FROM public.collaboration_polls p
    WHERE p.session_id IN (
      SELECT cs.id FROM public.collaboration_sessions cs
      WHERE cs.created_by = auth.uid() 
      OR cs.id IN (
        SELECT up.session_id FROM public.user_presence up 
        WHERE up.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can vote on accessible polls"
ON public.poll_votes FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  poll_id IN (
    SELECT p.id FROM public.collaboration_polls p
    WHERE p.session_id IN (
      SELECT up.session_id FROM public.user_presence up 
      WHERE up.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own votes"
ON public.poll_votes FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for collaboration files
CREATE POLICY "Users can view files in accessible sessions"
ON public.collaboration_files FOR SELECT
USING (
  session_id IN (
    SELECT cs.id FROM public.collaboration_sessions cs
    WHERE cs.created_by = auth.uid() 
    OR cs.id IN (
      SELECT up.session_id FROM public.user_presence up 
      WHERE up.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can upload files to sessions they're part of"
ON public.collaboration_files FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  session_id IN (
    SELECT up.session_id FROM public.user_presence up 
    WHERE up.user_id = auth.uid()
  )
);

CREATE POLICY "File uploaders can update their files"
ON public.collaboration_files FOR UPDATE
USING (auth.uid() = uploaded_by);

CREATE POLICY "File uploaders can delete their files"
ON public.collaboration_files FOR DELETE
USING (auth.uid() = uploaded_by);

-- RLS Policies for file access logs
CREATE POLICY "Users can view file access logs for accessible files"
ON public.file_access_logs FOR SELECT
USING (
  file_id IN (
    SELECT f.id FROM public.collaboration_files f
    WHERE f.session_id IN (
      SELECT cs.id FROM public.collaboration_sessions cs
      WHERE cs.created_by = auth.uid() 
      OR cs.id IN (
        SELECT up.session_id FROM public.user_presence up 
        WHERE up.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can log their own file access"
ON public.file_access_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_collaboration_whiteboards_session_id ON public.collaboration_whiteboards(session_id);
CREATE INDEX idx_whiteboard_objects_whiteboard_id ON public.whiteboard_objects(whiteboard_id);
CREATE INDEX idx_whiteboard_objects_created_at ON public.whiteboard_objects(created_at);
CREATE INDEX idx_collaboration_polls_session_id ON public.collaboration_polls(session_id);
CREATE INDEX idx_collaboration_polls_status ON public.collaboration_polls(status);
CREATE INDEX idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX idx_collaboration_files_session_id ON public.collaboration_files(session_id);
CREATE INDEX idx_collaboration_files_file_type ON public.collaboration_files(file_type);
CREATE INDEX idx_file_access_logs_file_id ON public.file_access_logs(file_id);

-- Add triggers for updated_at
CREATE TRIGGER update_collaboration_whiteboards_updated_at
BEFORE UPDATE ON public.collaboration_whiteboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whiteboard_objects_updated_at
BEFORE UPDATE ON public.whiteboard_objects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaboration_polls_updated_at
BEFORE UPDATE ON public.collaboration_polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_poll_votes_updated_at
BEFORE UPDATE ON public.poll_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaboration_files_updated_at
BEFORE UPDATE ON public.collaboration_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();