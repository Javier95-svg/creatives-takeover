import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SurveyData {
  userRole: string | null;
  roleOther?: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  primaryGoals: string[];
  industry?: string;
  businessStage: 'idea' | 'planning' | 'building' | 'launched' | null;
}

interface Preferences {
  selectedFeatures: string[];
  onboardingCompleted: boolean;
  hasSeenTour: boolean;
  preferredWorkflow: 'structured' | 'flexible' | null;
}

interface UserContextState {
  surveyData: SurveyData;
  preferences: Preferences;
  lastUpdated: string | null;
  isInitialized: boolean;
}

export interface OnboardingProgress {
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  completedStep: number | null;
  completedAt: string | null;
  goal: string | null;
}

interface UserContextType {
  state: UserContextState;
  updateSurveyData: (data: Partial<SurveyData>) => void;
  updatePreferences: (prefs: Partial<Preferences>) => void;
  completeOnboarding: () => void; // Legacy method for backwards compatibility
  resetUserData: () => void;
  getSurveyProgress: () => number;
  isLoading: boolean;
  // Onboarding methods
  onboardingProgress: OnboardingProgress | null;
  updateOnboardingGoal: (goal: string) => Promise<void>;
  updateOnboardingStatus: (status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') => Promise<void>;
  completeOnboardingStep: (step: number) => Promise<void>;
  finishOnboarding: () => Promise<void>;
  getOnboardingProgress: () => Promise<OnboardingProgress | null>;
  shouldShowOnboarding: () => Promise<boolean>;
  syncOnboardingToDatabase: () => Promise<void>;
}

const STORAGE_KEY = 'creatives_takeover_user_context';
const ONBOARDING_STORAGE_KEY = 'ct_onboarding_progress';

const initialState: UserContextState = {
  surveyData: {
    userRole: null,
    experienceLevel: null,
    primaryGoals: [],
    businessStage: null,
  },
  preferences: {
    selectedFeatures: [],
    onboardingCompleted: false,
    hasSeenTour: false,
    preferredWorkflow: null,
  },
  lastUpdated: null,
  isInitialized: false,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<UserContextState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);

