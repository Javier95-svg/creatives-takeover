import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
import { useAccountContext } from '@/hooks/useAccountContext';
import AccountOverview from '@/components/dashboard/AccountOverview';
import { useSubscription } from '@/hooks/useSubscription';
import { useDashboardBootstrapProfile } from '@/contexts/DashboardBootstrapContext';
import { trackDashboardFounderSignalsExpanded } from '@/lib/analytics';
import {
  getActivationPreferenceState,
  getDaysSinceSignup,
  shouldShowFirstResultMode,
  trackActivationReturnMilestones,
} from '@/lib/activationState';
import { getDashboardModeConfig, normalizePlan, resolveDashboardMode } from '@/config/planPermissions';
import { DASHBOARD_CARD } from '@/components/dashboard/DashboardPanel';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { cn } from '@/lib/utils';
import { trackRetentionEvent, type ActivationIntent } from '@/lib/retentionSystem';
import { Skeleton } from '@/components/ui/skeleton';
import { useCohortContext } from '@/hooks/useCohortContext';
import { CohortModeSwitch } from '@/components/cohort/CohortModeSwitch';
import { useCohortView } from '@/hooks/useCohortView';
import FounderCohortView from '@/components/cohort/FounderCohortView';
import ProgramDashboard from '@/components/cohort/ProgramDashboard';

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

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Date, greeting, and which startup and mode this page is about. */
function DashboardGreeting({ plan }: { plan: ReturnType<typeof normalizePlan> }) {
  const { user } = useAuth();
  const { snapshot } = useDashboardData();
  const now = new Date();
  const fullName = (user?.user_metadata as { full_name?: string } | undefined)?.full_name ?? snapshot?.profile.fullName ?? '';
  const firstName = fullName.trim().split(/\s+/)[0];
  const mode = getDashboardModeConfig(resolveDashboardMode(plan));
  const context = [snapshot?.profile.startupName, mode.label, mode.badgeDescription].filter(Boolean).join(' · ');
  return (
    <header className="mb-8 space-y-1 px-1">
      <p className="text-sm text-muted-foreground">
        {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <h1 className="text-balance font-space-grotesk text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {greetingFor(now.getHours())}{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-sm text-muted-foreground" title={mode.subtitle}>{context}</p>
    </header>
  );
}

// The founder Overview. Split out so the per type branch below can choose
// between two components rather than calling hooks conditionally.
const FounderDashboard = () => {
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
    <div className="mx-auto w-full max-w-5xl">
      <Helmet>
        <title>Dashboard — Creatives Takeover</title>
      </Helmet>
      <DashboardTour />
      <DashboardGreeting plan={currentPlan} />
      {fromIcpBuilder ? (
        <div className={cn(DASHBOARD_CARD, 'mb-6 flex items-start justify-between gap-4 p-5')}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">
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
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" aria-hidden="true" />
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
      <div className="mb-10 space-y-4">
        <FounderJourneyPanel />
        <FounderStageIntelligenceCard />
      </div>
      <DashboardFocusEditor />
      <PlatformUpdates />
      <DashboardDisclosure
        title="More founder signals"
        summary="Review your startup information and connect with relevant founders."
        className="mb-6 rounded-2xl bg-card"
        onOpenChange={(open) => {
          if (open) trackDashboardFounderSignalsExpanded();
        }}
      >
        <StartupHomeCommandCenter />
      </DashboardDisclosure>
      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
    </div>
  );
};

/**
 * Which Overview this account gets.
 *
 * Founders and builders get exactly what they had. The other three get a page
 * about the work they actually do here, rather than a journey cockpit that
 * assumes they are building a startup.
 *
 * Cohort mode (2026-10-19) sits beside the account types: program staff open on
 * the program dashboard and founders in a cohort open on their cohort view,
 * with "My workspace" one click away for both.
 */
const UsualDashboard = ({ userType }: { userType: ReturnType<typeof useAccountContext>['userType'] }) => {
  if (userType === 'mentor' || userType === 'marketplace' || userType === 'investor') return <AccountOverview />;
  return <FounderDashboard />;
};

const Dashboard = () => {
  const { userType } = useAccountContext();
  const { context: cohort, loading: cohortLoading } = useCohortContext();
  const { workspace, setWorkspace } = useCohortView();
  const [selectedStaffCohort, setSelectedStaffCohort] = useState<string | null>(null);

  const usual = <UsualDashboard userType={userType} />;

  if (cohortLoading) return <Skeleton className="mb-6 h-64 rounded-xl" />;
  const isStaff = cohort.staff.length > 0;
  if (!isStaff && !cohort.member) return usual;

  const modeSwitch = (
    <CohortModeSwitch cohortLabel={isStaff ? 'Program' : 'Cohort'} workspace={workspace} onChange={setWorkspace} />
  );
  if (workspace) return <>{modeSwitch}{usual}</>;
  if (isStaff) {
    const cohortId = selectedStaffCohort ?? cohort.staff[0].cohortId;
    return (
      <>
        {modeSwitch}
        <ProgramDashboard cohortId={cohortId} cohortOptions={cohort.staff} onSelectCohort={setSelectedStaffCohort} />
      </>
    );
  }
  return <>{modeSwitch}<FounderCohortView cohort={cohort.member!} /></>;
};

export default Dashboard;
