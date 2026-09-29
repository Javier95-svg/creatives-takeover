import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdaptiveOnboardingForm, ONBOARDING_LAST_STEP } from '@/components/AdaptiveOnboardingForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import OnboardingWallpaper from '@/components/wallpapers/OnboardingWallpaper';
import { Loader2 } from 'lucide-react';
import {
  trackOnboardingGuestResumed,
  trackOnboardingStarted,
  type OnboardingStartedSource,
} from '@/lib/analytics';
import { getOnboardingReturn, sanitizeReturnPath } from '@/lib/authRedirect';
import {
  isLegacyOnboardingExempt,
} from '@/lib/guidedOnboarding';
import { beginOnboardingSession, saveOnboardingProgress } from '@/lib/onboardingSession';
import type { OnboardingSessionV1 } from '@/lib/onboardingContext';
import { classifyOnboardingSituation } from '@/lib/onboardingClassification';
import { isReviewedUserType } from '@/lib/accountTypes';
import { clearGuestOnboarding, guestSnapshotAnswers, readGuestSnapshot } from '@/lib/guestOnboarding';

const ONBOARDING_STARTED_SOURCES: OnboardingStartedSource[] = [
  'signup_redirect',
  'dashboard_prompt',
  'direct',
  'tool_claim',
  'hero_guest',
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
  const [onboardingSession, setOnboardingSession] = useState<OnboardingSessionV1 | null>(null);
  const [autoFinish, setAutoFinish] = useState(false);

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
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('created_at, onboarding_completed, quiz_completed, user_preferences, subscription_tier')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;

        const requestedReturn = searchParams.get('return') ?? getOnboardingReturn('/app-entry');
        const returnTarget = sanitizeReturnPath(requestedReturn, '/app-entry');
        const safeExitTarget =
          returnTarget.startsWith('/onboarding') || returnTarget.startsWith('/setup-quiz')
            ? '/app-entry'
            : returnTarget;

        if (isLegacyOnboardingExempt(profile)) {
          navigate(safeExitTarget, { replace: true });
          setIsChecking(false);
          return;
        }

        if (profile?.onboarding_completed === true) {
          // An existing account signed in from the guest quiz: its answers
          // already exist, so the guest copy is not needed.
          clearGuestOnboarding();
          navigate(safeExitTarget, { replace: true });
          setIsChecking(false);
          return;
        }

        const source = getOnboardingStartedSource(searchParams, user.id, safeExitTarget, profile?.created_at);
        let session = await beginOnboardingSession({
          source,
          plan: profile?.subscription_tier,
          device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        });

        // Answers from the quiz they took before signing up: move them onto the
        // real session so nothing is asked twice. Founders and builders land on
        // the final screen and are finished automatically; reviewed types
        // re-confirm their choice, which runs the invitation check.
        const guestSnapshot = searchParams.get('resume') === 'guest' ? readGuestSnapshot() : null;
        if (guestSnapshot && session.status !== 'completed' && !session.answers.situation) {
          const segment = classifyOnboardingSituation(guestSnapshot.answers.situation);
          const reviewed = isReviewedUserType(segment);
          try {
            session = await saveOnboardingProgress({
              sessionId: session.id,
              currentStep: reviewed ? 0 : ONBOARDING_LAST_STEP,
              answers: { ...guestSnapshotAnswers(guestSnapshot), entryStage: reviewed ? 'choosing' : 'details' },
            });
            setAutoFinish(!reviewed);
            trackOnboardingGuestResumed({ segment: segment || 'unknown', auto_finished: !reviewed });
          } catch (resumeError) {
            // The quiz still opens; they answer again rather than being stuck.
            console.warn('Could not carry over guest onboarding answers', resumeError);
          }
        }
        setOnboardingSession(session);

        if (!hasTrackedStart.current) {
          hasTrackedStart.current = true;
          trackOnboardingStarted({
            source,
            userId: user.id,
            page_path: '/onboarding',
            quiz_version: 2,
            onboarding_session_id: session.id,
            flow_version: session.flow_version,
            rollout_variant: session.rollout_variant,
            plan: session.plan_snapshot,
            device: session.device_snapshot,
          });
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setFetchError('Unable to load your profile. Please refresh the page.');
        setIsChecking(false);
      }
    };

    void checkOnboardingStatus();
  }, [authLoading, isAuthenticated, navigate, searchParams, user]);

  const handleComplete = (_startRoute?: string) => {
    const requested = searchParams.get('return') ?? getOnboardingReturn('/app-entry');
    const target = sanitizeReturnPath(requested, '/app-entry');
    const explicitReturn = !['/app-entry', '/onboarding', '/setup-quiz'].includes(target.split('?')[0]);
    // Preserve explicit return links and onboarding's deliberately selected tool.
    navigate(explicitReturn ? target : _startRoute || '/app-entry');
  };

  return (
    <>
      <Helmet>
        <title>Onboarding | Creatives Takeover</title>
        <meta name="description" content="Complete your onboarding to get started with Creatives Takeover" />
      </Helmet>
      
      <OnboardingWallpaper />

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
            <div className="animate-fade-in-up">
              {/* Every active account must answer the classification question,
                  including people resuming an older experiment session. */}
              {onboardingSession ? (
                <AdaptiveOnboardingForm session={onboardingSession} onComplete={handleComplete} autoFinish={autoFinish} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Onboarding;
