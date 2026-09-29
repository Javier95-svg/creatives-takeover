import { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';

import { AdaptiveOnboardingForm } from '@/components/AdaptiveOnboardingForm';
import SoftGateModal from '@/components/auth/SoftGateModal';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';
import { useAuth } from '@/contexts/AuthContext';
import { USER_TYPE_LABEL, type ReviewedUserType } from '@/lib/accountTypes';
import { trackOnboardingGuestGateShown, trackOnboardingStarted } from '@/lib/analytics';
import { sanitizeReturnPath } from '@/lib/authRedirect';
import { getGuestSession, saveGuestSnapshot } from '@/lib/guestOnboarding';
import type { OnboardingAnswersV1 } from '@/lib/onboardingContext';

type Gate = { title: string; description: string; returnPath: string };

/**
 * The onboarding quiz for signed-out visitors from the homepage box.
 *
 * They answer first and create an account last: the final screen shows their
 * plan, and "Create my free account" opens the signup dialog. Nothing is sent
 * to our servers before that; /onboarding picks the answers up after signup.
 */
export default function StartOnboarding() {
  const { isAuthenticated, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [session] = useState(getGuestSession);
  const [gate, setGate] = useState<Gate | null>(null);
  const trackedRef = useRef(false);

  // The tool the visitor asked for on the homepage, e.g. /icp-builder?seed=...
  const toolPath = sanitizeReturnPath(searchParams.get('return'), '');
  const isProduct = toolPath.startsWith('/demo-studio');

  useEffect(() => {
    if (loading || isAuthenticated || trackedRef.current) return;
    trackedRef.current = true;
    trackOnboardingStarted({
      source: 'hero_guest',
      page_path: '/start',
      quiz_version: 2,
      onboarding_session_id: session.id,
      flow_version: session.flow_version,
      rollout_variant: session.rollout_variant,
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
    });
  }, [isAuthenticated, loading, session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  // Already signed in: the regular onboarding handles it, keeping the return.
  if (isAuthenticated) {
    return <Navigate to={toolPath ? `/onboarding?return=${encodeURIComponent(toolPath)}` : '/onboarding'} replace />;
  }

  const resumePath = (withTool: boolean) =>
    `/onboarding?source=hero_guest&resume=guest${withTool && toolPath ? `&return=${encodeURIComponent(toolPath)}` : ''}`;

  const handlePlanReady = ({ answers, selectedIntent }: { answers: OnboardingAnswersV1; selectedIntent?: string }) => {
    saveGuestSnapshot({ answers, selectedIntent, returnPath: toolPath || undefined });
    trackOnboardingGuestGateShown({ segment: answers.founderSegment || 'unknown', reason: 'plan_ready' });
    setGate({
      title: 'Your plan is ready',
      description: 'Create a free account to save it and start your first step. It takes about 30 seconds.',
      returnPath: resumePath(true),
    });
  };

  const handleReviewedChoice = (segment: ReviewedUserType) => {
    // Only the choice is kept; their details are asked once they are signed in.
    saveGuestSnapshot({ answers: { situation: sessionSituation(segment), founderSegment: segment } as Partial<OnboardingAnswersV1> });
    trackOnboardingGuestGateShown({ segment, reason: 'reviewed_type' });
    setGate({
      title: 'Create your account to request access',
      description: `${USER_TYPE_LABEL[segment]} accounts are reviewed before they open. Create a free account, then tell us about your work.`,
      returnPath: resumePath(false),
    });
  };

  return (
    <>
      <Helmet>
        <title>Get started | Creatives Takeover</title>
        <meta name="description" content="Answer a few questions and get a plan for your idea or product." />
      </Helmet>
      <HomeWallpaper />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-4xl animate-fade-in-up">
          <AdaptiveOnboardingForm
            session={session}
            guest={{ onPlanReady: handlePlanReady, onReviewedChoice: handleReviewedChoice }}
          />
        </div>
      </div>
      <SoftGateModal
        open={Boolean(gate)}
        onOpenChange={(open) => { if (!open) setGate(null); }}
        trigger="onboarding_guest_gate"
        title={gate?.title}
        description={gate?.description}
        returnPathOverride={gate?.returnPath}
        signupSource="onboarding-guest"
        entryId={isProduct ? 'hero_demo_try' : 'hero_icp_builder'}
        activationTool={isProduct ? 'demo_studio' : 'icp_builder'}
        journeyTool={isProduct ? 'demo_studio' : 'icp_builder'}
        artifactType="onboarding_plan"
      />
    </>
  );
}

function sessionSituation(segment: ReviewedUserType) {
  return segment === 'mentor' ? 'share_expertise' : segment === 'marketplace' ? 'deliver_services' : 'explore_investments';
}
