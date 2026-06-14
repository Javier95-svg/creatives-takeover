import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

type PhaseType = 'braindump' | 'roadmap' | 'sprints' | 'scale';

interface PhaseData {
  completed: boolean;
  completedAt: string | null;
  conversationId?: string;
  roadmapId?: string;
  tasksGenerated?: number;
  activeSprints?: string[];
  completedSprints?: string[];
  totalTasksCompleted?: number;
  unlocked?: boolean;
  revenueGenerated?: number;
  customersAcquired?: number;
}

interface SprintStats {
  tasksCompleted?: number;
  status?: 'active' | 'completed';
}

interface ProgressContextState {
  currentPhase: PhaseType | null;
  phases: {
    braindump: PhaseData;
    roadmap: PhaseData;
    sprints: PhaseData;
    scale: PhaseData;
  };
  overallProgress: number;
  lastActivity: string | null;
  isInitialized: boolean;
}

interface ProgressContextType {
  state: ProgressContextState;
  advanceToPhase: (phase: PhaseType) => void;
  completePhase: (phase: PhaseType, metadata?: any) => void;
  updateSprintProgress: (sprintId: string, stats: SprintStats) => void;
  calculateOverallProgress: () => number;
  resetProgress: () => void;
  syncWithDatabase: () => Promise<void>;
  isLoading: boolean;
}

const STORAGE_KEY = 'creatives_takeover_progress_context';
const SAVE_DEBOUNCE_MS = 1500;

