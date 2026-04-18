import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingForm } from '@/components/OnboardingForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';
import { captureEvent } from '@/lib/analytics';
import { trackActivity } from '@/lib/activity';
import { getOnboardingReturn, sanitizeReturnPath } from '@/lib/authRedirect';
import {
  isLegacyOnboardingExempt,
  shouldRedirectToSetupQuiz,
} from '@/lib/guidedOnboarding';

const Onboarding = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasTrackedStart = useRef(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;

      if (!isAuthenticated || !user) {
        // Onboarding requires an authenticated account.
        navigate('/signup?return=/onboarding', { replace: true });
        return;
      }

      try {
        // Check if user has already completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, quiz_completed, user_preferences')
          .eq('id', user.id)
          .single();

        const requestedReturn = searchParams.get('return') ?? getOnboardingReturn('/dashboard');
        const returnTarget = sanitizeReturnPath(requestedReturn, '/dashboard');
        const safeExitTarget =
          returnTarget.startsWith('/onboarding') || returnTarget.startsWith('/setup-quiz')
            ? '/dashboard'
            : returnTarget;

        if (isLegacyOnboardingExempt(profile)) {
          navigate(safeExitTarget, { replace: true });
          return;
        }

        if (shouldRedirectToSetupQuiz(profile)) {
          navigate('/setup-quiz', { replace: true });
          return;
        }

        if (profile?.onboarding_completed === true) {
          navigate('/dashboard', { replace: true });
          return;
        }

        if (!hasTrackedStart.current) {
          hasTrackedStart.current = true;
          // FIX(retention): onboarding — emit a canonical onboarding_started event once the route is actually reached by an authenticated user.
          captureEvent('onboarding_started', {
            userId: user.id,
            page_path: '/onboarding',
          });
          void trackActivity('onboarding_started', {
            page_path: '/onboarding',
          }, user.id);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If error, allow user to continue (they might not have a profile yet)
      }
    };

    checkOnboardingStatus();
  }, [authLoading, isAuthenticated, navigate, searchParams, user]);

  const handleComplete = (_startRoute?: string) => {
    navigate('/setup-quiz');
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
