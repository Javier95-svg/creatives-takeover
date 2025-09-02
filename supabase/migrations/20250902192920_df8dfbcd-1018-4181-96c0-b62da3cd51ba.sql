-- Create trends table for storing real-time trend data
CREATE TABLE public.trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'business',
  trend_score DECIMAL(3,2) NOT NULL DEFAULT 0.0,
  source_urls TEXT[],
  keywords TEXT[] NOT NULL DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')) DEFAULT 'neutral',
  opportunity_score DECIMAL(3,2) DEFAULT 0.0,
  market_size_indicator TEXT,
  geographic_relevance TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active trends
CREATE POLICY "Anyone can view active trends" 
ON public.trends 
FOR SELECT 
USING (is_active = true AND expires_at > now());

-- Create index for performance
CREATE INDEX idx_trends_active_category ON public.trends(is_active, category, created_at DESC);
CREATE INDEX idx_trends_expires_at ON public.trends(expires_at);
CREATE INDEX idx_trends_keywords ON public.trends USING GIN(keywords);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trends_updated_at
BEFORE UPDATE ON public.trends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user trend preferences table
CREATE TABLE public.user_trend_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preferred_categories TEXT[] NOT NULL DEFAULT '{}',
  preferred_keywords TEXT[] NOT NULL DEFAULT '{}',
  notification_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for user preferences
ALTER TABLE public.user_trend_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user preferences
CREATE POLICY "Users can view their own trend preferences" 
ON public.user_trend_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trend preferences" 
ON public.user_trend_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trend preferences" 
ON public.user_trend_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for user preferences timestamps
CREATE TRIGGER update_user_trend_preferences_updated_at
BEFORE UPDATE ON public.user_trend_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();