import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import StartupHomeCommandCenter from '@/components/dashboard/StartupHomeCommandCenter';
import DashboardTodayCockpit from '@/components/dashboard/DashboardTodayCockpit';
import FounderJourneyPanel from '@/components/dashboard/FounderJourneyPanel';
import DashboardFocusEditor from '@/components/dashboard/DashboardFocusEditor';
import FounderStageIntelligenceCard from '@/components/dashboard/FounderStageIntelligenceCard';
import EnablePushCard from '@/components/dashboard/EnablePushCard';
import DashboardTour from '@/components/dashboard/DashboardTour';
import FirstRunCard from '@/components/dashboard/FirstRunCard';
import ContinueArtifactCard from '@/components/dashboard/ContinueArtifactCard';
import LiveWaitlistCard from '@/components/dashboard/LiveWaitlistCard';
import { FirstResultActivationCard } from '@/components/dashboard/FirstResultActivationCard';
import JourneyNextStepCard from '@/components/dashboard/JourneyNextStepCard';
import StarterDashboardNudge from '@/components/dashboard/StarterDashboardNudge';
import { useExitIntent } from '@/hooks/useExitIntent';
import { ExitIntentModal } from '@/components/ExitIntentModal';
import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
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
  const fromIcpBuilder = searchParams.get('from') === 'icp_builder';
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const daysSinceSignup = getDaysSinceSignup(user?.created_at ?? null);
  const [activationState, setActivationState] = useState<DashboardActivationState>({
    loading: true,
    showFirstResultBanner: false,
    activationIntent: null,
    continueUrl: null,
    firstArtifactLabel: null,
    firstArtifactType: null,
    onboardingSessionId: null,
    flowVersion: null,
    rolloutVariant: null,
  });

  useEffect(() => {
    let cancelled = false;

    const loadActivationState = async () => {
      if (!user) {
        setActivationState({
          loading: false,
          showFirstResultBanner: false,
          activationIntent: null,
          continueUrl: null,
          firstArtifactLabel: null,
          firstArtifactType: null,
          onboardingSessionId: null,
          flowVersion: null,
          rolloutVariant: null,
        });
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, user_preferences')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setActivationState({
          loading: false,
          showFirstResultBanner: false,
          activationIntent: null,
          continueUrl: null,
          firstArtifactLabel: null,
          firstArtifactType: null,
          onboardingSessionId: null,
          flowVersion: null,
          rolloutVariant: null,
        });
        return;
      }

      const preferenceState = getActivationPreferenceState(data?.user_preferences);
      const preferences = data?.user_preferences && typeof data.user_preferences === 'object' && !Array.isArray(data.user_preferences)
        ? data.user_preferences as Record<string, unknown>
        : {};
      const showFirstResultBanner = shouldShowFirstResultMode({
        onboardingCompleted: data?.onboarding_completed,
        userPreferences: data?.user_preferences,
      });

      setActivationState({
        loading: false,
        showFirstResultBanner,
        activationIntent: preferenceState.activationIntent,
        // Only surface a resume card when a real artifact deep link exists.
        continueUrl: preferenceState.firstArtifactResumeUrl,
        firstArtifactLabel: preferenceState.firstArtifactLabel,
        firstArtifactType: preferenceState.firstArtifactType,
        onboardingSessionId: typeof preferences.onboardingSessionId === 'string' ? preferences.onboardingSessionId : null,
        flowVersion: typeof preferences.onboardingFlowVersion === 'string' ? preferences.onboardingFlowVersion : null,
        rolloutVariant: typeof preferences.onboardingRolloutVariant === 'string' ? preferences.onboardingRolloutVariant : null,
      });

      void trackRetentionEvent('dashboard_viewed', {
        user_id: user.id,
        activation_intent: preferenceState.activationIntent,
        source: 'dashboard',
        plan: currentPlan,
        days_since_signup: getDaysSinceSignup(user.created_at),
        first_artifact_type: preferenceState.firstArtifactType,
        first_result_mode: showFirstResultBanner,
        onboarding_session_id: preferences.onboardingSessionId ?? null,
        flow_version: preferences.onboardingFlowVersion ?? null,
        rollout_variant: preferences.onboardingRolloutVariant ?? null,
      });
      trackActivationReturnMilestones({
        userId: user.id,
        userCreatedAt: user.created_at,
        activationIntent: preferenceState.activationIntent,
        source: 'dashboard',
        plan: currentPlan,
      });
    };

    void loadActivationState();

    return () => {
      cancelled = true;
    };
  }, [currentPlan, user]);

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
      {!activationState.loading && activationState.showFirstResultBanner && activationState.activationIntent ? (
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
      <DashboardTodayCockpit />
      <DashboardFocusEditor />
      <FounderStageIntelligenceCard />
      <FounderJourneyPanel />
      <DashboardDisclosure
        title="More founder signals"
        summary="Startup profile editor, growth, and setup prompts are here when you want extra context."
        className="mb-6"
        onOpenChange={(open) => {
          if (open) trackDashboardFounderSignalsExpanded();
        }}
      >
        <div className="space-y-5">
          <LiveWaitlistCard />
          <EnablePushCard />
          <FirstRunCard />
          <JourneyNextStepCard />
          <StartupHomeCommandCenter />
          <StarterDashboardNudge />
        </div>
      </DashboardDisclosure>
      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
    </>
  );
};

export default Dashboard;
