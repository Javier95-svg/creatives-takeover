-- Create business_metrics table for tracking daily business metrics
CREATE TABLE IF NOT EXISTS public.business_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  revenue DECIMAL(10,2) DEFAULT 0,
  expenses DECIMAL(10,2) DEFAULT 0,
  customers_count INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  hours_worked DECIMAL(5,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.business_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own business metrics"
  ON public.business_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business metrics"
  ON public.business_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business metrics"
  ON public.business_metrics
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business metrics"
  ON public.business_metrics
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_business_metrics_user_date ON public.business_metrics(user_id, metric_date DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_business_metrics_updated_at
  BEFORE UPDATE ON public.business_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();