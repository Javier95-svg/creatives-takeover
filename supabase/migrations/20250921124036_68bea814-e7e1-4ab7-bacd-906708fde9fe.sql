-- Create daily_check_ins table for tracking user progress
CREATE TABLE public.daily_check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sprint_id UUID NOT NULL,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_summary TEXT NOT NULL,
  completed_tasks TEXT[] DEFAULT '{}',
  blockers TEXT,
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  streak_count INTEGER DEFAULT 1,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_check_ins ENABLE ROW LEVEL SECURITY;

-- Create policies for daily check-ins
CREATE POLICY "Users can create their own check-ins" 
ON public.daily_check_ins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own check-ins" 
ON public.daily_check_ins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public sprint check-ins" 
ON public.daily_check_ins 
FOR SELECT 
USING (sprint_id IN (
  SELECT id FROM sprints 
  WHERE is_public = true AND community_visible = true
));

CREATE POLICY "Users can update their own check-ins" 
ON public.daily_check_ins 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create unique constraint to prevent multiple check-ins per day per user per sprint
CREATE UNIQUE INDEX idx_daily_check_ins_unique ON public.daily_check_ins (user_id, sprint_id, check_in_date);

-- Create index for efficient querying
CREATE INDEX idx_daily_check_ins_sprint_date ON public.daily_check_ins (sprint_id, check_in_date DESC);
CREATE INDEX idx_daily_check_ins_user_date ON public.daily_check_ins (user_id, check_in_date DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_check_ins_updated_at
BEFORE UPDATE ON public.daily_check_ins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notifications table for daily reminders and nudges
CREATE TABLE public.daily_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sprint_id UUID NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'daily_checkin',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  is_sent BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for reminders
ALTER TABLE public.daily_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reminders" 
ON public.daily_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage reminders" 
ON public.daily_reminders 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create index for efficient reminder processing
CREATE INDEX idx_daily_reminders_scheduled ON public.daily_reminders (scheduled_for, is_sent) WHERE is_sent = false;