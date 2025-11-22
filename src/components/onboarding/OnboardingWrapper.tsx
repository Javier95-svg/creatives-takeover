import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { OnboardingFlow } from "./OnboardingFlow";

const ONBOARDING_STORAGE_KEY = 'ct_onboarding_progress';

// Check localStorage for onboarding completion (works for anonymous users)
const checkLocalStorageOnboarding = (): boolean => {
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      const progress = JSON.parse(stored);
      // Return false if completed, true if not completed or missing
      return progress?.status !== 'COMPLETED';
    }
    // No localStorage = first visit = show onboarding
    return true;
  } catch (error) {
    // If corrupted, show onboarding to reset
    return true;
  }
};

export const OnboardingWrapper = () => {
  const { user, loading: authLoading } = useAuth();
  const { shouldShowOnboarding, isLoading } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      // Check localStorage immediately (synchronous - works for anonymous users)
      const localStorageShouldShow = checkLocalStorageOnboarding();
      
      // For anonymous users (no auth loading or no user), check localStorage immediately
      if (!authLoading && !user) {
        setShowOnboarding(localStorageShouldShow);
        setIsChecking(false);
        return;
      }

      // For authenticated users, wait for auth and user context
      if (authLoading) {
        return;
      }

      if (user && isLoading) {
        return;
      }

      try {
        // If localStorage says completed, don't show (takes priority)
        if (!localStorageShouldShow) {
          setShowOnboarding(false);
          setIsChecking(false);
          return;
        }

        // User is authenticated, also check database
        if (user) {
          try {
            const dbShouldShow = await shouldShowOnboarding();
            // Show if both say not completed
            setShowOnboarding(dbShouldShow && localStorageShouldShow);
          } catch (error) {
            console.error('Error checking onboarding status from database:', error);
            // Fallback to localStorage decision
            setShowOnboarding(localStorageShouldShow);
          }
        } else {
          // Shouldn't reach here (handled above), but fallback
          setShowOnboarding(localStorageShouldShow);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // On error, default to showing onboarding (better UX)
        setShowOnboarding(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [user, authLoading, isLoading, shouldShowOnboarding]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Show loading state only while checking (don't wait for user context if anonymous)
  if (isChecking || (user && isLoading) || !showOnboarding) {
    return null;
  }

  return (
    <OnboardingFlow
      open={showOnboarding}
      onComplete={handleOnboardingComplete}
    />
  );
};

