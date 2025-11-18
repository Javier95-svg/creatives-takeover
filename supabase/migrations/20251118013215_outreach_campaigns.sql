-- ================================================
-- OUTREACH CAMPAIGNS SYSTEM - DATABASE SCHEMA
-- ================================================

-- ============================================
-- 1. OUTREACH CAMPAIGNS
-- ============================================

CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL, -- Link to project
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'linkedin', 'whatsapp', 'sms', 'twitter', 'other')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10, 2) DEFAULT 0,
  target_contacts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. OUTREACH ACTIVITIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.outreach_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('sent', 'opened', 'replied', 'clicked', 'converted', 'bounced', 'unsubscribed')),
  contact_name TEXT,
  contact_info TEXT NOT NULL, -- email, phone, LinkedIn URL, etc.
  contact_title TEXT,
  contact_company TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'replied', 'converted', 'failed')),
  response_text TEXT,
  response_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. OUTREACH METRICS
-- ============================================

CREATE TABLE IF NOT EXISTS public.outreach_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, metric_date)
);

-- ============================================
-- 4. CUSTOMER ACQUISITION FUNNEL
-- ============================================

CREATE TABLE IF NOT EXISTS public.customer_acquisition_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  stage TEXT NOT NULL CHECK (stage IN ('awareness', 'interest', 'consideration', 'intent', 'purchase', 'retention')),
  count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_acquisition_funnel ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS POLICIES - OUTREACH CAMPAIGNS
-- ============================================

CREATE POLICY "Users can view their own campaigns"
  ON public.outreach_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns"
  ON public.outreach_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON public.outreach_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON public.outreach_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 7. RLS POLICIES - OUTREACH ACTIVITIES
-- ============================================

CREATE POLICY "Users can view their own activities"
  ON public.outreach_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities"
  ON public.outreach_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
  ON public.outreach_activities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
  ON public.outreach_activities FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 8. RLS POLICIES - OUTREACH METRICS
-- ============================================

CREATE POLICY "Users can view their own metrics"
  ON public.outreach_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own metrics"
  ON public.outreach_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics"
  ON public.outreach_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 9. RLS POLICIES - CUSTOMER ACQUISITION FUNNEL
-- ============================================

CREATE POLICY "Users can view their own funnel data"
  ON public.customer_acquisition_funnel FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own funnel data"
  ON public.customer_acquisition_funnel FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funnel data"
  ON public.customer_acquisition_funnel FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_outreach_campaigns_user_id ON public.outreach_campaigns(user_id);
CREATE INDEX idx_outreach_campaigns_status ON public.outreach_campaigns(status);
CREATE INDEX idx_outreach_campaigns_session_id ON public.outreach_campaigns(session_id);

CREATE INDEX idx_outreach_activities_campaign_id ON public.outreach_activities(campaign_id);
CREATE INDEX idx_outreach_activities_user_id ON public.outreach_activities(user_id);
CREATE INDEX idx_outreach_activities_status ON public.outreach_activities(status);
CREATE INDEX idx_outreach_activities_activity_type ON public.outreach_activities(activity_type);

CREATE INDEX idx_outreach_metrics_campaign_id ON public.outreach_metrics(campaign_id);
CREATE INDEX idx_outreach_metrics_user_id ON public.outreach_metrics(user_id);
CREATE INDEX idx_outreach_metrics_date ON public.outreach_metrics(metric_date DESC);

CREATE INDEX idx_customer_funnel_user_id ON public.customer_acquisition_funnel(user_id);
CREATE INDEX idx_customer_funnel_campaign_id ON public.customer_acquisition_funnel(campaign_id);
CREATE INDEX idx_customer_funnel_stage ON public.customer_acquisition_funnel(stage);

-- ============================================
-- 11. TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_outreach_campaigns_updated_at
  BEFORE UPDATE ON public.outreach_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outreach_activities_updated_at
  BEFORE UPDATE ON public.outreach_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outreach_metrics_updated_at
  BEFORE UPDATE ON public.outreach_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_funnel_updated_at
  BEFORE UPDATE ON public.customer_acquisition_funnel
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 12. HELPER FUNCTION: Calculate campaign metrics
-- ============================================

CREATE OR REPLACE FUNCTION public.get_campaign_metrics(
  p_campaign_id UUID
)
RETURNS TABLE (
  total_sent INTEGER,
  total_opened INTEGER,
  total_replied INTEGER,
  total_converted INTEGER,
  open_rate DECIMAL(5, 2),
  reply_rate DECIMAL(5, 2),
  conversion_rate DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE oa.activity_type = 'sent')::INTEGER as total_sent,
    COUNT(*) FILTER (WHERE oa.activity_type = 'opened')::INTEGER as total_opened,
    COUNT(*) FILTER (WHERE oa.activity_type = 'replied')::INTEGER as total_replied,
    COUNT(*) FILTER (WHERE oa.activity_type = 'converted')::INTEGER as total_converted,
    CASE 
      WHEN COUNT(*) FILTER (WHERE oa.activity_type = 'sent') > 0 
      THEN (COUNT(*) FILTER (WHERE oa.activity_type = 'opened')::DECIMAL / COUNT(*) FILTER (WHERE oa.activity_type = 'sent')) * 100
      ELSE 0
    END as open_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE oa.activity_type = 'sent') > 0 
      THEN (COUNT(*) FILTER (WHERE oa.activity_type = 'replied')::DECIMAL / COUNT(*) FILTER (WHERE oa.activity_type = 'sent')) * 100
      ELSE 0
    END as reply_rate,
    CASE 
      WHEN COUNT(*) FILTER (WHERE oa.activity_type = 'sent') > 0 
      THEN (COUNT(*) FILTER (WHERE oa.activity_type = 'converted')::DECIMAL / COUNT(*) FILTER (WHERE oa.activity_type = 'sent')) * 100
      ELSE 0
    END as conversion_rate
  FROM public.outreach_activities oa
  WHERE oa.campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

