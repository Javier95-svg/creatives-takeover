import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import StartupHomeCommandCenter from '@/components/dashboard/StartupHomeCommandCenter';
import DashboardTodayCockpit from '@/components/dashboard/DashboardTodaySnapshot';
import PlatformUpdates from '@/components/dashboard/PlatformUpdates';
import FounderJourneyPanel from '@/components/dashboard/FounderJourneyPanel';
import DashboardFocusEditor from '@/components/dashboard/DashboardFocusEditor';
import FounderStageIntelligenceCard from '@/components/dashboard/FounderStageIntelligenceCard';
import DashboardTour from '@/components/dashboard/DashboardTour';
import ContinueArtifactCard from '@/components/dashboard/ContinueArtifactCard';
import CompletionChainResume from '@/components/dashboard/CompletionChainResume';
import { FirstResultActivationCard } from '@/components/dashboard/FirstResultActivationCard';
import { useExitIntent } from '@/hooks/useExitIntent';
import { ExitIntentModal } from '@/components/ExitIntentModal';
import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useDashboardBootstrapProfile } from '@/contexts/DashboardBootstrapContext';
import { trackDashboardFounderSignalsExpanded } from '@/lib/analytics';
import {
  getActivationPreferenceState,
  getDaysSinceSignup,
  shouldShowFirstResultMode,
  trackActivationReturnMilestones,
} from '@/lib/activationState';
import { normalizePlan } from '@/config/planPermissions';
import { trackRetentionEvent, type ActivationIntent } from '@/lib/retentionSystem';

interface DashboardActivationState {
  loading: boolean;
  showFirstResultBanner: boolean;
  activationIntent: ActivationIntent | null;
  continueUrl: string | null;
  firstArtifactLabel: string | null;
  firstArtifactType: string | null;
  onboardingSessionId: string | null;
  flowVersion: string | null;
  rolloutVariant: string | null;
}

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showExitIntent, closeExitIntent } = useExitIntent();
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const userId = user?.id ?? null;
  const userCreatedAt = user?.created_at ?? null;
  const fromIcpBuilder = searchParams.get('from') === 'icp_builder';
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const daysSinceSignup = getDaysSinceSignup(userCreatedAt);
  const profile = useDashboardBootstrapProfile();
  const activationState = useMemo<DashboardActivationState>(() => {
    if (!profile) {
      return {
        loading: Boolean(userId), showFirstResultBanner: false, activationIntent: null,
        continueUrl: null, firstArtifactLabel: null, firstArtifactType: null,
        onboardingSessionId: null, flowVersion: null, rolloutVariant: null,
      };
    }
    const preferenceState = getActivationPreferenceState(profile.user_preferences);
    const preferences = profile.user_preferences && typeof profile.user_preferences === 'object' && !Array.isArray(profile.user_preferences)
      ? profile.user_preferences as Record<string, unknown>
      : {};
    return {
      loading: false,
      showFirstResultBanner: shouldShowFirstResultMode({
        onboardingCompleted: profile.onboarding_completed,
        userPreferences: profile.user_preferences,
      }),
      activationIntent: preferenceState.activationIntent,
      continueUrl: preferenceState.firstArtifactResumeUrl,
      firstArtifactLabel: preferenceState.firstArtifactLabel,
      firstArtifactType: preferenceState.firstArtifactType,
      onboardingSessionId: typeof preferences.onboardingSessionId === 'string' ? preferences.onboardingSessionId : null,
      flowVersion: typeof preferences.onboardingFlowVersion === 'string' ? preferences.onboardingFlowVersion : null,
      rolloutVariant: typeof preferences.onboardingRolloutVariant === 'string' ? preferences.onboardingRolloutVariant : null,
    };
  }, [profile, userId]);
  const showFirstResultBanner = activationState.showFirstResultBanner;

  useEffect(() => {
    if (!userId || activationState.loading) return;
    void trackRetentionEvent('dashboard_viewed', {
      user_id: userId,
      activation_intent: activationState.activationIntent,
      source: 'dashboard',
      plan: currentPlan,
      days_since_signup: getDaysSinceSignup(userCreatedAt),
      first_artifact_type: activationState.firstArtifactType,
      first_result_mode: showFirstResultBanner,
      onboarding_session_id: activationState.onboardingSessionId,
      flow_version: activationState.flowVersion,
      rollout_variant: activationState.rolloutVariant,
    });
    trackActivationReturnMilestones({
      userId,
      userCreatedAt,
      activationIntent: activationState.activationIntent,
      source: 'dashboard',
      plan: currentPlan,
    });
  // DashboardShell resolves the bootstrap profile before this component mounts.
  // Keep analytics stable through auth/session refreshes without retriggering on
  // unrelated object identity changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan, userCreatedAt, userId]);

  const dismissIcpBanner = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('from');
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Dashboard — Creatives Takeover</title>
      </Helmet>
      <DashboardTour />
      {fromIcpBuilder ? (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-success/20 bg-success/10 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                ICP saved. Your dashboard is ready.
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Use your ICP to define your first target customer tasks and track your traction from here.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissIcpBanner}
            className="shrink-0 text-muted-foreground hover:text-muted-foreground"
            aria-label="Dismiss"
          >
            x
          </button>
        </div>
      ) : null}
      {!activationState.loading && showFirstResultBanner && activationState.activationIntent ? (
        <FirstResultActivationCard
          activationIntent={activationState.activationIntent}
          userId={user?.id}
          daysSinceSignup={daysSinceSignup}
          plan={currentPlan}
        />
      ) : activationState.continueUrl ? (
        <ContinueArtifactCard
          continueUrl={activationState.continueUrl}
          artifactLabel={activationState.firstArtifactLabel}
          artifactType={activationState.firstArtifactType}
          onboardingSessionId={activationState.onboardingSessionId}
          flowVersion={activationState.flowVersion}
          rolloutVariant={activationState.rolloutVariant}
        />
      ) : null}
      <CompletionChainResume />
      <DashboardTodayCockpit />
      <PlatformUpdates />
      <FounderJourneyPanel />
      <DashboardFocusEditor />
      <FounderStageIntelligenceCard />
      <DashboardDisclosure
        title="More founder signals"
        summary="Review your startup information and connect with relevant founders."
        className="mb-6"
        onOpenChange={(open) => {
          if (open) trackDashboardFounderSignalsExpanded();
        }}
      >
        <StartupHomeCommandCenter />
      </DashboardDisclosure>
      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
    </>
  );
};

export default Dashboard;
