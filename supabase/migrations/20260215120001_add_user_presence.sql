-- Create user_presence table for online/offline status tracking
CREATE TABLE public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presence
-- Users can view presence of users they have conversations with
CREATE POLICY "Users can view presence of conversation participants"
ON public.user_presence FOR SELECT
USING (
  user_id IN (
    SELECT unnest(participants) FROM public.conversations
    WHERE auth.uid() = ANY(participants)
  )
);

-- Users can update their own presence
CREATE POLICY "Users can update their own presence"
ON public.user_presence FOR ALL
USING (auth.uid() = user_id);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_user_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamp
CREATE TRIGGER trigger_update_user_presence_timestamp
BEFORE UPDATE ON public.user_presence
FOR EACH ROW EXECUTE FUNCTION update_user_presence_timestamp();

-- Create index for better query performance
CREATE INDEX idx_user_presence_status ON public.user_presence(status);

-- Add comment for documentation
COMMENT ON TABLE public.user_presence IS
'Tracks user online/offline/away status for real-time presence indicators in messaging interface.';
