import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/contexts/UserContext";
import { OnboardingFlow } from "./OnboardingFlow";

export const OnboardingWrapper = () => {
  const { user, loading: authLoading } = useAuth();
  const { shouldShowOnboarding, isLoading } = useUser();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (authLoading || isLoading) {
        return;
      }

      if (!user) {
        setIsChecking(false);
        setShowOnboarding(false);
        return;
      }

      try {
        const shouldShow = await shouldShowOnboarding();
        setShowOnboarding(shouldShow);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setShowOnboarding(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [user, authLoading, isLoading, shouldShowOnboarding]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (isChecking || authLoading || isLoading || !showOnboarding) {
    return null;
  }

  return (
    <OnboardingFlow
      open={showOnboarding}
      onComplete={handleOnboardingComplete}
    />
  );
};

