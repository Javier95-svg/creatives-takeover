import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export type BusinessStage = 'idea' | 'mvp' | 'traction' | 'growth';

export interface StageConfig {
  stage: BusinessStage;
  heroMetric: string;
  primaryGoal: string;
  criticalTaskTypes: string[];
  hiddenWidgets: string[];
  shownWidgets: string[];
  recommendations: string[];
  priorityWeights: {
    impact: number;
    urgency: number;
    effort: number;
    stage: number;
    energy: number;
    history: number;
  };
}

// Stage configurations
const STAGE_CONFIGS: Record<BusinessStage, StageConfig> = {
  idea: {
    stage: 'idea',
    heroMetric: 'validation_score',
    primaryGoal: 'Validate your concept',
    criticalTaskTypes: ['customer_interviews', 'market_research', 'problem_validation'],
    hiddenWidgets: ['revenue_tracking', 'investor_readiness'],
    shownWidgets: ['validation_hub', 'competitor_analysis', 'customer_needs'],
    recommendations: [
      'Talk to 10 potential customers this week',
      'Create a simple landing page',
      'Research 5 competitors',
      'Define your unique value proposition'
    ],
    priorityWeights: {
      impact: 1.0,
      urgency: 0.5,
      effort: -0.3,
      stage: 1.2,
      energy: 0.3,
      history: 0.2
    }
  },

  mvp: {
    stage: 'mvp',
    heroMetric: 'build_progress',
    primaryGoal: 'Ship your first version',
    criticalTaskTypes: ['feature_development', 'user_testing', 'iteration', 'build', 'ship'],
    hiddenWidgets: ['funding_tracker'],
    shownWidgets: ['active_projects', 'task_overview', 'quick_wins'],
    recommendations: [
      'Set launch date for this Friday, even if 80% ready',
      'Recruit 5 beta users',
      'Define core features (keep it minimal)',
      'Build onboarding flow',
      'Set up feedback collection'
    ],
    priorityWeights: {
      impact: 1.0,
      urgency: 0.8,
      effort: -0.4,
      stage: 1.5, // Strong emphasis on stage alignment
      energy: 0.4,
      history: 0.3
    }
  },

  traction: {
    stage: 'traction',
    heroMetric: 'user_growth_rate',
    primaryGoal: 'Prove product-market fit',
    criticalTaskTypes: ['user_acquisition', 'retention_optimization', 'feedback_loops', 'marketing'],
    hiddenWidgets: [],
    shownWidgets: ['revenue_tracking', 'investor_readiness', 'core_metrics', 'active_projects'],
    recommendations: [
      'Track cohort retention',
      'Optimize onboarding (reduce drop-off)',
      'Test pricing models',
      'Set up growth experiments',
      'Interview churned users'
    ],
    priorityWeights: {
      impact: 1.2,
      urgency: 0.7,
      effort: -0.3,
      stage: 1.0,
      energy: 0.5,
      history: 0.4
    }
  },

  growth: {
    stage: 'growth',
    heroMetric: 'mrr_growth',
    primaryGoal: 'Scale sustainably',
    criticalTaskTypes: ['hiring', 'process_building', 'fundraising', 'scaling', 'team'],
    hiddenWidgets: [],
    shownWidgets: ['all'], // Show everything
    recommendations: [
      'Build hiring pipeline',
      'Improve unit economics',
      'Prepare pitch deck',
      'Document processes',
      'Set up leadership team'
    ],
    priorityWeights: {
      impact: 1.5, // Higher emphasis on impact
      urgency: 0.6,
      effort: -0.2,
      stage: 0.8,
      energy: 0.6,
      history: 0.5
    }
  }
};

export interface UseStageConfigReturn {
  config: StageConfig;
  stage: BusinessStage;
  isLoading: boolean;
  error: string | null;
  updateStage: (newStage: BusinessStage) => Promise<void>;
}

/**
 * Hook to get stage-specific configuration for the dashboard
 * Optimized for MVP stage initially, expandable to other stages
 */
export function useStageConfig(): UseStageConfigReturn {
  const { user } = useAuth();
  const [stage, setStage] = useState<BusinessStage>('mvp'); // Default to MVP
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user's business stage from profile
   */
  useEffect(() => {
    if (!user) return;

    const fetchStage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('business_stage')
          .eq('id', user.id)
          .single();

        if (fetchError) throw fetchError;

        // Validate and set stage
        const userStage = data?.business_stage as BusinessStage;
        if (userStage && ['idea', 'mvp', 'traction', 'growth'].includes(userStage)) {
          setStage(userStage);
        } else {
          // Default to MVP if not set or invalid
          setStage('mvp');
        }
      } catch (err) {
        console.error('Error fetching business stage:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch stage');
        // Default to MVP on error
        setStage('mvp');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStage();
  }, [user]);

  /**
   * Update user's business stage
   */
  const updateStage = async (newStage: BusinessStage) => {
    if (!user) return;

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ business_stage: newStage })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setStage(newStage);
    } catch (err) {
      console.error('Error updating business stage:', err);
      throw err;
    }
  };

  /**
   * Get configuration for current stage
   */
  const config = useMemo(() => {
    return STAGE_CONFIGS[stage];
  }, [stage]);

  return {
    config,
    stage,
    isLoading,
    error,
    updateStage
  };
}

/**
 * Helper function to check if a widget should be shown for a given stage
 */
export function shouldShowWidget(widgetName: string, stage: BusinessStage): boolean {
  const config = STAGE_CONFIGS[stage];

  // If 'all' is in shownWidgets, show everything
  if (config.shownWidgets.includes('all')) {
    return true;
  }

  // If widget is explicitly shown
  if (config.shownWidgets.includes(widgetName)) {
    return true;
  }

  // If widget is explicitly hidden
  if (config.hiddenWidgets.includes(widgetName)) {
    return false;
  }

  // Default: show (unless stage config says otherwise)
  return true;
}

/**
 * Helper function to get stage-appropriate task keywords
 */
export function getStageKeywords(stage: BusinessStage): string[] {
  const config = STAGE_CONFIGS[stage];
  return config.criticalTaskTypes;
}
