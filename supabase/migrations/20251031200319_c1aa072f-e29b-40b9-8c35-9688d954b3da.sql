-- Create alerts table
CREATE TABLE IF NOT EXISTS public.dashboard_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('success', 'warning', 'error', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_dismissed BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  action_link TEXT,
  action_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Create revenue metrics table
CREATE TABLE IF NOT EXISTS public.revenue_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mrr DECIMAL(10, 2) DEFAULT 0,
  churn_rate DECIMAL(5, 2) DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  active_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  churned_customers INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, metric_date)
);

-- Create KPI goals table
CREATE TABLE IF NOT EXISTS public.kpi_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('revenue', 'customers', 'projects', 'custom')),
  goal_name TEXT NOT NULL,
  current_value DECIMAL(10, 2) DEFAULT 0,
  target_value DECIMAL(10, 2) NOT NULL,
  unit TEXT DEFAULT '',
  trend_percentage DECIMAL(5, 2) DEFAULT 0,
  period TEXT DEFAULT 'monthly' CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Stripe connection table
CREATE TABLE IF NOT EXISTS public.stripe_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT,
  is_connected BOOLEAN DEFAULT false,
  access_token TEXT,
  refresh_token TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dashboard_alerts
CREATE POLICY "Users can view their own alerts"
  ON public.dashboard_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.dashboard_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
  ON public.dashboard_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for revenue_metrics
CREATE POLICY "Users can view their own revenue metrics"
  ON public.revenue_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own revenue metrics"
  ON public.revenue_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own revenue metrics"
  ON public.revenue_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for kpi_goals
CREATE POLICY "Users can view their own KPI goals"
  ON public.kpi_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own KPI goals"
  ON public.kpi_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own KPI goals"
  ON public.kpi_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own KPI goals"
  ON public.kpi_goals FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for stripe_connections
CREATE POLICY "Users can view their own Stripe connection"
  ON public.stripe_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Stripe connection"
  ON public.stripe_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Stripe connection"
  ON public.stripe_connections FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_dashboard_alerts_user_id ON public.dashboard_alerts(user_id);
CREATE INDEX idx_dashboard_alerts_dismissed ON public.dashboard_alerts(user_id, is_dismissed);
CREATE INDEX idx_revenue_metrics_user_date ON public.revenue_metrics(user_id, metric_date DESC);
CREATE INDEX idx_kpi_goals_user_active ON public.kpi_goals(user_id, is_active);

-- Triggers for updated_at
CREATE TRIGGER update_revenue_metrics_updated_at
  BEFORE UPDATE ON public.revenue_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kpi_goals_updated_at
  BEFORE UPDATE ON public.kpi_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stripe_connections_updated_at
  BEFORE UPDATE ON public.stripe_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();