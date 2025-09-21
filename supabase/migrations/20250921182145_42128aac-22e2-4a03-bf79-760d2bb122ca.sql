-- Create demo calls system tables

-- Main demo calls table
CREATE TABLE public.demo_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sprint_id UUID NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  max_participants INTEGER NOT NULL DEFAULT 10,
  meeting_url TEXT NULL,
  recording_url TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Demo call participants table
CREATE TABLE public.demo_call_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_call_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('presenter', 'participant', 'moderator')),
  joined_at TIMESTAMP WITH TIME ZONE NULL,
  left_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(demo_call_id, user_id)
);

-- Demo call recordings table
CREATE TABLE public.demo_call_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_call_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NULL,
  duration_seconds INTEGER NULL,
  thumbnail_url TEXT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Demo call feedback table
CREATE TABLE public.demo_call_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_call_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT NULL,
  suggestions TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(demo_call_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.demo_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_call_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_call_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for demo_calls
CREATE POLICY "Users can view demo calls they're involved in or public ones" 
ON public.demo_calls 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR is_public = true 
  OR id IN (
    SELECT demo_call_id FROM public.demo_call_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own demo calls" 
ON public.demo_calls 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own demo calls" 
ON public.demo_calls 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own demo calls" 
ON public.demo_calls 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for demo_call_participants
CREATE POLICY "Users can view participants for accessible demo calls" 
ON public.demo_call_participants 
FOR SELECT 
USING (
  demo_call_id IN (
    SELECT id FROM public.demo_calls 
    WHERE auth.uid() = user_id 
    OR is_public = true 
    OR id IN (
      SELECT demo_call_id FROM public.demo_call_participants 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can join demo calls" 
ON public.demo_call_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.demo_call_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Demo call owners can manage participants" 
ON public.demo_call_participants 
FOR ALL 
USING (
  demo_call_id IN (
    SELECT id FROM public.demo_calls WHERE user_id = auth.uid()
  )
);

-- RLS Policies for demo_call_recordings
CREATE POLICY "Users can view recordings for accessible demo calls" 
ON public.demo_call_recordings 
FOR SELECT 
USING (
  is_public = true 
  OR demo_call_id IN (
    SELECT id FROM public.demo_calls 
    WHERE auth.uid() = user_id 
    OR id IN (
      SELECT demo_call_id FROM public.demo_call_participants 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Demo call owners can manage recordings" 
ON public.demo_call_recordings 
FOR ALL 
USING (
  demo_call_id IN (
    SELECT id FROM public.demo_calls WHERE user_id = auth.uid()
  )
);

-- RLS Policies for demo_call_feedback
CREATE POLICY "Users can view feedback for accessible demo calls" 
ON public.demo_call_feedback 
FOR SELECT 
USING (
  demo_call_id IN (
    SELECT id FROM public.demo_calls 
    WHERE auth.uid() = user_id 
    OR is_public = true 
    OR id IN (
      SELECT demo_call_id FROM public.demo_call_participants 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create feedback for demo calls they attended" 
ON public.demo_call_feedback 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND demo_call_id IN (
    SELECT demo_call_id FROM public.demo_call_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own feedback" 
ON public.demo_call_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.demo_call_participants 
ADD CONSTRAINT fk_demo_call_participants_demo_call_id 
FOREIGN KEY (demo_call_id) REFERENCES public.demo_calls(id) ON DELETE CASCADE;

ALTER TABLE public.demo_call_recordings 
ADD CONSTRAINT fk_demo_call_recordings_demo_call_id 
FOREIGN KEY (demo_call_id) REFERENCES public.demo_calls(id) ON DELETE CASCADE;

ALTER TABLE public.demo_call_feedback 
ADD CONSTRAINT fk_demo_call_feedback_demo_call_id 
FOREIGN KEY (demo_call_id) REFERENCES public.demo_calls(id) ON DELETE CASCADE;

-- Create update trigger
CREATE TRIGGER update_demo_calls_updated_at
BEFORE UPDATE ON public.demo_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_demo_calls_scheduled_at ON public.demo_calls(scheduled_at);
CREATE INDEX idx_demo_calls_user_id ON public.demo_calls(user_id);
CREATE INDEX idx_demo_calls_sprint_id ON public.demo_calls(sprint_id);
CREATE INDEX idx_demo_calls_status ON public.demo_calls(status);
CREATE INDEX idx_demo_call_participants_demo_call_id ON public.demo_call_participants(demo_call_id);
CREATE INDEX idx_demo_call_participants_user_id ON public.demo_call_participants(user_id);