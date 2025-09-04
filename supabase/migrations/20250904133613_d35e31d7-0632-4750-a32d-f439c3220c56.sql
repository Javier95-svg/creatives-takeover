-- Fix search path for security functions
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

-- Fix search path for friend counts function
CREATE OR REPLACE FUNCTION public.update_friend_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;