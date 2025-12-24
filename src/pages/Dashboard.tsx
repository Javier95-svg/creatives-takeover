import { PersonalizedDashboard } from '@/components/dashboard/PersonalizedDashboard';
import DashboardPreview from '@/components/DashboardPreview';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user } = useAuth();
  const { checkFeatureAccess } = useFeatureGating();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const access = checkFeatureAccess('dashboard_access');
      if (!access.hasAccess) {
        toast.error(access.message || 'Upgrade to Creator tier or higher to access the Dashboard.');
        if (access.requiredTier) {
          navigate('/pricing');
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
  const access = checkFeatureAccess('dashboard_access');
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

  return <PersonalizedDashboard />;
};

export default Dashboard;