  // Load from database or localStorage on mount
  useEffect(() => {
    if (user) {
      loadUserContextFromDatabase();
      loadOnboardingProgress();
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setState(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading user context:', error);
        }
      }
      // Always load onboarding from localStorage (works for anonymous users)
      loadOnboardingProgress();
      setIsLoading(false);
    }
  }, [user]);

  // Persist to localStorage and database on state change
  useEffect(() => {
    if (!isLoading && state.isInitialized && user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      saveUserContextToDatabase();
    }
  }, [state, isLoading, user]);

  const loadUserContextFromDatabase = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_preferences')
        .eq('id', user.id)
        .single();

      if (profile?.user_preferences && typeof profile.user_preferences === 'object') {
        const prefs = profile.user_preferences as any;
        if (prefs.surveyData || prefs.preferences) {
          setState({
            surveyData: prefs.surveyData || initialState.surveyData,
            preferences: prefs.preferences || initialState.preferences,
            lastUpdated: prefs.lastUpdated || null,
            isInitialized: true,
          });
        } else {
          // Fallback to localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              setState(JSON.parse(stored));
            } catch (error) {
              console.error('Error loading user context:', error);
            }
          }
        }
      } else {
        // No data in database, check localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            setState(JSON.parse(stored));
          } catch (error) {
            console.error('Error loading user context:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user context from database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserContextToDatabase = async () => {
    if (!user || !state.isInitialized) return;

    try {
      await supabase
        .from('profiles')
        .update({
          user_preferences: {
            surveyData: state.surveyData,
            preferences: state.preferences,
            lastUpdated: state.lastUpdated,
          } as any
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error saving user context to database:', error);
    }
  };

  const updateSurveyData = (data: Partial<SurveyData>) => {
    setState(prev => ({
      ...prev,
      surveyData: { ...prev.surveyData, ...data },
      lastUpdated: new Date().toISOString(),
      isInitialized: true,
    }));
  };

  const updatePreferences = (prefs: Partial<Preferences>) => {
    setState(prev => ({
      ...prev,
      preferences: { ...prev.preferences, ...prefs },
      lastUpdated: new Date().toISOString(),
      isInitialized: true,
    }));
  };

  const completeLegacyOnboarding = () => {
    updatePreferences({ onboardingCompleted: true });
  };

  const resetUserData = async () => {
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ user_preferences: null })
          .eq('id', user.id);
      } catch (error) {
        console.error('Error resetting user data in database:', error);
      }
    }
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  const getSurveyProgress = (): number => {
    const { surveyData } = state;
    let completed = 0;
    const total = 4;
    
    if (surveyData.userRole) completed++;
    if (surveyData.experienceLevel) completed++;
    if (surveyData.primaryGoals?.length > 0) completed++;
    if (surveyData.businessStage) completed++;
    
    return Math.round((completed / total) * 100);
  };

  // Load onboarding progress from localStorage (always) and database (if authenticated)
  const loadOnboardingProgress = async () => {
    // Always check localStorage first (works for anonymous users)
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      try {
        const localStorageProgress = JSON.parse(stored) as OnboardingProgress;
        setOnboardingProgress(localStorageProgress);
      } catch (e) {
        console.error('Error parsing stored onboarding progress:', e);
      }
    }

    // If user is authenticated, also load from database and merge
    if (user) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_status, onboarding_completed_step, onboarding_completed_at, onboarding_goal')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profile) {
          const dbProgress: OnboardingProgress = {
            status: (profile.onboarding_status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') || 'NOT_STARTED',
            completedStep: profile.onboarding_completed_step || null,
            completedAt: profile.onboarding_completed_at || null,
            goal: profile.onboarding_goal || null,
          };
          
          // Merge: Prefer database if it exists, but localStorage takes priority for completion status
          // If localStorage says completed, trust it (user may have completed anonymously)
          const localStorageProgress = stored ? JSON.parse(stored) as OnboardingProgress : null;
          
          if (localStorageProgress?.status === 'COMPLETED') {
            // LocalStorage says completed, use it
            setOnboardingProgress(localStorageProgress);
            // Sync to database
            await supabase
              .from('profiles')
              .update({
                onboarding_status: localStorageProgress.status,
                onboarding_completed_step: localStorageProgress.completedStep,
                onboarding_completed_at: localStorageProgress.completedAt,
                onboarding_goal: localStorageProgress.goal,
              })
              .eq('id', user.id);
          } else if (dbProgress.status === 'COMPLETED') {
            // Database says completed, use it and sync to localStorage
            setOnboardingProgress(dbProgress);
            localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(dbProgress));
          } else {
            // Neither is completed, use database (more authoritative) but merge with localStorage goal if set
            const mergedProgress: OnboardingProgress = {
              ...dbProgress,
              goal: localStorageProgress?.goal || dbProgress.goal,
            };
            setOnboardingProgress(mergedProgress);
            localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(mergedProgress));
          }
        }
      } catch (error) {
        console.error('Error loading onboarding progress from database:', error);
        // Continue with localStorage progress if available
      }
    }
  };

  // Save onboarding progress to localStorage (always) and database (if authenticated)
  const saveOnboardingProgress = async (progress: OnboardingProgress) => {
    // Update state
    setOnboardingProgress(progress);
    
    // Always save to localStorage first (works for anonymous users immediately)
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));

    // Save to database if user is authenticated
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            onboarding_status: progress.status,
            onboarding_completed_step: progress.completedStep,
            onboarding_completed_at: progress.completedAt,
            onboarding_goal: progress.goal,
          })
          .eq('id', user.id);

        if (error) throw error;
      } catch (error) {
        console.error('Error saving onboarding progress to database:', error);
        // Continue even if DB save fails - localStorage is saved
      }
    }
  };

  // Get current progress from state or localStorage
  const getCurrentProgress = (): OnboardingProgress => {
    if (onboardingProgress) {
      return onboardingProgress;
    }
    
    // Check localStorage if state is not available (works for anonymous users)
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as OnboardingProgress;
      } catch (e) {
        console.error('Error parsing stored onboarding progress:', e);
      }
    }
    
    // Default: not started
    return {
      status: 'NOT_STARTED' as const,
      completedStep: null,
      completedAt: null,
      goal: null,
    };
  };

  // Update onboarding goal
  const updateOnboardingGoal = async (goal: string) => {
    const current = getCurrentProgress();
    
    await saveOnboardingProgress({
      ...current,
      goal,
    });
  };

  // Update onboarding status
  const updateOnboardingStatus = async (status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') => {
    const current = getCurrentProgress();
    
    await saveOnboardingProgress({
      ...current,
      status,
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : current.completedAt,
    });
  };

  // Complete a specific onboarding step
  const completeOnboardingStep = async (step: number) => {
    const current = getCurrentProgress();
    
    const newStatus = current.status === 'NOT_STARTED' ? 'IN_PROGRESS' : current.status;
    
    await saveOnboardingProgress({
      ...current,
      status: newStatus,
      completedStep: step,
    });
  };

  // Complete entire onboarding
  const finishOnboarding = async () => {
    const current = getCurrentProgress();
    
    await saveOnboardingProgress({
      status: 'COMPLETED',
      completedStep: 4,
      completedAt: new Date().toISOString(),
      goal: current.goal || null,
    });
  };

  // Get onboarding progress (from localStorage for anonymous, localStorage + DB for authenticated)
  const getOnboardingProgress = async (): Promise<OnboardingProgress | null> => {
    // Always check localStorage first (works for anonymous users)
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      try {
        const localStorageProgress = JSON.parse(stored) as OnboardingProgress;
        // If we have localStorage and no user, return it immediately and update state
        if (!user) {
          setOnboardingProgress(localStorageProgress);
          return localStorageProgress;
        }
        // If we have a user, also load from DB to merge
        if (!onboardingProgress) {
          await loadOnboardingProgress();
        }
        // Return current state (which may have been merged with DB)
        return onboardingProgress || localStorageProgress;
      } catch (e) {
        console.error('Error parsing stored onboarding progress:', e);
      }
    }
    
    // No localStorage: if authenticated, load from DB
    if (user && !onboardingProgress) {
      await loadOnboardingProgress();
      return onboardingProgress;
    }
    
    // No progress found anywhere
    return onboardingProgress || null;
  };

  // Check if onboarding should be shown (checks localStorage first, then DB if authenticated)
  const shouldShowOnboarding = async (): Promise<boolean> => {
    // Always check localStorage first (works for anonymous users)
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      try {
        const progress = JSON.parse(stored) as OnboardingProgress;
        // If localStorage says completed, don't show
        if (progress?.status === 'COMPLETED') {
          return false;
        }
      } catch (e) {
        // If corrupted, show onboarding
      }
    }
    
    // If authenticated, also check database
    if (user) {
      const progress = await getOnboardingProgress();
      return progress?.status !== 'COMPLETED';
    }
    
    // No localStorage and no user = first visit = show onboarding
    return true;
  };

  // Sync anonymous onboarding progress to database when user authenticates
  const syncOnboardingToDatabase = async () => {
    if (!user) return;
    
    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (stored) {
        const progress = JSON.parse(stored) as OnboardingProgress;
        
        // Sync to database
        const { error } = await supabase
          .from('profiles')
          .update({
            onboarding_status: progress.status,
            onboarding_completed_step: progress.completedStep,
            onboarding_completed_at: progress.completedAt,
            onboarding_goal: progress.goal,
          })
          .eq('id', user.id);

        if (error) throw error;
        
        console.log('Synced anonymous onboarding progress to database');
      }
    } catch (error) {
      console.error('Error syncing onboarding progress to database:', error);
    }
  };

  return (
    <UserContext.Provider value={{
      state,
      updateSurveyData,
      updatePreferences,
      completeOnboarding: completeLegacyOnboarding,
      resetUserData,
      getSurveyProgress,
      isLoading,
      // Onboarding methods
      onboardingProgress,
      updateOnboardingGoal,
      updateOnboardingStatus,
      completeOnboardingStep,
      finishOnboarding,
      getOnboardingProgress,
      shouldShowOnboarding,
      syncOnboardingToDatabase,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
