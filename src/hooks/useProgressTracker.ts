/**
 * Progress Tracker Hook
 * Manages milestones, blockers, and progress metrics for the AI Co-Founder system
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  ProgressMilestone,
  ProgressBlocker,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  CreateBlockerRequest,
  ResolveBlockerRequest,
  MilestoneStatus,
  ProgressMetrics,
} from '@/types/aiCofounder';

/**
 * Hook for managing progress milestones
 */
export const useProgressMilestones = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all milestones
  const {
    data: milestones,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['progress-milestones', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('progress_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('target_day', { ascending: true });

      if (error) throw error;
      return data as ProgressMilestone[];
    },
    enabled: !!userId,
  });

  // Create milestone
  const createMilestone = useMutation({
    mutationFn: async (request: CreateMilestoneRequest) => {
      if (!userId) throw new Error('User ID required');

      const { data, error } = await supabase
        .from('progress_milestones')
        .insert([
          {
            user_id: userId,
            ...request,
            status: 'not_started' as MilestoneStatus,
            completion_percentage: 0,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as ProgressMilestone;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['progress-milestones', userId] });
      void queryClient.invalidateQueries({ queryKey: ['progress-metrics', userId] });

      toast({
        title: 'Milestone Created',
        description: `"${data.milestone_name}" has been added to your plan.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating Milestone',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update milestone
  const updateMilestone = useMutation({
    mutationFn: async ({
      milestoneId,
      updates,
    }: {
      milestoneId: string;
      updates: UpdateMilestoneRequest;
    }) => {
      const { data, error } = await supabase
        .from('progress_milestones')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) throw error;
      return data as ProgressMilestone;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['progress-milestones', userId] });
      void queryClient.invalidateQueries({ queryKey: ['progress-metrics', userId] });

      if (data.status === 'completed') {
        toast({
          title: 'Milestone Completed! 🎉',
          description: `Great work on "${data.milestone_name}"!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Updating Milestone',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Start milestone (convenience function)
  const startMilestone = (milestoneId: string) => {
    return updateMilestone.mutate({
      milestoneId,
      updates: {
        status: 'in_progress',
      },
    });
  };

  // Complete milestone (convenience function)
  const completeMilestone = (milestoneId: string, qualityScore?: number) => {
    return updateMilestone.mutate({
      milestoneId,
      updates: {
        status: 'completed',
        completion_percentage: 100,
        quality_score: qualityScore,
      },
    });
  };

  // Delete milestone
  const deleteMilestone = useMutation({
    mutationFn: async (milestoneId: string) => {
      const { error } = await supabase
        .from('progress_milestones')
        .delete()
        .eq('id', milestoneId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['progress-milestones', userId] });
      void queryClient.invalidateQueries({ queryKey: ['progress-metrics', userId] });

      toast({
        title: 'Milestone Deleted',
        description: 'The milestone has been removed from your plan.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Deleting Milestone',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    milestones: milestones || [],
    isLoading,
    error,
    createMilestone: createMilestone.mutate,
    updateMilestone: updateMilestone.mutate,
    startMilestone,
    completeMilestone,
    deleteMilestone: deleteMilestone.mutate,
    isCreating: createMilestone.isPending,
    isUpdating: updateMilestone.isPending,
    isDeleting: deleteMilestone.isPending,
  };
};

/**
 * Hook for managing progress blockers
 */
export const useProgressBlockers = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch active blockers
  const {
    data: blockers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['progress-blockers', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('progress_blockers')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['open', 'in_progress'])
        .order('severity', { ascending: false })
        .order('identified_at', { ascending: false });

      if (error) throw error;
      return data as ProgressBlocker[];
    },
    enabled: !!userId,
  });

  // Create blocker
  const createBlocker = useMutation({
    mutationFn: async (request: CreateBlockerRequest) => {
      if (!userId) throw new Error('User ID required');

      const { data, error } = await supabase
        .from('progress_blockers')
        .insert([
          {
            user_id: userId,
            ...request,
            status: 'open',
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as ProgressBlocker;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['progress-blockers', userId] });
      void queryClient.invalidateQueries({ queryKey: ['progress-metrics', userId] });

      toast({
        title: 'Blocker Identified',
        description: `"${data.blocker_title}" has been added. Let's work on resolving it.`,
        variant: data.severity === 'critical' || data.severity === 'high' ? 'destructive' : 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating Blocker',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Resolve blocker
  const resolveBlocker = useMutation({
    mutationFn: async ({
      blockerId,
      resolution,
    }: {
      blockerId: string;
      resolution: ResolveBlockerRequest;
    }) => {
      const { data, error } = await supabase
        .from('progress_blockers')
        .update({
          status: 'resolved',
          resolution_notes: resolution.resolution_notes,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', blockerId)
        .select()
        .single();

      if (error) throw error;
      return data as ProgressBlocker;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['progress-blockers', userId] });
      void queryClient.invalidateQueries({ queryKey: ['progress-metrics', userId] });

      toast({
        title: 'Blocker Resolved! ✅',
        description: `"${data.blocker_title}" has been marked as resolved.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Resolving Blocker',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update blocker status
  const updateBlockerStatus = useMutation({
    mutationFn: async ({
      blockerId,
      status,
    }: {
      blockerId: string;
      status: 'open' | 'in_progress' | 'escalated';
    }) => {
      const { data, error } = await supabase
        .from('progress_blockers')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', blockerId)
        .select()
        .single();

      if (error) throw error;
      return data as ProgressBlocker;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['progress-blockers', userId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Updating Blocker',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete blocker
  const deleteBlocker = useMutation({
    mutationFn: async (blockerId: string) => {
      const { error } = await supabase
        .from('progress_blockers')
        .delete()
        .eq('id', blockerId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['progress-blockers', userId] });
      void queryClient.invalidateQueries({ queryKey: ['progress-metrics', userId] });

      toast({
        title: 'Blocker Deleted',
        description: 'The blocker has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Deleting Blocker',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    blockers: blockers || [],
    isLoading,
    error,
    createBlocker: createBlocker.mutate,
    resolveBlocker: resolveBlocker.mutate,
    updateBlockerStatus: updateBlockerStatus.mutate,
    deleteBlocker: deleteBlocker.mutate,
    isCreating: createBlocker.isPending,
    isResolving: resolveBlocker.isPending,
    isUpdating: updateBlockerStatus.isPending,
    isDeleting: deleteBlocker.isPending,
  };
};

/**
 * Hook for progress metrics and analytics
 */
export const useProgressMetrics = (userId: string | undefined) => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['progress-metrics', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Call database functions in parallel
      const [currentDayResult, velocityResult, blockersResult] = await Promise.all([
        supabase.rpc('get_current_plan_day', { user_uuid: userId }),
        supabase.rpc('calculate_progress_velocity', {
          user_uuid: userId,
          days: 7,
        }),
        supabase.rpc('get_active_blockers_count', { user_uuid: userId }),
      ]);

      // Get completed milestones
      const { data: milestones } = await supabase
        .from('progress_milestones')
        .select('id, quality_score')
        .eq('user_id', userId)
        .eq('status', 'completed');

      const completedMilestones = milestones?.map((m) => m.id) || [];

      // Calculate average quality score
      const qualityScores =
        milestones
          ?.filter((m) => m.quality_score !== null)
          .map((m) => m.quality_score || 0) || [];

      const qualityScore =
        qualityScores.length > 0
          ? Math.round(
              qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
            )
          : 0;

      const currentDay = currentDayResult.data || 0;
      const velocity = velocityResult.data || 0;
      const activeBlockers = blockersResult.data || 0;

      // Determine if on track (simple heuristic: at least 1 milestone per 4 days)
      const expectedMilestones = Math.floor(currentDay / 4);
      const onTrack = completedMilestones.length >= expectedMilestones;

      const progressMetrics: ProgressMetrics = {
        currentDay,
        completedMilestones,
        activeBlockers,
        velocity,
        qualityScore,
        onTrack,
      };

      return progressMetrics;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    metrics,
    isLoading,
  };
};

/**
 * Derived metrics and insights
 */
export const useProgressInsights = (userId: string | undefined) => {
  const { milestones } = useProgressMilestones(userId);
  const { blockers } = useProgressBlockers(userId);
  const { metrics } = useProgressMetrics(userId);

  const insights = {
    // Critical blockers that need immediate attention
    criticalBlockers: blockers.filter((b) =>
      ['high', 'critical'].includes(b.severity)
    ),

    // In-progress milestones
    activeMilestones: milestones.filter((m) => m.status === 'in_progress'),

    // Completed milestones
    completedMilestones: milestones.filter((m) => m.status === 'completed'),

    // Blocked milestones
    blockedMilestones: milestones.filter((m) => m.status === 'blocked'),

    // Next milestone to work on (not started, lowest target_day)
    nextMilestone: milestones
      .filter((m) => m.status === 'not_started')
      .sort((a, b) => (a.target_day || 999) - (b.target_day || 999))[0] || null,

    // Progress percentage (completed / total milestones)
    progressPercentage:
      milestones.length > 0
        ? Math.round(
            (milestones.filter((m) => m.status === 'completed').length /
              milestones.length) *
              100
          )
        : 0,

    // Is user on track based on metrics
    isOnTrack: metrics?.onTrack || false,

    // Days remaining in 30-day plan
    daysRemaining: Math.max(0, 30 - (metrics?.currentDay || 0)),

    // Recommendations
    recommendations: generateRecommendations(milestones, blockers, metrics),
  };

  return insights;
};

/**
 * Generate recommendations based on progress state
 */
function generateRecommendations(
  milestones: ProgressMilestone[],
  blockers: ProgressBlocker[],
  metrics: ProgressMetrics | null | undefined
): string[] {
  const recommendations: string[] = [];

  // Critical blockers
  const criticalBlockers = blockers.filter((b) =>
    ['high', 'critical'].includes(b.severity)
  );
  if (criticalBlockers.length > 0) {
    recommendations.push(
      `Address ${criticalBlockers.length} critical blocker(s) immediately`
    );
  }

  // Behind schedule
  if (metrics && !metrics.onTrack) {
    recommendations.push('Consider adjusting timeline or scope to get back on track');
  }

  // Low quality scores
  if (metrics && metrics.qualityScore < 60) {
    recommendations.push(
      'Spend more time validating and refining your completed work'
    );
  }

  // Too many blockers
  if (blockers.length > 3) {
    recommendations.push('Focus on resolving blockers before starting new work');
  }

  // No active milestones
  const activeMilestones = milestones.filter((m) => m.status === 'in_progress');
  if (activeMilestones.length === 0 && milestones.length > 0) {
    recommendations.push('Start working on your next milestone to maintain momentum');
  }

  // Good progress
  if (
    metrics &&
    metrics.onTrack &&
    metrics.qualityScore >= 70 &&
    blockers.length === 0
  ) {
    recommendations.push("Great progress! Keep up the momentum 🚀");
  }

  return recommendations;
}
