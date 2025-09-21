-- Add chat messages table for collaboration sessions
CREATE TABLE public.collaboration_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  reply_to_id UUID REFERENCES public.collaboration_messages(id),
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add user status table for rich presence
CREATE TABLE public.user_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  custom_status TEXT,
  status_emoji TEXT,
  activity_type TEXT CHECK (activity_type IN ('working', 'meeting', 'break', 'focus')),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add collaboration notifications table
CREATE TABLE public.collaboration_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('user_joined', 'user_left', 'message', 'comment', 'edit', 'call_started', 'call_ended')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add collaboration activity feed
CREATE TABLE public.collaboration_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('joined', 'left', 'message', 'comment', 'edit', 'call_started', 'call_ended', 'screen_share_started', 'screen_share_ended')),
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add voice/video call sessions
CREATE TABLE public.collaboration_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.collaboration_sessions(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video', 'screen_share')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  participants JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on all new tables
ALTER TABLE public.collaboration_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaboration_messages
CREATE POLICY "Users can view messages in accessible sessions"
ON public.collaboration_messages FOR SELECT
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

CREATE POLICY "Users can create messages in sessions they're part of"
ON public.collaboration_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  session_id IN (
    SELECT up.session_id FROM public.user_presence up 
    WHERE up.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages"
ON public.collaboration_messages FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for user_status
CREATE POLICY "Users can view all user statuses"
ON public.user_status FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own status"
ON public.user_status FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for collaboration_notifications
CREATE POLICY "Users can view their own notifications"
ON public.collaboration_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.collaboration_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for collaboration_activity
CREATE POLICY "Users can view activity in accessible sessions"
ON public.collaboration_activity FOR SELECT
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

CREATE POLICY "Users can create activity for sessions they're part of"
ON public.collaboration_activity FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  session_id IN (
    SELECT up.session_id FROM public.user_presence up 
    WHERE up.user_id = auth.uid()
  )
);

-- RLS Policies for collaboration_calls
CREATE POLICY "Users can view calls in accessible sessions"
ON public.collaboration_calls FOR SELECT
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

CREATE POLICY "Users can manage calls in sessions they're part of"
ON public.collaboration_calls FOR ALL
USING (
  auth.uid() = initiated_by OR
  session_id IN (
    SELECT up.session_id FROM public.user_presence up 
    WHERE up.user_id = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX idx_collaboration_messages_session_id ON public.collaboration_messages(session_id);
CREATE INDEX idx_collaboration_messages_created_at ON public.collaboration_messages(created_at);
CREATE INDEX idx_user_status_user_id ON public.user_status(user_id);
CREATE INDEX idx_collaboration_notifications_user_id ON public.collaboration_notifications(user_id);
CREATE INDEX idx_collaboration_notifications_read_at ON public.collaboration_notifications(read_at);
CREATE INDEX idx_collaboration_activity_session_id ON public.collaboration_activity(session_id);
CREATE INDEX idx_collaboration_activity_created_at ON public.collaboration_activity(created_at);
CREATE INDEX idx_collaboration_calls_session_id ON public.collaboration_calls(session_id);

-- Add triggers for updated_at
CREATE TRIGGER update_collaboration_messages_updated_at
BEFORE UPDATE ON public.collaboration_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_status_updated_at
BEFORE UPDATE ON public.user_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();