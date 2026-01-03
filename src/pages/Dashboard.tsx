import { PersonalizedDashboardClassic } from '@/components/dashboard/PersonalizedDashboardClassic';
import { PersonalizedDashboardV2 } from '@/components/dashboard/PersonalizedDashboardV2';
import DashboardPreview from '@/components/DashboardPreview';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkFeatureAccess } = useFeatureGating();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (user) {
      try {
        const access = checkFeatureAccess('dashboard_access');
        if (!access.hasAccess) {
          toast.error(access.message || 'Upgrade to Creator tier or higher to access the Dashboard.');
          if (access.requiredTier) {
            navigate('/pricing');
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error checking dashboard access:', error);
        }
      }
    }
  }, [user, checkFeatureAccess, navigate]);

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
    if (import.meta.env.DEV) {
      console.error('Error checking dashboard access in render:', error);
    }
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
