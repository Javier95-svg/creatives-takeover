import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
export interface DailyTask {
  id: string;
  user_id: string;
  task_text: string;
  task_date: string;
  priority: 'high' | 'medium' | 'low';
  is_completed: boolean;
  deadline?: string;
  business_impact_score?: number;
  effort_estimate?: number;
  stage_alignment_score?: number;
  blocks_task_ids?: string[];
  contributes_to_weekly_mission?: boolean;
  ai_generated?: boolean;
}

export interface PriorityScore {
  score: number;
  impact: number;
  urgency: number;
  effort: number;
  dependency: number;
  alignment: number;
}

export interface FocusRecommendation {
  task: DailyTask;
  score: PriorityScore;
  rationale: string[];
  expectedImpact: string;
  estimatedTime: string;
}

export interface UseDailyFocusReturn {
  recommendation: FocusRecommendation | null;
  alternativeRecommendations: FocusRecommendation[];
  isLoading: boolean;
  error: string | null;
  refreshRecommendation: () => Promise<void>;
  acceptRecommendation: () => Promise<void>;
  deferRecommendation: () => Promise<void>;
  overrideRecommendation: (taskId: string) => Promise<void>;
}

/**
 * Hook to get AI-recommended daily focus task using rule-based priority scoring
 * Optimized for MVP-stage founders initially
 */
