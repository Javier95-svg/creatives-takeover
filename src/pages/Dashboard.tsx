import { PersonalizedDashboardClassic } from '@/components/dashboard/PersonalizedDashboardClassic';
import { PersonalizedDashboardV2 } from '@/components/dashboard/PersonalizedDashboardV2';
import DashboardPreview from '@/components/DashboardPreview';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useActivationGate } from '@/hooks/useActivationGate';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkFeatureAccess } = useFeatureGating();
  const navigate = useNavigate();
  const [useClassicDashboard, setUseClassicDashboard] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const activationGate = useActivationGate();

  useEffect(() => {
    let isCancelled = false;

    if (!user) {
      setUseClassicDashboard(false);
      setProfileLoading(false);
      return () => {
        isCancelled = true;
      };
    }

    const loadDashboardProfile = async () => {
      setProfileLoading(true);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('use_classic_dashboard, onboarding_completed, dashboard_bootstrap_source, quiz_completed')
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

      if (profile?.onboarding_completed === false && profile?.dashboard_bootstrap_source !== 'icp_unlock') {
        navigate('/onboarding');
        return;
      }

      if (profile?.onboarding_completed === true && profile?.quiz_completed !== true) {
        navigate('/setup-quiz');
        return;
      }

      setUseClassicDashboard(Boolean(profile?.use_classic_dashboard));
      setProfileLoading(false);
    };

    void loadDashboardProfile();

    return () => {
      isCancelled = true;
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !activationGate.shouldEnforceGate) return;

    // FIX(retention): dashboard — forced-gate users are redirected back to their selected activation path until they create a first artifact worth returning to.
    navigate(activationGate.redirectUrl, { replace: true });
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
    return null;
  }

  // Check access before rendering
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

  // Render the appropriate dashboard version based on user preference
  return useClassicDashboard ? <PersonalizedDashboardClassic /> : <PersonalizedDashboardV2 />;
};

export default Dashboard;