const initialState: ProgressContextState = {
  currentPhase: null,
  phases: {
    braindump: {
      completed: false,
      completedAt: null,
    },
    roadmap: {
      completed: false,
      completedAt: null,
      tasksGenerated: 0,
    },
    sprints: {
      completed: false,
      completedAt: null,
      activeSprints: [],
      completedSprints: [],
      totalTasksCompleted: 0,
    },
    scale: {
      completed: false,
      completedAt: null,
      unlocked: false,
      revenueGenerated: 0,
      customersAcquired: 0,
    },
  },
  overallProgress: 0,
  lastActivity: null,
  isInitialized: false,
};

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<ProgressContextState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we're in the initial load phase to prevent save-on-load cascades
  const isInitialLoadRef = useRef(true);

  // Load from database or localStorage on mount
  useEffect(() => {
    isInitialLoadRef.current = true;

    if (user) {
      void loadProgressFromDatabase();
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setState(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading progress context:', error);
        }
      }
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  }, [user]);

  // Debounced persist to localStorage and database on state change
  useEffect(() => {
    // Don't save during initial load or before initialization
    if (isLoading || !state.isInitialized || isInitialLoadRef.current) return;

    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      // Debounce database save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        void saveProgressToDatabase();
      }, SAVE_DEBOUNCE_MS);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, isLoading, user]);

  const loadProgressFromDatabase = async () => {
    if (!user) {
      setIsLoading(false);
      isInitialLoadRef.current = false;
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_preferences')
        .eq('id', user.id)
        .single();

      if (profile?.user_preferences && typeof profile.user_preferences === 'object' && 'progressState' in profile.user_preferences) {
        const prefs = profile.user_preferences as any;
        setState(prefs.progressState);
      } else {
        // No data in database, check localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setState(JSON.parse(stored));
          } catch (error) {
            console.error('Error loading progress context:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading progress from database:', error);
    } finally {
      setIsLoading(false);
      // Mark initial load as complete AFTER state has been set
      // Use setTimeout to ensure setState has been processed
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 0);
    }
  };

  const saveProgressToDatabase = async () => {
    if (!user || !state.isInitialized) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_preferences')
        .eq('id', user.id)
        .single();

      const existingPrefs = profile?.user_preferences && typeof profile.user_preferences === 'object'
        ? profile.user_preferences as Record<string, any>
        : {};

      const updatedPreferences = {
        ...existingPrefs,
        progressState: state,
      };

      await supabase
        .from('profiles')
        .update({ user_preferences: updatedPreferences as any })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error saving progress to database:', error);
    }
  };

  const advanceToPhase = (phase: PhaseType) => {
    setState(prev => ({
      ...prev,
      currentPhase: phase,
      lastActivity: new Date().toISOString(),
      isInitialized: true,
    }));
  };

  const completePhase = (phase: PhaseType, metadata?: any) => {
    setState(prev => ({
      ...prev,
      phases: {
        ...prev.phases,
        [phase]: {
          ...prev.phases[phase],
          completed: true,
          completedAt: new Date().toISOString(),
          ...metadata,
        },
      },
      lastActivity: new Date().toISOString(),
      isInitialized: true,
    }));
  };

  const updateSprintProgress = (sprintId: string, stats: SprintStats) => {
    setState(prev => {
      const sprintsPhase = prev.phases.sprints;
      const isNewSprint = !sprintsPhase.activeSprints?.includes(sprintId);

      return {
        ...prev,
        phases: {
          ...prev.phases,
          sprints: {
            ...sprintsPhase,
            activeSprints: isNewSprint
              ? [...(sprintsPhase.activeSprints || []), sprintId]
              : sprintsPhase.activeSprints,
            totalTasksCompleted: (sprintsPhase.totalTasksCompleted || 0) + (stats.tasksCompleted || 0),
            completedSprints: stats.status === 'completed' && !sprintsPhase.completedSprints?.includes(sprintId)
              ? [...(sprintsPhase.completedSprints || []), sprintId]
              : sprintsPhase.completedSprints,
          },
        },
        lastActivity: new Date().toISOString(),
        isInitialized: true,
      };
    });
  };

  const calculateOverallProgress = useCallback((): number => {
    const { phases } = state;
    let totalProgress = 0;

    if (phases.braindump.completed) totalProgress += 25;
    if (phases.roadmap.completed) totalProgress += 25;
    if (phases.sprints.completed) totalProgress += 25;
    if (phases.scale.unlocked) totalProgress += 25;

    return totalProgress;
  }, [state.phases]);

  const syncWithDatabase = useCallback(async () => {
    if (!user) return;

    try {
      const { data: sprints } = await supabase
        .from('sprints')
        .select('id, status')
        .eq('user_id', user.id);

      if (sprints && sprints.length > 0) {
        const activeSprints = sprints.filter(s => s.status === 'active').map(s => s.id);
        const completedSprints = sprints.filter(s => s.status === 'completed').map(s => s.id);

        setState(prev => ({
          ...prev,
          phases: {
            ...prev.phases,
            sprints: {
              ...prev.phases.sprints,
              activeSprints,
              completedSprints,
            },
          },
          isInitialized: true,
        }));
      }
    } catch (error) {
      console.error('Error syncing progress with database:', error);
    }
  }, [user]);

  const resetProgress = async () => {
    if (user) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_preferences')
          .eq('id', user.id)
          .single();

        const existingPrefs = profile?.user_preferences && typeof profile.user_preferences === 'object'
          ? profile.user_preferences as Record<string, any>
          : {};

        const updatedPreferences = {
          ...existingPrefs,
          progressState: null,
        };

        await supabase
          .from('profiles')
          .update({ user_preferences: updatedPreferences as any })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error resetting progress in database:', error);
      }
    }
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Auto-calculate overall progress (no cascading save — just updates the number)
  useEffect(() => {
    if (state.isInitialized) {
      const progress = calculateOverallProgress();
      if (progress !== state.overallProgress) {
        // Use functional update to avoid triggering another save cycle
        // This will trigger the save effect, but that's expected since progress changed
        setState(prev => {
          if (prev.overallProgress === progress) return prev; // Bail if no change
          return { ...prev, overallProgress: progress };
        });
      }
    }
  }, [state.phases, calculateOverallProgress]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return (
    <ProgressContext.Provider value={{
      state,
      advanceToPhase,
      completePhase,
      updateSprintProgress,
      calculateOverallProgress,
      resetProgress,
      syncWithDatabase,
      isLoading,
    }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within ProgressProvider');
  }
  return context;
};
