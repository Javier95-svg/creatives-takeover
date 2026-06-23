import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { readScopedOrConsumeAnon } from '@/lib/accountScopedStorage';

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

interface UserContextType {
  state: UserContextState;
  updateSurveyData: (data: Partial<SurveyData>) => void;
  updatePreferences: (prefs: Partial<Preferences>) => void;
  completeOnboarding: () => void;
  resetUserData: () => void;
  getSurveyProgress: () => number;
  isLoading: boolean;
}

const STORAGE_KEY = 'creatives_takeover_user_context';
const SAVE_DEBOUNCE_MS = 1500;

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
  // Per-account cache key. Authenticated reads/writes use this scoped key so one
  // account can never read another account's context off a shared browser.
  const userScopedKey = user ? `${STORAGE_KEY}:${user.id}` : null;
  const [state, setState] = useState<UserContextState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether we're in the initial load phase to prevent save-on-load cascades
  const isInitialLoadRef = useRef(true);

  // Load from database or localStorage on mount
  useEffect(() => {
    isInitialLoadRef.current = true;

    if (user) {
      void loadUserContextFromDatabase();
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setState(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading user context:', error);
        }
      }
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [user]);

  // Debounced persist to localStorage and database on state change
  useEffect(() => {
    // Don't save during initial load or before initialization
    if (isLoading || !state.isInitialized || isInitialLoadRef.current) return;
    if (!user) return;

    if (userScopedKey) localStorage.setItem(userScopedKey, JSON.stringify(state));

    // Debounce database save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void saveUserContextToDatabase();
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
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
          // Fallback to the account-scoped cache (consuming any anonymous draft)
          const stored = userScopedKey ? readScopedOrConsumeAnon(STORAGE_KEY, userScopedKey) : null;
          if (stored) {
            try {
              setState(JSON.parse(stored));
            } catch (error) {
              console.error('Error loading user context:', error);
            }
          }
        }
      } else {
        // No data in database, check the account-scoped cache (consume anon draft)
        const stored = userScopedKey ? readScopedOrConsumeAnon(STORAGE_KEY, userScopedKey) : null;
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
      // Mark initial load as complete AFTER state has been set
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 0);
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

  const completeOnboarding = () => {
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
    if (userScopedKey) localStorage.removeItem(userScopedKey);
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

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return (
    <UserContext.Provider value={{
      state,
      updateSurveyData,
      updatePreferences,
      completeOnboarding,
      resetUserData,
      getSurveyProgress,
      isLoading,
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
