import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setState(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading progress context:', error);
      }
    }
    setIsLoading(false);
  }, []);

  // Persist to localStorage on state change
  useEffect(() => {
    if (!isLoading && state.isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoading]);

  // Sync with database for authenticated users
  useEffect(() => {
    if (user && !isLoading) {
      syncWithDatabase();
    }
  }, [user, isLoading]);

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

  const calculateOverallProgress = (): number => {
    const { phases } = state;
    let totalProgress = 0;
    
    if (phases.braindump.completed) totalProgress += 25;
    if (phases.roadmap.completed) totalProgress += 25;
    if (phases.sprints.completed) totalProgress += 25;
    if (phases.scale.unlocked) totalProgress += 25;
    
    return totalProgress;
  };

  const syncWithDatabase = async () => {
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
  };

  const resetProgress = () => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Auto-calculate overall progress
  useEffect(() => {
    if (state.isInitialized) {
      const progress = calculateOverallProgress();
      if (progress !== state.overallProgress) {
        setState(prev => ({ ...prev, overallProgress: progress }));
      }
    }
  }, [state.phases]);

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
