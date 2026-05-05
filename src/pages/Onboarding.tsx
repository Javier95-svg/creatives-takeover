import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OnboardingForm } from '@/components/OnboardingForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';
import { Loader2 } from 'lucide-react';
import {
  trackOnboardingStarted,
  type OnboardingStartedSource,
} from '@/lib/analytics';
import { trackActivity } from '@/lib/activity';
import { getOnboardingReturn, sanitizeReturnPath } from '@/lib/authRedirect';
import {
  isLegacyOnboardingExempt,
  shouldRedirectToSetupQuiz,
} from '@/lib/guidedOnboarding';

const ONBOARDING_STARTED_SOURCES: OnboardingStartedSource[] = [
  'signup_redirect',
  'dashboard_prompt',
  'direct',
];

function getOnboardingStartedSource(
  searchParams: URLSearchParams,
  userId: string,
  returnTarget: string,
  profileCreatedAt?: string | null,
): OnboardingStartedSource {
  const source = searchParams.get('source');
  if (ONBOARDING_STARTED_SOURCES.includes(source as OnboardingStartedSource)) {
    return source as OnboardingStartedSource;
  }

  if (sessionStorage.getItem(`onboarding_redirect_${userId}`)) {
    return 'signup_redirect';
  }

  if (profileCreatedAt) {
    const createdMs = new Date(profileCreatedAt).getTime();
    if (!Number.isNaN(createdMs) && Date.now() - createdMs <= 10 * 60 * 1000) {
      return 'signup_redirect';
    }
  }

  if (returnTarget.startsWith('/dashboard')) {
    return 'dashboard_prompt';
  }

  return 'direct';
}

const Onboarding = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasTrackedStart = useRef(false);
  const [isChecking, setIsChecking] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;

      if (!isAuthenticated || !user) {
        // Onboarding requires an authenticated account.
        navigate('/signup?return=/onboarding', { replace: true });
        setIsChecking(false);
        return;
      }

      try {
        // Check if user has already completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at, onboarding_completed, quiz_completed, user_preferences')
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
          setIsChecking(false);
          return;
        }

        if (shouldRedirectToSetupQuiz(profile)) {
          navigate('/setup-quiz', { replace: true });
          setIsChecking(false);
          return;
        }

        if (profile?.onboarding_completed === true) {
          navigate('/dashboard', { replace: true });
          setIsChecking(false);
          return;
        }

        if (!hasTrackedStart.current) {
          hasTrackedStart.current = true;
          // FIX(retention): onboarding — emit a canonical onboarding_started event once the route is actually reached by an authenticated user.
          const source = getOnboardingStartedSource(searchParams, user.id, safeExitTarget, profile?.created_at);
          trackOnboardingStarted({
            source,
            userId: user.id,
            page_path: '/onboarding',
          });
          void trackActivity('onboarding_started', {
            page_path: '/onboarding',
            source,
          }, user.id);
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setFetchError('Unable to load your profile. Please refresh the page.');
        setIsChecking(false);
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

      {isChecking ? (
        <div className="relative min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : fetchError ? (
        <div className="relative min-h-screen flex items-center justify-center py-8 px-4">
          <div className="text-center space-y-4">
            <p className="text-destructive">{fetchError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="relative min-h-screen flex items-center justify-center py-8 px-4 sm:py-12">
          <div className="w-full max-w-4xl mx-auto">
            {/* Macro progress context */}
            <p className="text-center text-sm text-muted-foreground mb-4">
              Getting started — Step 1 of 2: Tell us about your startup
            </p>
            {/* Fade-in animation for smooth appearance */}
            <div className="animate-fade-in-up">
              <OnboardingForm onComplete={handleComplete} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Onboarding;
