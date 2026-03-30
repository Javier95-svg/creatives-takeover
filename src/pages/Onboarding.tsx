import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingForm } from '@/components/OnboardingForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';
import {
  appendReturnParam,
  consumeOnboardingReturn,
  getOnboardingReturn,
  persistOnboardingReturn,
  sanitizeReturnPath,
} from '@/lib/authRedirect';
import {
  consumeCheckoutIntent,
  redirectToCheckoutIntent,
} from '@/lib/checkoutRedirect';
import {
  readActivationJourneyFromPreferences,
  shouldUseActivationStartRoute,
} from '@/lib/activationJourney';

const Onboarding = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryReturn = sanitizeReturnPath(searchParams.get('return'), '/dashboard');
  const storedReturn = getOnboardingReturn('/dashboard');
  const returnUrl = queryReturn !== '/dashboard' ? queryReturn : storedReturn;

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;

      persistOnboardingReturn(returnUrl);

      if (!isAuthenticated || !user) {
        // Onboarding requires an authenticated account.
        navigate(appendReturnParam('/login', returnUrl), { replace: true });
        return;
      }

      const pendingCheckoutIntent = consumeCheckoutIntent();
      if (pendingCheckoutIntent) {
        redirectToCheckoutIntent(pendingCheckoutIntent, user);
        return;
      }

      try {
        // Check if user has already completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        // STRICT CHECK: Only redirect if onboarding_completed is explicitly true
        // This ensures users who completed onboarding NEVER see this page again
        if (profile?.onboarding_completed === true) {
          // Already onboarded, immediately redirect to intended destination.
          const target = consumeOnboardingReturn(returnUrl);
          navigate(target, { replace: true });
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If error, allow user to continue (they might not have a profile yet)
      }
    };

    checkOnboardingStatus();
  }, [user, isAuthenticated, authLoading, navigate, returnUrl]);

  const handleComplete = async () => {
    const pendingCheckoutIntent = consumeCheckoutIntent();
    if (pendingCheckoutIntent) {
      redirectToCheckoutIntent(pendingCheckoutIntent, user);
      return;
    }

    const target = consumeOnboardingReturn(returnUrl);
    if (user && shouldUseActivationStartRoute(target)) {
      const { data } = await supabase
        .from('profiles')
        .select('user_preferences')
        .eq('id', user.id)
        .maybeSingle();

      const preferences = (data as { user_preferences?: Record<string, unknown> | null } | null)?.user_preferences;
      const activationJourney = readActivationJourneyFromPreferences(preferences);

      if (activationJourney?.startRoute) {
        navigate(activationJourney.startRoute, { replace: true });
        return;
      }
    }

    navigate(target, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Onboarding | Creatives Takeover</title>
        <meta name="description" content="Complete your onboarding to get started with Creatives Takeover" />
      </Helmet>
      
      {/* Home Wallpaper Background */}
      <HomeWallpaper />
      
      <div className="relative min-h-screen flex items-center justify-center py-8 px-4 sm:py-12">
        <div className="w-full max-w-4xl mx-auto">
          {/* Fade-in animation for smooth appearance */}
          <div className="animate-fade-in-up">
            <OnboardingForm onComplete={handleComplete} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Onboarding;