export function useDailyFocus(): UseDailyFocusReturn {
  const { user } = useAuth();
  const [recommendation, setRecommendation] = useState<FocusRecommendation | null>(null);
  const [alternativeRecommendations, setAlternativeRecommendations] = useState<FocusRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate priority score for a task using rule-based algorithm
   */
  const calculatePriorityScore = useCallback((task: DailyTask, userStage: string = 'mvp'): PriorityScore => {
    let score = 0;
    const breakdown: PriorityScore = {
      score: 0,
      impact: 0,
      urgency: 0,
      effort: 0,
      dependency: 0,
      alignment: 0
    };

    // Impact (0-10)
    const impactScore = task.business_impact_score || 5;
    breakdown.impact = impactScore;
    score += impactScore;

    // Urgency (bonus if deadline within 3 days)
    if (task.deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilDeadline <= 3 && daysUntilDeadline >= 0) {
        breakdown.urgency = 10;
        score += 10;
      } else if (daysUntilDeadline < 0) {
        // Overdue - high urgency
        breakdown.urgency = 15;
        score += 15;
      }
    }

    // Dependency blocker (bonus if blocks other tasks)
    if (task.blocks_task_ids && task.blocks_task_ids.length > 0) {
      const dependencyBonus = task.blocks_task_ids.length * 5;
      breakdown.dependency = dependencyBonus;
      score += dependencyBonus;
    }

    // Weekly mission contribution (bonus)
    if (task.contributes_to_weekly_mission) {
      score += 10;
    }

    // Stage alignment (MVP stage: bonus for build/test/iterate keywords)
    if (userStage === 'mvp') {
      const mvpKeywords = /build|ship|test|launch|beta|deploy|release|publish|mvp|prototype/i;
      if (mvpKeywords.test(task.task_text)) {
        breakdown.alignment = 8;
        score += 8;
      }
    }

    // Effort penalty (discourage 8+ hour tasks)
    const effort = task.effort_estimate || 2;
    if (effort > 8) {
      const penalty = -5;
      breakdown.effort = penalty;
      score += penalty;
    }

    breakdown.score = score;
    return breakdown;
  }, []);

  /**
   * Generate rationale text based on score breakdown
   */
  const generateRationale = useCallback((task: DailyTask, scoreBreakdown: PriorityScore): string[] => {
    const rationale: string[] = [];

    // Impact
    if (scoreBreakdown.impact >= 7) {
      rationale.push(`High business impact (${scoreBreakdown.impact}/10) - moves key metrics`);
    }

    // Urgency
    if (scoreBreakdown.urgency > 0) {
      if (task.deadline) {
        const daysUntilDeadline = Math.ceil(
          (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilDeadline < 0) {
          rationale.push(`⚠️ OVERDUE by ${Math.abs(daysUntilDeadline)} days`);
        } else if (daysUntilDeadline === 0) {
          rationale.push('⏰ Due TODAY');
        } else {
          rationale.push(`⏰ Due in ${daysUntilDeadline} days`);
        }
      }
    }

    // Dependencies
    if (scoreBreakdown.dependency > 0 && task.blocks_task_ids) {
      rationale.push(`🔓 Unblocks ${task.blocks_task_ids.length} other task${task.blocks_task_ids.length > 1 ? 's' : ''}`);
    }

    // Weekly mission
    if (task.contributes_to_weekly_mission) {
      rationale.push('Contributes to your routine');
    }

    // Stage alignment
    if (scoreBreakdown.alignment > 0) {
      rationale.push('✅ Aligned with MVP stage priorities');
    }

    // Default if no specific rationale
    if (rationale.length === 0) {
      rationale.push('Important task based on overall priority');
    }

    return rationale;
  }, []);

  /**
   * Get expected impact text
   */
  const getExpectedImpact = useCallback((scoreBreakdown: PriorityScore): string => {
    if (scoreBreakdown.score >= 25) return '🔥 High';
    if (scoreBreakdown.score >= 15) return '⚡ Medium';
    return '💡 Low';
  }, []);

  /**
   * Get estimated time text
   */
  const getEstimatedTime = useCallback((task: DailyTask): string => {
    const effort = task.effort_estimate || 2;
    if (effort <= 1) return '< 1 hour';
    if (effort <= 3) return `${Math.round(effort)} hours`;
    if (effort <= 8) return `${Math.round(effort)} hours (full day)`;
    return `${Math.round(effort)} hours (multi-day)`;
  }, []);

  /**
   * Fetch and calculate daily focus recommendation
   */
  const fetchRecommendation = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get user's business stage
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_stage')
        .eq('id', user.id)
        .single();

      const userStage = profile?.business_stage || 'mvp';

      // Get all incomplete tasks for today and overdue
      const today = new Date().toISOString().split('T')[0];
      const { data: tasks, error: tasksError } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .or(`task_date.eq.${today},task_date.lt.${today}`)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) {
        setRecommendation(null);
        setAlternativeRecommendations([]);
        return;
      }

      // Calculate scores for all tasks
      const scoredTasks = tasks.map(task => {
        const scoreBreakdown = calculatePriorityScore(task as DailyTask, userStage);
        return {
          task: task as DailyTask,
          score: scoreBreakdown,
          rationale: generateRationale(task as DailyTask, scoreBreakdown),
          expectedImpact: getExpectedImpact(scoreBreakdown),
          estimatedTime: getEstimatedTime(task as DailyTask)
        };
      });

      // Sort by score (highest first)
      scoredTasks.sort((a, b) => b.score.score - a.score.score);

      // Top recommendation
      setRecommendation(scoredTasks[0]);

      // Alternative recommendations (2nd and 3rd)
      setAlternativeRecommendations(scoredTasks.slice(1, 3));

    } catch (err) {
      console.error('Error fetching daily focus recommendation:', err);
      setError(err instanceof Error ? err.message : 'Failed to get recommendation');
    } finally {
      setIsLoading(false);
    }
  }, [user, calculatePriorityScore, generateRationale, getExpectedImpact, getEstimatedTime]);

  /**
   * Accept the recommended task (mark as today's focus)
   */
  const acceptRecommendation = useCallback(async () => {
    if (!recommendation || !user) return;

    try {
      // Update task to mark it as AI-generated focus
      await supabase
        .from('daily_tasks')
        .update({ ai_generated: true })
        .eq('id', recommendation.task.id);

      // TODO: Track this in daily_focus_recommendations table (Phase 2)
      console.log('Accepted recommendation:', recommendation.task.id);
    } catch (err) {
      console.error('Error accepting recommendation:', err);
    }
  }, [recommendation, user]);

  /**
   * Defer the recommended task to tomorrow
   */
  const deferRecommendation = useCallback(async () => {
    if (!recommendation || !user) return;

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      await supabase
        .from('daily_tasks')
        .update({ task_date: tomorrowDate })
        .eq('id', recommendation.task.id);

      // Refresh to get new recommendation
      await fetchRecommendation();
    } catch (err) {
      console.error('Error deferring recommendation:', err);
    }
  }, [recommendation, user, fetchRecommendation]);

  /**
   * Override recommendation and select a different task
   */
  const overrideRecommendation = useCallback(async (taskId: string) => {
    if (!user) return;

    try {
      // Mark the selected task as today's focus
      await supabase
        .from('daily_tasks')
        .update({ ai_generated: true })
        .eq('id', taskId);

      // Refresh recommendation
      await fetchRecommendation();
    } catch (err) {
      console.error('Error overriding recommendation:', err);
    }
  }, [user, fetchRecommendation]);

  // Fetch recommendation on mount and when user changes
  useEffect(() => {
    void fetchRecommendation();
  }, [fetchRecommendation]);

  return {
    recommendation,
    alternativeRecommendations,
    isLoading,
    error,
    refreshRecommendation: fetchRecommendation,
    acceptRecommendation,
    deferRecommendation,
    overrideRecommendation
  };
}
