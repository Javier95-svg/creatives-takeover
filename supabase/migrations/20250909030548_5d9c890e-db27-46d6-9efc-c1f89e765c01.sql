-- Create success scoring tables
CREATE TABLE public.business_success_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID,
  user_id UUID,
  overall_score NUMERIC NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  market_clarity_score NUMERIC NOT NULL CHECK (market_clarity_score >= 0 AND market_clarity_score <= 100),
  problem_validation_score NUMERIC NOT NULL CHECK (problem_validation_score >= 0 AND problem_validation_score <= 100),
  solution_strength_score NUMERIC NOT NULL CHECK (solution_strength_score >= 0 AND solution_strength_score <= 100),
  market_strategy_score NUMERIC NOT NULL CHECK (market_strategy_score >= 0 AND market_strategy_score <= 100),
  financial_planning_score NUMERIC NOT NULL CHECK (financial_planning_score >= 0 AND financial_planning_score <= 100),
  execution_feasibility_score NUMERIC NOT NULL CHECK (execution_feasibility_score >= 0 AND execution_feasibility_score <= 100),
  risk_assessment TEXT NOT NULL DEFAULT 'medium',
  success_likelihood TEXT NOT NULL DEFAULT 'moderate',
  key_strengths TEXT[],
  improvement_areas TEXT[],
  action_recommendations TEXT[],
  scoring_criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_success_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own scores"
  ON public.business_success_scores FOR SELECT
  USING (user_id = auth.uid() OR (user_id IS NULL AND session_id IS NOT NULL));

CREATE POLICY "Users can insert their own scores"
  ON public.business_success_scores FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own scores"
  ON public.business_success_scores FOR UPDATE
  USING (user_id = auth.uid() OR (user_id IS NULL AND session_id IS NOT NULL));

-- Add foreign key relationships (optional, since session_id might be temp for non-auth users)
-- We'll keep it flexible for both authenticated and non-authenticated users

