import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

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

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setState(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading user context:', error);
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

  // Clear data on logout
  useEffect(() => {
    if (!user && state.isInitialized) {
      resetUserData();
    }
  }, [user]);

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

  const resetUserData = () => {
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
