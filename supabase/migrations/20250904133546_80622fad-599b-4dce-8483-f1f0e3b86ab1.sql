-- Create user_follows table for following relationships
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_follow_relationship UNIQUE (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create friend_requests table for friend request management
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_friend_request UNIQUE (sender_id, receiver_id),
  CONSTRAINT no_self_friend_request CHECK (sender_id != receiver_id)
);

-- Create conversations table for direct messaging
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participants UUID[] NOT NULL,
  is_group BOOLEAN NOT NULL DEFAULT false,
  name TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for individual messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  attachments JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  reply_to_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add social counts to profiles table
ALTER TABLE public.profiles 
ADD COLUMN followers_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN following_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN friends_count INTEGER NOT NULL DEFAULT 0;

-- Enable Row Level Security
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_follows
CREATE POLICY "Users can view follows they're involved in" 
ON public.user_follows 
FOR SELECT 
USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can create follows" 
ON public.user_follows 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can update their own follows" 
ON public.user_follows 
FOR UPDATE 
USING (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows" 
ON public.user_follows 
FOR DELETE 
USING (auth.uid() = follower_id);

-- RLS Policies for friend_requests
CREATE POLICY "Users can view friend requests they're involved in" 
ON public.friend_requests 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests" 
ON public.friend_requests 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they're involved in" 
ON public.friend_requests 
FOR UPDATE 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own friend requests" 
ON public.friend_requests 
FOR DELETE 
USING (auth.uid() = sender_id);

-- RLS Policies for conversations
CREATE POLICY "Users can view their conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = ANY(participants));

CREATE POLICY "Users can update their conversations" 
ON public.conversations 
FOR UPDATE 
USING (auth.uid() = ANY(participants));

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE auth.uid() = ANY(participants)
  )
);

CREATE POLICY "Users can create messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE auth.uid() = ANY(participants)
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_follows_updated_at
  BEFORE UPDATE ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update follower counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    -- Increase following count for follower
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
    -- Increase followers count for following
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    -- Decrease following count for follower
    UPDATE public.profiles 
    SET following_count = following_count - 1 
    WHERE id = OLD.follower_id;
    
    -- Decrease followers count for following
    UPDATE public.profiles 
    SET followers_count = followers_count - 1 
    WHERE id = OLD.following_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
      -- Follow accepted
      UPDATE public.profiles 
      SET following_count = following_count + 1 
      WHERE id = NEW.follower_id;
      
      UPDATE public.profiles 
      SET followers_count = followers_count + 1 
      WHERE id = NEW.following_id;
      
    ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      -- Follow removed/blocked
      UPDATE public.profiles 
      SET following_count = following_count - 1 
      WHERE id = NEW.follower_id;
      
      UPDATE public.profiles 
      SET followers_count = followers_count - 1 
      WHERE id = NEW.following_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update friend counts
CREATE OR REPLACE FUNCTION public.update_friend_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    -- Increase friends count for both users
    UPDATE public.profiles 
    SET friends_count = friends_count + 1 
    WHERE id IN (NEW.sender_id, NEW.receiver_id);
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    -- Decrease friends count for both users
    UPDATE public.profiles 
    SET friends_count = friends_count - 1 
    WHERE id IN (OLD.sender_id, OLD.receiver_id);
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
      -- Friend request accepted
      UPDATE public.profiles 
      SET friends_count = friends_count + 1 
      WHERE id IN (NEW.sender_id, NEW.receiver_id);
      
    ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      -- Friendship ended
      UPDATE public.profiles 
      SET friends_count = friends_count - 1 
      WHERE id IN (NEW.sender_id, NEW.receiver_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for count updates
CREATE TRIGGER update_follow_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_follow_counts();

CREATE TRIGGER update_friend_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_friend_counts();

-- Create indexes for better performance
CREATE INDEX idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX idx_user_follows_status ON public.user_follows(status);
CREATE INDEX idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX idx_conversations_participants ON public.conversations USING GIN(participants);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);