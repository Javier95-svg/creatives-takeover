import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AIMode } from '@/types/aiMode';

interface RetentionMetrics {
  sessionCount: number;
  totalTimeMinutes: number;
  averageSessionLength: number;
  messagesPerSession: number;
  returnRate: number;
  modeDistribution: Record<AIMode, number>;
  streakDays: number;
  lastEngagement?: string;
}

interface UseRetentionTrackingReturn {
  metrics: RetentionMetrics | null;
  trackSessionStart: (mode: AIMode, sessionId: string) => Promise<void>;
  trackSessionEnd: (mode: AIMode, sessionId: string, messageCount: number) => Promise<void>;
  trackModeSwitch: (fromMode: AIMode, toMode: AIMode, sessionId: string, reason: string) => Promise<void>;
  trackStepCompletion: (stepNumber: number, stepKey: string, answer: string, timeSpent?: number) => Promise<void>;
  calculateEngagementScore: (messageCount: number, timeMinutes: number, mode: AIMode) => number;
  isLoading: boolean;
}

export const useRetentionTracking = (): UseRetentionTrackingReturn => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionStartTimes = useRef<Map<string, number>>(new Map());

  // Load user engagement metrics
  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get today's metrics
        const today = new Date().toISOString().split('T')[0];
        const { data: todayMetrics } = await supabase
          .from('user_engagement_metrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        // Get weekly metrics for return rate calculation
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: weeklyMetrics } = await supabase
          .from('user_engagement_metrics')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', weekAgo.toISOString().split('T')[0])
          .order('date', { ascending: false });

        // Calculate streak
        const streak = await calculateStreakDays(user.id);

        // Calculate return rate (days active in last 7 days / 7)
        const daysActive = weeklyMetrics?.length || 0;
        const returnRate = (daysActive / 7) * 100;

        // Calculate mode distribution
        const modeDist: Record<AIMode, number> = {
          strategy: 0,
          business: 0,
          research: 0,
          investor: 0,
        };

        weeklyMetrics?.forEach(metric => {
          if (metric.mode_distribution) {
            Object.entries(metric.mode_distribution).forEach(([mode, count]) => {
              if (mode in modeDist) {
                modeDist[mode as AIMode] += (count as number) || 0;
              }
            });
          }
        });

        setMetrics({
          sessionCount: todayMetrics?.session_count || 0,
          totalTimeMinutes: todayMetrics?.total_time_minutes || 0,
          averageSessionLength: todayMetrics?.total_time_minutes && todayMetrics?.session_count
            ? todayMetrics.total_time_minutes / todayMetrics.session_count
            : 0,
          messagesPerSession: todayMetrics?.messages_per_session || 0,
          returnRate: returnRate,
          modeDistribution: modeDist,
          streakDays: streak,
          lastEngagement: weeklyMetrics?.[0]?.date || undefined,
        });
      } catch (error) {
        console.error('Error loading retention metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, [user]);

  // Calculate streak days
  const calculateStreakDays = async (userId: string): Promise<number> => {
    try {
      const { data } = await supabase
        .from('user_engagement_metrics')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(30);

      if (!data || data.length === 0) return 0;

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < data.length; i++) {
        const metricDate = new Date(data[i].date);
        metricDate.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today.getTime() - metricDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === i) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  };

  // Track session start
  const trackSessionStart = useCallback(async (mode: AIMode, sessionId: string) => {
    if (!user) return;

    sessionStartTimes.current.set(sessionId, Date.now());

    try {
      await supabase.from('ai_mode_sessions').insert({
        user_id: user.id,
        session_id: sessionId,
        mode,
        started_at: new Date().toISOString(),
        message_count: 0,
      });

      // Update daily metrics
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('user_engagement_metrics').upsert({
        user_id: user.id,
        date: today,
        session_count: (metrics?.sessionCount || 0) + 1,
      }, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false,
      });
    } catch (error) {
      console.error('Error tracking session start:', error);
    }
  }, [user, metrics]);

  // Track session end
  const trackSessionEnd = useCallback(async (mode: AIMode, sessionId: string, messageCount: number) => {
    if (!user) return;

    const startTime = sessionStartTimes.current.get(sessionId);
    if (!startTime) return;

    const timeMinutes = Math.floor((Date.now() - startTime) / (1000 * 60));
    const engagementScore = calculateEngagementScore(messageCount, timeMinutes, mode);

    try {
      // Update session
      await supabase
        .from('ai_mode_sessions')
        .update({
          ended_at: new Date().toISOString(),
          message_count: messageCount,
          engagement_score: engagementScore,
        })
        .eq('session_id', sessionId)
        .eq('user_id', user.id);

      // Update daily metrics
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('user_engagement_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      const modeDist = existing?.mode_distribution || {};
      modeDist[mode] = ((modeDist[mode] as number) || 0) + 1;

      await supabase.from('user_engagement_metrics').upsert({
        user_id: user.id,
        date: today,
        session_count: (existing?.session_count || 0),
        total_time_minutes: (existing?.total_time_minutes || 0) + timeMinutes,
        mode_distribution: modeDist,
        messages_per_session: existing?.messages_per_session
          ? (existing.messages_per_session + messageCount) / 2
          : messageCount,
      }, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false,
      });

      sessionStartTimes.current.delete(sessionId);
    } catch (error) {
      console.error('Error tracking session end:', error);
    }
  }, [user]);

  // Track mode switch
  const trackModeSwitch = useCallback(async (
    fromMode: AIMode,
    toMode: AIMode,
    sessionId: string,
    reason: string
  ) => {
    if (!user) return;

    try {
      await supabase.from('mode_transitions').insert({
        user_id: user.id,
        session_id: sessionId,
        from_mode: fromMode,
        to_mode: toMode,
        transition_reason: reason as any,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking mode switch:', error);
    }
  }, [user]);

  // Track step completion (Strategy Mode)
  const trackStepCompletion = useCallback(async (
    stepNumber: number,
    stepKey: string,
    answer: string,
    timeSpent?: number
  ) => {
    if (!user) return;

    try {
      await supabase.from('strategy_step_completions').upsert({
        user_id: user.id,
        session_id: 'current', // Will be updated with actual session
        step_number: stepNumber,
        step_key: stepKey,
        answer,
        time_spent_minutes: timeSpent,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,step_number',
        ignoreDuplicates: false,
      });

      // Update profile strategy progress
      const { data: profile } = await supabase
        .from('profiles')
        .select('strategy_mode_progress')
        .eq('id', user.id)
        .single();

      const progress = profile?.strategy_mode_progress || {
        currentStep: 0,
        completedSteps: [],
        stepAnswers: {},
        startedAt: new Date().toISOString(),
        completionStatus: 'not_started',
      };

      const completedSteps = [...new Set([...progress.completedSteps, stepNumber - 1])];
      const isCompleted = completedSteps.length >= 7;

      await supabase
        .from('profiles')
        .update({
          strategy_mode_progress: {
            ...progress,
            currentStep: stepNumber,
            completedSteps,
            stepAnswers: {
              ...progress.stepAnswers,
              [stepKey]: answer,
            },
            lastStepCompletedAt: new Date().toISOString(),
            completionStatus: isCompleted ? 'completed' : 'in_progress',
          },
          strategy_mode_completed: isCompleted,
        })
        .eq('id', user.id);

      // Award achievement if all steps complete
      if (isCompleted) {
        await supabase.from('mode_achievements').insert({
          user_id: user.id,
          mode: 'strategy',
          achievement_type: 'completion_badge',
          unlocked_at: new Date().toISOString(),
          metadata: { allStepsCompleted: true },
        });
      }
    } catch (error) {
      console.error('Error tracking step completion:', error);
    }
  }, [user]);

  // Calculate engagement score
  const calculateEngagementScore = useCallback((
    messageCount: number,
    timeMinutes: number,
    mode: AIMode
  ): number => {
    // Base score from message count (max 50 points)
    const messageScore = Math.min(messageCount * 5, 50);

    // Time engagement score (max 30 points)
    const timeScore = Math.min(timeMinutes * 2, 30);

    // Mode bonus (Strategy Mode gets bonus for completion)
    const modeBonus = mode === 'strategy' ? 20 : 0;

    return messageScore + timeScore + modeBonus;
  }, []);

  return {
    metrics,
    trackSessionStart,
    trackSessionEnd,
    trackModeSwitch,
    trackStepCompletion,
    calculateEngagementScore,
    isLoading,
  };
};

