-- ================================================
-- BIZMAP STRUCTURED - Database Schema
-- ================================================
-- Stores structured business components for deterministic BizMap AI system
-- Each component has fixed schema, validation status, and cross-references

-- ============================================
-- 1. BIZMAP SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.bizmap_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session state
  status TEXT NOT NULL CHECK (status IN ('draft', 'completing', 'complete', 'invalid')) DEFAULT 'draft',
  completion_percentage INTEGER NOT NULL CHECK (completion_percentage >= 0 AND completion_percentage <= 100) DEFAULT 0,
  current_component TEXT CHECK (current_component IN ('problem', 'target_user', 'value_prop', 'revenue', 'distribution', 'costs', 'risks', 'assumptions')),
  
  -- Metadata
  last_validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. BIZMAP COMPONENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.bizmap_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.bizmap_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Component type and data
  component_type TEXT NOT NULL CHECK (component_type IN ('problem', 'target_user', 'value_prop', 'revenue', 'distribution', 'costs', 'risks', 'assumptions')),
  component_data JSONB NOT NULL,
  
  -- Validation
  validation_status TEXT NOT NULL CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')) DEFAULT 'pending',
  validation_errors TEXT[] DEFAULT '{}',
  
  -- External data references (for cross-validation)
  external_data_refs JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one component per type per session
  UNIQUE(session_id, component_type)
);

-- ============================================
-- 3. BIZMAP VALIDATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.bizmap_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.bizmap_sessions(id) ON DELETE CASCADE NOT NULL,
  
  -- Validation type and result
  validation_type TEXT NOT NULL CHECK (validation_type IN ('component', 'cross_component', 'external_data', 'business_logic', 'comprehensive')),
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'warning')),
  
  -- Details
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  cross_references JSONB DEFAULT '{}'::jsonb,
  
  -- Metadata
  validated_components TEXT[] DEFAULT '{}', -- Which components were validated
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- BizMap sessions indexes
CREATE INDEX IF NOT EXISTS idx_bizmap_sessions_user_id ON public.bizmap_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bizmap_sessions_status ON public.bizmap_sessions(status);
CREATE INDEX IF NOT EXISTS idx_bizmap_sessions_updated_at ON public.bizmap_sessions(updated_at DESC);

-- BizMap components indexes
CREATE INDEX IF NOT EXISTS idx_bizmap_components_session_id ON public.bizmap_components(session_id);
CREATE INDEX IF NOT EXISTS idx_bizmap_components_type ON public.bizmap_components(component_type);
CREATE INDEX IF NOT EXISTS idx_bizmap_components_validation_status ON public.bizmap_components(validation_status);
CREATE INDEX IF NOT EXISTS idx_bizmap_components_session_type ON public.bizmap_components(session_id, component_type);

-- BizMap validations indexes
CREATE INDEX IF NOT EXISTS idx_bizmap_validations_session_id ON public.bizmap_validations(session_id);
CREATE INDEX IF NOT EXISTS idx_bizmap_validations_type ON public.bizmap_validations(validation_type);
CREATE INDEX IF NOT EXISTS idx_bizmap_validations_result ON public.bizmap_validations(result);
CREATE INDEX IF NOT EXISTS idx_bizmap_validations_timestamp ON public.bizmap_validations(timestamp DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.bizmap_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bizmap_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bizmap_validations ENABLE ROW LEVEL SECURITY;

-- BizMap sessions policies
CREATE POLICY "Users can view their own bizmap sessions"
  ON public.bizmap_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create their own bizmap sessions"
  ON public.bizmap_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own bizmap sessions"
  ON public.bizmap_sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own bizmap sessions"
  ON public.bizmap_sessions FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- BizMap components policies
CREATE POLICY "Users can view components of their own sessions"
  ON public.bizmap_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bizmap_sessions 
      WHERE bizmap_sessions.id = bizmap_components.session_id 
      AND (bizmap_sessions.user_id = auth.uid() OR bizmap_sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can create components for their own sessions"
  ON public.bizmap_components FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bizmap_sessions 
      WHERE bizmap_sessions.id = bizmap_components.session_id 
      AND (bizmap_sessions.user_id = auth.uid() OR bizmap_sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can update components of their own sessions"
  ON public.bizmap_components FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bizmap_sessions 
      WHERE bizmap_sessions.id = bizmap_components.session_id 
      AND (bizmap_sessions.user_id = auth.uid() OR bizmap_sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Users can delete components of their own sessions"
  ON public.bizmap_components FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.bizmap_sessions 
      WHERE bizmap_sessions.id = bizmap_components.session_id 
      AND (bizmap_sessions.user_id = auth.uid() OR bizmap_sessions.user_id IS NULL)
    )
  );

-- BizMap validations policies
CREATE POLICY "Users can view validations of their own sessions"
  ON public.bizmap_validations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bizmap_sessions 
      WHERE bizmap_sessions.id = bizmap_validations.session_id 
      AND (bizmap_sessions.user_id = auth.uid() OR bizmap_sessions.user_id IS NULL)
    )
  );

CREATE POLICY "Service role can manage all validations"
  ON public.bizmap_validations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bizmap_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bizmap_sessions_updated_at
  BEFORE UPDATE ON public.bizmap_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_bizmap_updated_at();

CREATE TRIGGER update_bizmap_components_updated_at
  BEFORE UPDATE ON public.bizmap_components
  FOR EACH ROW
  EXECUTE FUNCTION update_bizmap_updated_at();

