import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import StartupHomeCommandCenter from '@/components/dashboard/StartupHomeCommandCenter';
import DashboardTodayCockpit from '@/components/dashboard/DashboardTodayCockpit';
import EnablePushCard from '@/components/dashboard/EnablePushCard';
import DashboardTour from '@/components/dashboard/DashboardTour';
import FirstRunCard from '@/components/dashboard/FirstRunCard';
import ContinueArtifactCard from '@/components/dashboard/ContinueArtifactCard';
import { FirstResultActivationCard } from '@/components/dashboard/FirstResultActivationCard';
import JourneyNextStepCard from '@/components/dashboard/JourneyNextStepCard';
import StarterDashboardNudge from '@/components/dashboard/StarterDashboardNudge';
import { useExitIntent } from '@/hooks/useExitIntent';
import { ExitIntentModal } from '@/components/ExitIntentModal';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { trackActivationFunnelEvent } from '@/lib/analytics';
import {
  getActivationPreferenceState,
  getDaysSinceSignup,
  shouldShowFirstResultMode,
  trackActivationReturnMilestones,
} from '@/lib/activationState';
import { normalizePlan } from '@/config/planPermissions';
import type { ActivationIntent } from '@/lib/retentionSystem';

interface DashboardActivationState {
  loading: boolean;
  showFirstResultMode: boolean;
  activationIntent: ActivationIntent | null;
  continueUrl: string | null;
  firstArtifactLabel: string | null;
  firstArtifactType: string | null;
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
    showFirstResultMode: false,
    activationIntent: null,
    continueUrl: null,
    firstArtifactLabel: null,
    firstArtifactType: null,
  });

  useEffect(() => {
    let cancelled = false;

    const loadActivationState = async () => {
      if (!user) {
        setActivationState({
          loading: false,
          showFirstResultMode: false,
          activationIntent: null,
          continueUrl: null,
          firstArtifactLabel: null,
          firstArtifactType: null,
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
          showFirstResultMode: false,
          activationIntent: null,
          continueUrl: null,
          firstArtifactLabel: null,
          firstArtifactType: null,
        });
        return;
      }

      const preferenceState = getActivationPreferenceState(data?.user_preferences);
      const showFirstResultMode = shouldShowFirstResultMode({
        onboardingCompleted: data?.onboarding_completed,
        userPreferences: data?.user_preferences,
      });

      setActivationState({
        loading: false,
        showFirstResultMode,
        activationIntent: preferenceState.activationIntent,
        // Only surface a resume card when a real artifact deep link exists.
        continueUrl: preferenceState.firstArtifactResumeUrl,
        firstArtifactLabel: preferenceState.firstArtifactLabel,
        firstArtifactType: preferenceState.firstArtifactType,
      });

      trackActivationFunnelEvent('dashboard_viewed', {
        user_id: user.id,
        activation_intent: preferenceState.activationIntent,
        source: 'dashboard',
        plan: currentPlan,
        days_since_signup: getDaysSinceSignup(user.created_at),
        first_artifact_type: preferenceState.firstArtifactType,
        first_result_mode: showFirstResultMode,
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
      {!activationState.loading && activationState.showFirstResultMode && activationState.activationIntent ? (
        <>
          <FirstResultActivationCard
            activationIntent={activationState.activationIntent}
            userId={user?.id}
            daysSinceSignup={daysSinceSignup}
            plan={currentPlan}
          />
          <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
        </>
      ) : (
      <>
      {/* Returning users land back in their saved work before anything else. */}
      {activationState.continueUrl ? (
        <ContinueArtifactCard
          continueUrl={activationState.continueUrl}
          artifactLabel={activationState.firstArtifactLabel}
          artifactType={activationState.firstArtifactType}
        />
      ) : null}
      {/* Accountability first: today's tasks, deadlines, streak, progress. */}
      <EnablePushCard />
      <DashboardTodayCockpit />
      <FirstRunCard />
      {/* Profile, network, and growth prompts come after the accountability loop. */}
      <StartupHomeCommandCenter />
      <JourneyNextStepCard />
      <StarterDashboardNudge />
      <ExitIntentModal isOpen={showExitIntent} onClose={closeExitIntent} />
      </>
      )}
    </>
  );
};

export default Dashboard;
