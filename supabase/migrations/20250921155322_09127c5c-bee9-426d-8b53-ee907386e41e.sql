-- Create accountability partnerships table
CREATE TABLE public.accountability_partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  sprint_id UUID,
  partnership_type TEXT NOT NULL DEFAULT 'sprint_buddy',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  partnership_settings JSONB DEFAULT '{}',
  UNIQUE(requester_id, partner_id, sprint_id)
);

-- Create accountability nudges table
CREATE TABLE public.accountability_nudges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL,
  nudger_id UUID NOT NULL,
  nudged_id UUID NOT NULL,
  nudge_type TEXT NOT NULL DEFAULT 'missed_checkin',
  message TEXT,
  nudge_trigger JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.accountability_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountability_nudges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accountability_partnerships
CREATE POLICY "Users can view partnerships they're involved in"
ON public.accountability_partnerships
FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create partnership requests"
ON public.accountability_partnerships
FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update partnerships they're involved in"
ON public.accountability_partnerships
FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = partner_id);

CREATE POLICY "Users can delete their own partnership requests"
ON public.accountability_partnerships
FOR DELETE
USING (auth.uid() = requester_id);

-- RLS Policies for accountability_nudges
CREATE POLICY "Users can view nudges they're involved in"
ON public.accountability_nudges
FOR SELECT
USING (auth.uid() = nudger_id OR auth.uid() = nudged_id);

CREATE POLICY "Users can create nudges in their partnerships"
ON public.accountability_nudges
FOR INSERT
WITH CHECK (
  auth.uid() = nudger_id AND
  partnership_id IN (
    SELECT id FROM accountability_partnerships 
    WHERE (requester_id = auth.uid() OR partner_id = auth.uid()) AND status = 'active'
  )
);

CREATE POLICY "Users can update their own nudges"
ON public.accountability_nudges
FOR UPDATE
USING (auth.uid() = nudged_id);

-- Add trigger for updated_at
CREATE TRIGGER update_accountability_partnerships_updated_at
BEFORE UPDATE ON public.accountability_partnerships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update sprint_accountability table to link with partnerships
ALTER TABLE public.sprint_accountability 
ADD COLUMN partnership_id UUID REFERENCES public.accountability_partnerships(id);

-- Create indexes for performance
CREATE INDEX idx_accountability_partnerships_requester ON public.accountability_partnerships(requester_id);
CREATE INDEX idx_accountability_partnerships_partner ON public.accountability_partnerships(partner_id);
CREATE INDEX idx_accountability_partnerships_sprint ON public.accountability_partnerships(sprint_id);
CREATE INDEX idx_accountability_nudges_partnership ON public.accountability_nudges(partnership_id);
CREATE INDEX idx_accountability_nudges_nudged ON public.accountability_nudges(nudged_id);