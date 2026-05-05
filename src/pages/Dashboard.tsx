import { PersonalizedDashboardV2 } from '@/components/dashboard/PersonalizedDashboardV2';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import DashboardPreview from '@/components/DashboardPreview';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActivationGate } from '@/hooks/useActivationGate';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  shouldRedirectToGuidedOnboarding,
  shouldRedirectToSetupQuiz,
} from '@/lib/guidedOnboarding';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkFeatureAccess } = useFeatureGating();
  const navigate = useNavigate();
  const [profileLoading, setProfileLoading] = useState(true);
  const activationGate = useActivationGate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromIcpBuilder = searchParams.get('from') === 'icp_builder';

  const dismissIcpBanner = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('from');
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    let isCancelled = false;

    if (!user) {
      setProfileLoading(false);
      return () => {
        isCancelled = true;
      };
    }

    const loadDashboardProfile = async () => {
      setProfileLoading(true);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('onboarding_completed, dashboard_bootstrap_source, quiz_completed, user_preferences')
        .eq('id', user.id)
        .single();

      if (isCancelled) {
        return;
      }

      if (error) {
        console.error('Error loading dashboard profile:', error);
        setProfileLoading(false);
        return;
      }

      if (shouldRedirectToGuidedOnboarding(profile)) {
        navigate('/onboarding', { replace: true });
        return;
      }

      if (shouldRedirectToSetupQuiz(profile)) {
        navigate('/setup-quiz', { replace: true });
        return;
      }

      setProfileLoading(false);
    };

    void loadDashboardProfile();

    return () => {
      isCancelled = true;
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !activationGate.shouldEnforceGate) return;

    // Only gate brand-new accounts (created in the last 24 hours).
    // Returning users — regardless of activation status — always
    // reach the dashboard so the habit loop is not broken.
    const accountAgeMs = Date.now() - new Date(user.created_at).getTime();
    const isNewUser = accountAgeMs < 24 * 60 * 60 * 1000;
    if (!isNewUser) return;

    toast.info('Complete your first action to unlock your full dashboard.');
    const timer = setTimeout(() => {
      navigate(activationGate.redirectUrl, { replace: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [activationGate.redirectUrl, activationGate.shouldEnforceGate, navigate, user]);

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Dashboard Preview - Creatives Takeover</title>
          <meta name="description" content="Preview the Creatives Takeover dashboard. Sign up to access BizMap AI progress tracking, business plans, community analytics, and project timeline management." />
        </Helmet>
        <DashboardPreview />
      </>
    );
  }

  if (activationGate.loading || profileLoading) {
    return <DashboardSkeleton />;
  }

  let access;
  try {
    access = checkFeatureAccess('dashboard_access');
  } catch (error) {
    console.error('Error checking dashboard access in render:', error);
    return (
      <>
        <Helmet>
          <title>Dashboard Preview - Creatives Takeover</title>
          <meta name="description" content="Preview the Creatives Takeover dashboard. Sign up to access BizMap AI progress tracking, business plans, community analytics, and project timeline management." />
        </Helmet>
        <DashboardPreview />
      </>
    );
  }
  if (!access.hasAccess) {
    return (
      <>
        <Helmet>
          <title>Dashboard Preview - Creatives Takeover</title>
          <meta name="description" content="Preview the Creatives Takeover dashboard. Sign up to access BizMap AI progress tracking, business plans, community analytics, and project timeline management." />
        </Helmet>
        <DashboardPreview />
      </>
    );
  }

  return (
    <>
      {fromIcpBuilder && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  ICP saved — your dashboard is ready.
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Use your ICP to define your first target customer tasks
                  and track your traction from here.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissIcpBanner}
              className="shrink-0 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <PersonalizedDashboardV2 />
    </>
  );
};

export default Dashboard;
