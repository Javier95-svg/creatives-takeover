-- Create trigger for automatic message notifications
-- This will call the existing notify_message_recipient function on new messages

CREATE OR REPLACE TRIGGER on_new_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_recipient();

-- Enable realtime for community_notifications if not already enabled
ALTER TABLE public.community_notifications REPLICA IDENTITY FULL;

-- Add community_notifications to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'community_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_notifications;
  END IF;
END
$$;