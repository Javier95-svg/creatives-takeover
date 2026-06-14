/**
 * Enhanced Context Hook
 * Integrates the new AI Co-Founder context system with existing chatbot
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessContextService } from '@/services/businessContextService';
import type {
  AggregatedUserContext,
  EnhancedBusinessContext,
} from '@/types/aiCofounder';

/**
 * Hook to get aggregated user context for AI Co-Founder
 * This is the primary hook for accessing enhanced context in the chatbot
 */
export const useAggregatedContext = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: context,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['aggregated-context', userId],
    queryFn: async () => {
      if (!userId) return null;

      const result = await BusinessContextService.getAggregatedContext(userId);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch context');
      }

      return result.data || null;
    },
    enabled: !!userId,
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes in background
  });

  return {
    context,
    isLoading,
    error,
    refetch,
    userId,
  };
};

/**
 * Hook to get formatted context string for AI prompts
 */
export const useContextForAI = () => {
  const { context, isLoading } = useAggregatedContext();

  const formattedContext = context
    ? BusinessContextService.formatContextForAI(context)
    : '';

  return {
    formattedContext,
    context,
    isLoading,
  };
};

/**
 * Hook to get enriched business context for conversations
 * Merges base context with aggregated data
 */
export const useEnrichedBusinessContext = (
  baseContext: EnhancedBusinessContext
) => {
  const { context: aggregatedContext, isLoading } = useAggregatedContext();

  const enrichedContext = aggregatedContext
    ? BusinessContextService.enrichBusinessContext(baseContext, aggregatedContext)
    : baseContext;

  return {
    enrichedContext,
    aggregatedContext,
    isLoading,
  };
};

/**
 * Hook to check if context needs updates
 * Useful for showing prompts to complete profile or address blockers
 */
export const useContextHealth = () => {
  const { context, isLoading } = useAggregatedContext();

  if (!context || isLoading) {
    return {
      isHealthy: true,
      warnings: [],
      criticalIssues: [],
      recommendations: [],
      isLoading,
    };
  }

  const warnings: string[] = [];
  const criticalIssues: string[] = [];
  const recommendations: string[] = [];

  // Profile completeness
  if (context.insights.profileCompleteness < 30) {
    criticalIssues.push('Founder profile is less than 30% complete');
    recommendations.push('Complete your founder profile for personalized guidance');
  } else if (context.insights.profileCompleteness < 70) {
    warnings.push('Founder profile could be more complete');
  }

  // Critical blockers
  if (context.insights.criticalBlockers.length > 0) {
    criticalIssues.push(
      `${context.insights.criticalBlockers.length} critical blocker(s) detected`
    );
    recommendations.push('Address critical blockers before proceeding');
  }

  // Progress tracking
  if (!context.insights.isOnTrack) {
    warnings.push('Progress is behind schedule');
    recommendations.push('Consider adjusting your timeline or scope');
  }

  // Quality issues
  if (
    context.progressMetrics.qualityScore < 50 &&
    context.progressMetrics.completedMilestones.length > 0
  ) {
    warnings.push('Milestone quality is below expectations');
    recommendations.push('Spend more time validating your work');
  }

  // Too many active blockers
  if (context.activeBlockers.length > 5) {
    warnings.push('High number of active blockers');
    recommendations.push('Focus on resolving existing blockers');
  }

  const isHealthy = criticalIssues.length === 0 && warnings.length < 3;

  return {
    isHealthy,
    warnings,
    criticalIssues,
    recommendations,
    isLoading: false,
  };
};

/**
 * Hook to get proactive suggestions based on context
 * This powers the "AI Co-Founder" proactive guidance
 */
export const useProactiveSuggestions = () => {
  const { context, isLoading } = useAggregatedContext();

  if (!context || isLoading) {
    return {
      suggestions: [],
      isLoading,
    };
  }

  const suggestions: Array<{
    type: 'milestone' | 'blocker' | 'profile' | 'decision' | 'insight';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action?: string;
    actionData?: any;
  }> = [];

  // Next milestone suggestion
  if (context.insights.nextSuggestedMilestone) {
    suggestions.push({
      type: 'milestone',
      priority: 'high',
      title: 'Ready for the next milestone',
      description: `You should start working on: ${context.insights.nextSuggestedMilestone
        .replace(/_/g, ' ')
        .toUpperCase()}`,
      action: 'start_milestone',
      actionData: { milestoneType: context.insights.nextSuggestedMilestone },
    });
  }

  // Critical blockers
  context.insights.criticalBlockers.forEach((blocker) => {
    suggestions.push({
      type: 'blocker',
      priority: 'high',
      title: `Critical blocker: ${blocker.blocker_title}`,
      description: blocker.blocker_description,
      action: 'resolve_blocker',
      actionData: { blockerId: blocker.id },
    });
  });

  // Profile completion
  if (context.insights.profileCompleteness < 70) {
    suggestions.push({
      type: 'profile',
      priority: 'medium',
      title: 'Complete your founder profile',
      description: `Your profile is ${context.insights.profileCompleteness}% complete. A complete profile helps me provide better guidance.`,
      action: 'complete_profile',
    });
  }

  // Quality improvement
  if (
    context.progressMetrics.qualityScore < 60 &&
    context.progressMetrics.completedMilestones.length > 2
  ) {
    suggestions.push({
      type: 'insight',
      priority: 'medium',
      title: 'Consider improving milestone quality',
      description:
        'Your recent milestones have lower quality scores. Would you like to review and refine them?',
      action: 'review_quality',
    });
  }

  // Velocity insights
  if (context.progressMetrics.velocity < 0.5 && context.progressMetrics.currentDay > 7) {
    suggestions.push({
      type: 'insight',
      priority: 'medium',
      title: 'Progress velocity is low',
      description:
        "You're averaging less than 1 milestone every 2 weeks. Let's identify what's slowing you down.",
      action: 'analyze_velocity',
    });
  }

  // Decision-making support
  if (
    context.founderProfile?.decision_making_style === 'consensus-seeking' &&
    context.activeBlockers.some((b) => b.blocker_type === 'decision_paralysis')
  ) {
    suggestions.push({
      type: 'decision',
      priority: 'high',
      title: 'Decision paralysis detected',
      description:
        "I notice you're stuck on some decisions. Let me help you analyze the trade-offs.",
      action: 'decision_support',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    suggestions,
    isLoading: false,
  };
};

/**
 * Hook to invalidate context cache
 * Use this after major updates to force refetch
 */
export const useInvalidateContext = () => {
  const queryClient = useQueryClient();
  const { userId } = useAggregatedContext();

  const invalidateContext = () => {
    void queryClient.invalidateQueries({ queryKey: ['aggregated-context', userId] });
    void queryClient.invalidateQueries({ queryKey: ['progress-milestones', userId] });
    void queryClient.invalidateQueries({ queryKey: ['progress-blockers', userId] });
    void queryClient.invalidateQueries({ queryKey: ['progress-metrics', userId] });
  };

  return { invalidateContext };
};
