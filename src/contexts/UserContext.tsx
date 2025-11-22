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
      // Load onboarding from localStorage for non-authenticated users
      const onboardingStored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (onboardingStored) {
        try {
          setOnboardingProgress(JSON.parse(onboardingStored));
        } catch (error) {
          console.error('Error loading onboarding progress:', error);
        }
      }
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

  // Load onboarding progress from database
  const loadOnboardingProgress = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_status, onboarding_completed_step, onboarding_completed_at, onboarding_goal')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        const progress: OnboardingProgress = {
          status: (profile.onboarding_status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') || 'NOT_STARTED',
          completedStep: profile.onboarding_completed_step || null,
          completedAt: profile.onboarding_completed_at || null,
          goal: profile.onboarding_goal || null,
        };
        setOnboardingProgress(progress);
        // Sync to localStorage as backup
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (stored) {
        try {
          setOnboardingProgress(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing stored onboarding progress:', e);
        }
      }
    }
  };

  // Save onboarding progress to database and localStorage
  const saveOnboardingProgress = async (progress: OnboardingProgress) => {
    // Update state
    setOnboardingProgress(progress);
    
    // Save to localStorage as backup
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
        // Continue even if DB save fails - localStorage backup is saved
      }
    }
  };

  // Update onboarding goal
  const updateOnboardingGoal = async (goal: string) => {
    const current = onboardingProgress || {
      status: 'NOT_STARTED' as const,
      completedStep: null,
      completedAt: null,
      goal: null,
    };
    
    await saveOnboardingProgress({
      ...current,
      goal,
    });
  };

  // Update onboarding status
  const updateOnboardingStatus = async (status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') => {
    const current = onboardingProgress || {
      status: 'NOT_STARTED' as const,
      completedStep: null,
      completedAt: null,
      goal: null,
    };
    
    await saveOnboardingProgress({
      ...current,
      status,
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : current.completedAt,
    });
  };

  // Complete a specific onboarding step
  const completeOnboardingStep = async (step: number) => {
    const current = onboardingProgress || {
      status: 'NOT_STARTED' as const,
      completedStep: null,
      completedAt: null,
      goal: null,
    };
    
    const newStatus = current.status === 'NOT_STARTED' ? 'IN_PROGRESS' : current.status;
    
    await saveOnboardingProgress({
      ...current,
      status: newStatus,
      completedStep: step,
    });
  };

  // Complete entire onboarding
  const finishOnboarding = async () => {
    await saveOnboardingProgress({
      status: 'COMPLETED',
      completedStep: 4,
      completedAt: new Date().toISOString(),
      goal: onboardingProgress?.goal || null,
    });
  };

  // Get onboarding progress
  const getOnboardingProgress = async (): Promise<OnboardingProgress | null> => {
    if (!onboardingProgress && user) {
      await loadOnboardingProgress();
    }
    return onboardingProgress;
  };

  // Check if onboarding should be shown
  const shouldShowOnboarding = async (): Promise<boolean> => {
    const progress = await getOnboardingProgress();
    // Only show if status is NOT 'COMPLETED'
    return progress?.status !== 'COMPLETED';
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
