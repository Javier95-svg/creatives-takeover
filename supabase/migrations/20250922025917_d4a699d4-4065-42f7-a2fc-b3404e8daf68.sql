-- Create Phase 4 collaboration tables

-- Collaboration messages table
CREATE TABLE public.collaboration_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  reply_to_id UUID REFERENCES public.collaboration_messages(id),
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaboration_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for collaboration messages
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

-- Collaboration notifications table
CREATE TABLE public.collaboration_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaboration_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.collaboration_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.collaboration_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_collaboration_messages_session_id ON public.collaboration_messages(session_id);
CREATE INDEX idx_collaboration_messages_user_id ON public.collaboration_messages(user_id);
CREATE INDEX idx_collaboration_notifications_user_id ON public.collaboration_notifications(user_id);
CREATE INDEX idx_collaboration_notifications_read_at ON public.collaboration_notifications(read_at);

-- Add triggers for updated_at
CREATE TRIGGER update_collaboration_messages_updated_at
BEFORE UPDATE ON public.collaboration_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS to existing collaboration tables
ALTER TABLE public.collaboration_calls ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can manage calls they initiated"
ON public.collaboration_calls FOR ALL
USING (auth.uid() = initiated_by);

CREATE POLICY "Users can join calls in accessible sessions"
ON public.collaboration_calls FOR UPDATE
USING (
  session_id IN (
    SELECT up.session_id FROM public.user_presence up 
    WHERE up.user_id = auth.uid()
  )
);