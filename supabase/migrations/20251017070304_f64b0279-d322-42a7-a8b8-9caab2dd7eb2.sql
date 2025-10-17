-- Create community_notifications table
CREATE TABLE IF NOT EXISTS public.community_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  notification_type text NOT NULL,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add indexes for performance
CREATE INDEX idx_community_notifications_user_id ON public.community_notifications(user_id);
CREATE INDEX idx_community_notifications_read ON public.community_notifications(user_id, read);
CREATE INDEX idx_community_notifications_created_at ON public.community_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.community_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.community_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.community_notifications
  FOR INSERT
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_community_notification(
  p_user_id uuid,
  p_actor_id uuid,
  p_notification_type text,
  p_post_id uuid DEFAULT NULL,
  p_comment_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Don't create notification if actor is the same as user
  IF p_user_id = p_actor_id THEN
    RETURN;
  END IF;

  -- Insert notification
  INSERT INTO public.community_notifications (
    user_id,
    actor_id,
    notification_type,
    post_id,
    comment_id,
    metadata
  ) VALUES (
    p_user_id,
    p_actor_id,
    p_notification_type,
    p_post_id,
    p_comment_id,
    p_metadata
  );
END;
$$;

-- Function to get notification actor info (without accessing auth.users)
CREATE OR REPLACE FUNCTION get_notification_actor_info(actor_user_id uuid)
RETURNS TABLE (
  actor_name text,
  actor_avatar text,
  actor_username text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(p.full_name, 'Anonymous') as actor_name,
    p.avatar_url as actor_avatar,
    p.username as actor_username
  FROM profiles p
  WHERE p.id = actor_user_id;
END;
$$;