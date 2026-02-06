import { PersonalizedDashboardClassic } from '@/components/dashboard/PersonalizedDashboardClassic';
import { PersonalizedDashboardV2 } from '@/components/dashboard/PersonalizedDashboardV2';
import DashboardPreview from '@/components/DashboardPreview';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkFeatureAccess } = useFeatureGating();
  const navigate = useNavigate();
  const { openUpgradePrompt } = useUpgradePrompt();
  const [useClassicDashboard, setUseClassicDashboard] = useState(false);

  // Load user's dashboard preference
  useEffect(() => {
    if (!user) return;

    const loadDashboardPreference = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('use_classic_dashboard')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUseClassicDashboard(profile.use_classic_dashboard || false);
      }
    };

    loadDashboardPreference();
  }, [user]);

  // Load user's dashboard preference & check onboarding
  useEffect(() => {
    if (!user) return;

    const checkProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('use_classic_dashboard, onboarding_completed')
        .eq('id', user.id)
        .single();

      if (profile) {
        // STRICT CHECK: Only redirect if onboarding_completed is explicitly false
        // NEVER redirect if onboarding_completed is true (already completed)
        if (profile.onboarding_completed === false) {
          navigate('/onboarding');
          return;
        }
        // If onboarding_completed is true or null, proceed with dashboard
        setUseClassicDashboard(profile.use_classic_dashboard || false);
      }
    };

    checkProfile();
  }, [user, navigate]);

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