-- Add indexes for performance
CREATE INDEX idx_success_scores_user_id ON public.business_success_scores(user_id);
CREATE INDEX idx_success_scores_session_id ON public.business_success_scores(session_id);
CREATE INDEX idx_success_scores_overall ON public.business_success_scores(overall_score DESC);
CREATE INDEX idx_success_scores_created_at ON public.business_success_scores(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_success_scores_updated_at
  BEFORE UPDATE ON public.business_success_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to generate business success score
CREATE OR REPLACE FUNCTION public.calculate_business_success_score(
  answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  market_score NUMERIC := 0;
  problem_score NUMERIC := 0;
  solution_score NUMERIC := 0;
  strategy_score NUMERIC := 0;
  financial_score NUMERIC := 0;
  execution_score NUMERIC := 0;
  overall_score NUMERIC := 0;
  risk_level TEXT := 'medium';
  success_likelihood TEXT := 'moderate';
  strengths TEXT[] := '{}';
  improvements TEXT[] := '{}';
  recommendations TEXT[] := '{}';
  result JSONB;
BEGIN
  -- Market Clarity Score (0-100)
  market_score := CASE 
    WHEN length(answers->>'market') > 200 AND answers->>'market' ~* '(age|income|location|demographic)' THEN 90
    WHEN length(answers->>'market') > 100 AND answers->>'market' ~* '(target|customer|audience)' THEN 75
    WHEN length(answers->>'market') > 50 THEN 60
    ELSE 40
  END;

  -- Problem Validation Score (0-100)
  problem_score := CASE 
    WHEN length(answers->>'problem') > 150 AND answers->>'problem' ~* '(pain|frustrat|struggle|difficult)' THEN 85
    WHEN length(answers->>'problem') > 100 AND answers->>'problem' ~* '(problem|issue|challenge)' THEN 70
    WHEN length(answers->>'problem') > 50 THEN 55
    ELSE 35
  END;

  -- Solution Strength Score (0-100)
  solution_score := CASE 
    WHEN length(answers->>'solution') > 150 AND answers->>'solution' ~* '(unique|different|better|advantage)' THEN 90
    WHEN length(answers->>'solution') > 100 AND answers->>'solution' ~* '(solve|address|help)' THEN 75
    WHEN length(answers->>'solution') > 50 THEN 60
    ELSE 40
  END;

  -- Marketing Strategy Score (0-100)
  strategy_score := CASE 
    WHEN length(answers->>'channels') > 150 AND answers->>'channels' ~* '(social|referral|partnership|seo)' THEN 85
    WHEN length(answers->>'channels') > 100 AND answers->>'channels' ~* '(marketing|advertising|promotion)' THEN 70
    WHEN length(answers->>'channels') > 50 THEN 55
    ELSE 35
  END;

  -- Financial Planning Score (0-100)
  financial_score := CASE 
    WHEN length(answers->>'pricing') > 150 AND answers->>'pricing' ~* '(\$|revenue|cost|budget|price)' THEN 80
    WHEN length(answers->>'pricing') > 100 AND answers->>'pricing' ~* '(money|payment|income)' THEN 65
    WHEN length(answers->>'pricing') > 50 THEN 50
    ELSE 30
  END;

  -- Execution Feasibility Score (0-100)
  execution_score := CASE 
    WHEN length(answers->>'goals') > 150 AND answers->>'goals' ~* '(timeline|deadline|90 days|weeks|month)' THEN 85
    WHEN length(answers->>'goals') > 100 AND answers->>'goals' ~* '(goal|target|plan)' THEN 70
    WHEN length(answers->>'goals') > 50 THEN 55
    ELSE 40
  END;

  -- Calculate overall score (weighted average)
  overall_score := ROUND(
    (market_score * 0.20 + 
     problem_score * 0.20 + 
     solution_score * 0.20 + 
     strategy_score * 0.15 + 
     financial_score * 0.15 + 
     execution_score * 0.10), 1
  );

  -- Determine risk level and success likelihood
  IF overall_score >= 80 THEN
    risk_level := 'low';
    success_likelihood := 'high';
  ELSIF overall_score >= 65 THEN
    risk_level := 'medium';
    success_likelihood := 'good';
  ELSIF overall_score >= 50 THEN
    risk_level := 'medium';
    success_likelihood := 'moderate';
  ELSE
    risk_level := 'high';
    success_likelihood := 'challenging';
  END IF;

  -- Generate strengths
  IF market_score >= 75 THEN strengths := array_append(strengths, 'Clear target market understanding'); END IF;
  IF problem_score >= 75 THEN strengths := array_append(strengths, 'Well-defined problem validation'); END IF;
  IF solution_score >= 75 THEN strengths := array_append(strengths, 'Strong solution differentiation'); END IF;
  IF strategy_score >= 75 THEN strengths := array_append(strengths, 'Comprehensive marketing strategy'); END IF;
  IF financial_score >= 70 THEN strengths := array_append(strengths, 'Solid financial planning'); END IF;
  IF execution_score >= 75 THEN strengths := array_append(strengths, 'Realistic execution timeline'); END IF;

  -- Generate improvement areas
  IF market_score < 60 THEN improvements := array_append(improvements, 'Market definition needs more specificity'); END IF;
  IF problem_score < 60 THEN improvements := array_append(improvements, 'Problem validation could be stronger'); END IF;
  IF solution_score < 60 THEN improvements := array_append(improvements, 'Solution differentiation unclear'); END IF;
  IF strategy_score < 60 THEN improvements := array_append(improvements, 'Marketing strategy needs development'); END IF;
  IF financial_score < 55 THEN improvements := array_append(improvements, 'Financial model requires more detail'); END IF;
  IF execution_score < 60 THEN improvements := array_append(improvements, 'Timeline and goals need clarification'); END IF;

  -- Generate recommendations
  IF overall_score >= 80 THEN
    recommendations := array_append(recommendations, 'Your business concept shows strong potential - proceed with confidence');
    recommendations := array_append(recommendations, 'Consider building an MVP to validate market assumptions');
  ELSIF overall_score >= 65 THEN
    recommendations := array_append(recommendations, 'Good foundation - address improvement areas before launch');
    recommendations := array_append(recommendations, 'Conduct customer interviews to validate assumptions');
  ELSIF overall_score >= 50 THEN
    recommendations := array_append(recommendations, 'Moderate potential - significant refinement needed');
    recommendations := array_append(recommendations, 'Focus on improving weakest scoring areas');
  ELSE
    recommendations := array_append(recommendations, 'High risk - consider pivoting or major revisions');
    recommendations := array_append(recommendations, 'Conduct extensive market research before proceeding');
  END IF;

  -- Build result JSON
  result := jsonb_build_object(
    'overall_score', overall_score,
    'market_clarity_score', market_score,
    'problem_validation_score', problem_score,
    'solution_strength_score', solution_score,
    'market_strategy_score', strategy_score,
    'financial_planning_score', financial_score,
    'execution_feasibility_score', execution_score,
    'risk_assessment', risk_level,
    'success_likelihood', success_likelihood,
    'key_strengths', strengths,
    'improvement_areas', improvements,
    'action_recommendations', recommendations,
    'scoring_breakdown', jsonb_build_object(
      'market_clarity', market_score,
      'problem_validation', problem_score,
      'solution_strength', solution_score,
      'marketing_strategy', strategy_score,
      'financial_planning', financial_score,
      'execution_feasibility', execution_score
    )
  );

  RETURN result;
END;
$$;