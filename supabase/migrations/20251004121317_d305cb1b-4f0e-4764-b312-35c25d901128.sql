-- Create commitment status enum
CREATE TYPE commitment_status AS ENUM ('active', 'achieved', 'failed', 'withdrawn');

-- Create sprint_commitments table
CREATE TABLE public.sprint_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- SMART Commitment Details
  commitment_text TEXT NOT NULL,
  measurable_metric TEXT NOT NULL,
  metric_value NUMERIC,
  metric_unit TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Credit Stake
  credits_staked INTEGER NOT NULL CHECK (credits_staked >= 1 AND credits_staked <= 100),
  credits_locked BOOLEAN DEFAULT true,
  
  -- Outcome Tracking
  status commitment_status NOT NULL DEFAULT 'active',
  actual_metric_value NUMERIC,
  proof_url TEXT,
  proof_notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  UNIQUE(sprint_id, user_id)
);

-- Create commitment_reactions table
CREATE TABLE public.commitment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID NOT NULL REFERENCES public.sprint_commitments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('support', 'celebrate', 'doubt', 'wow')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(commitment_id, user_id)
);

-- Enable RLS on sprint_commitments
ALTER TABLE public.sprint_commitments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sprint_commitments
CREATE POLICY "Users can view public commitments"
  ON public.sprint_commitments FOR SELECT
  USING (
    sprint_id IN (
      SELECT id FROM public.sprints WHERE user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.sprints WHERE id = sprint_id
    )
  );

CREATE POLICY "Users can create their own commitments"
  ON public.sprint_commitments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commitments"
  ON public.sprint_commitments FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable RLS on commitment_reactions
ALTER TABLE public.commitment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commitment_reactions
CREATE POLICY "Anyone can view reactions"
  ON public.commitment_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reactions"
  ON public.commitment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON public.commitment_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_sprint_commitments_updated_at
  BEFORE UPDATE ON public.sprint_commitments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();