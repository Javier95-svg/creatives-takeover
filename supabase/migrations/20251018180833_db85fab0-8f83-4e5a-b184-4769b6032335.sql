-- Create daily_priorities table
CREATE TABLE IF NOT EXISTS public.daily_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  priority_date DATE NOT NULL DEFAULT CURRENT_DATE,
  priority_text TEXT NOT NULL,
  priority_order INTEGER NOT NULL DEFAULT 1,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_priorities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own priorities"
  ON public.daily_priorities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own priorities"
  ON public.daily_priorities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own priorities"
  ON public.daily_priorities
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own priorities"
  ON public.daily_priorities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_daily_priorities_user_date ON public.daily_priorities(user_id, priority_date DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_priorities_updated_at
  BEFORE UPDATE ON public.daily_priorities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();