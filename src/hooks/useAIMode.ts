import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AIMode, ModeMetadata, ModeTransition, StrategyModeProgress, MODE_CONFIGURATIONS } from '@/types/aiMode';

interface UseAIModeReturn {
  currentMode: AIMode;
  modeMetadata: ModeMetadata | null;
  strategyProgress: StrategyModeProgress | null;
  availableModes: AIMode[];
  canSwitchTo: (mode: AIMode) => boolean;
  switchMode: (mode: AIMode, reason?: string) => Promise<void>;
  detectModeFromQuery: (query: string) => AIMode;
  isLoading: boolean;
}

export const useAIMode = (sessionId: string): UseAIModeReturn => {
  const { user } = useAuth();
  const [currentMode, setCurrentMode] = useState<AIMode>('strategy');
  const [modeMetadata, setModeMetadata] = useState<ModeMetadata | null>(null);
  const [strategyProgress, setStrategyProgress] = useState<StrategyModeProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user's mode state and strategy progress
  useEffect(() => {
    const loadModeState = async () => {
      if (!user) {
        // Anonymous users always start in Strategy Mode
        setCurrentMode('strategy');
        setIsLoading(false);
        return;
      }

      try {
        // Check strategy mode completion status
        const { data: profile } = await supabase
          .from('profiles')
          .select('strategy_mode_completed, strategy_mode_progress')
          .eq('id', user.id)
          .single();

        const hasCompletedStrategy = profile?.strategy_mode_completed || false;
        const progress = profile?.strategy_mode_progress as StrategyModeProgress | null;

        setStrategyProgress(progress || {
          currentStep: 0,
          completedSteps: [],
          stepAnswers: {},
          startedAt: new Date().toISOString(),
          completionStatus: 'not_started',
        });

        // New users or users who haven't completed Strategy Mode must use Strategy Mode
        if (!hasCompletedStrategy && (!progress || progress.completionStatus !== 'completed')) {
          setCurrentMode('strategy');
        } else {
          // Allow other modes after Strategy completion
          // Load last used mode or default to strategy
          const { data: lastMode } = await supabase
            .from('ai_mode_sessions')
            .select('mode')
            .eq('user_id', user.id)
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

          setCurrentMode(lastMode?.mode || 'strategy');
        }

        setModeMetadata({
          mode: currentMode,
          currentStep: progress?.currentStep,
          completedSteps: progress?.completedSteps || [],
          totalSteps: 7,
        });
      } catch (error) {
        console.error('Error loading mode state:', error);
        // Default to Strategy Mode on error
        setCurrentMode('strategy');
      } finally {
        setIsLoading(false);
      }
    };

    loadModeState();
  }, [user, sessionId]);

  // Determine available modes based on user progress
  const availableModes: AIMode[] = (() => {
    const hasCompletedStrategy = strategyProgress?.completionStatus === 'completed';
    const modes: AIMode[] = ['strategy']; // Strategy is always available

    if (hasCompletedStrategy || !user) {
      // After strategy completion or for anonymous users, all modes available
      modes.push('business', 'research', 'investor');
    } else {
      // Research and Investor modes available even before Strategy completion
      modes.push('research', 'investor');
    }

    return modes;
  })();

  // Check if user can switch to a mode
  const canSwitchTo = useCallback((mode: AIMode): boolean => {
    const config = MODE_CONFIGURATIONS[mode];
    
    // Strategy Mode is always available
    if (mode === 'strategy') return true;

    // Check unlock conditions
    if (config.unlockCondition) {
      if (config.unlockCondition.type === 'completion') {
        return strategyProgress?.completionStatus === 'completed';
      }
    }

    return availableModes.includes(mode);
  }, [availableModes, strategyProgress]);

  // Detect mode from user query
  const detectModeFromQuery = useCallback((query: string): AIMode => {
    const lowerQuery = query.toLowerCase();

    // If user hasn't completed Strategy Mode, suggest staying in Strategy
    if (strategyProgress?.completionStatus !== 'completed') {
      // But allow explicit requests for other modes
      if (/research|market.*research|trend.*analysis/i.test(lowerQuery)) return 'research';
      if (/investor|funding|pitch|raise.*capital/i.test(lowerQuery)) return 'investor';
      // Default to Strategy for planning-related queries
      return 'strategy';
    }

    // After Strategy completion, full mode detection
    if (/investor|funding|pitch|raise|valuation|vc|angel|deck/i.test(lowerQuery)) {
      return 'investor';
    }

    if (/research|market.*trend|data.*analysis|insight.*research/i.test(lowerQuery)) {
      return 'research';
    }

    if (/advanced.*plan|business.*model|detailed.*planning|comprehensive.*plan/i.test(lowerQuery)) {
      return 'business';
    }

    if (/strategy|strategic|competitive|positioning|swot/i.test(lowerQuery)) {
      return 'strategy';
    }

    // Default based on completion status
    return strategyProgress?.completionStatus === 'completed' ? 'business' : 'strategy';
  }, [strategyProgress]);

  // Switch to a different mode
  const switchMode = useCallback(async (mode: AIMode, reason: string = 'user_request') => {
    if (!canSwitchTo(mode)) {
      console.warn(`Cannot switch to ${mode}: not available`);
      return;
    }

    const previousMode = currentMode;
    setCurrentMode(mode);

    // Track mode transition
    if (user && sessionId) {
      try {
        await supabase.from('mode_transitions').insert({
          user_id: user.id,
          session_id: sessionId,
          from_mode: previousMode,
          to_mode: mode,
          transition_reason: reason,
          timestamp: new Date().toISOString(),
        });

        // Start new mode session
        await supabase.from('ai_mode_sessions').insert({
          user_id: user.id,
          session_id: sessionId,
          mode,
          started_at: new Date().toISOString(),
          message_count: 0,
        });
      } catch (error) {
        console.error('Error tracking mode switch:', error);
      }
    }
  }, [currentMode, canSwitchTo, user, sessionId]);

  return {
    currentMode,
    modeMetadata,
    strategyProgress,
    availableModes,
    canSwitchTo,
    switchMode,
    detectModeFromQuery,
    isLoading,
  };
};

