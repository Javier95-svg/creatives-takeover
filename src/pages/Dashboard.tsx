import { PersonalizedDashboard } from '@/components/dashboard/PersonalizedDashboard';
import DashboardPreview from '@/components/DashboardPreview';
import { useAuth } from '@/contexts/AuthContext';
import { Helmet } from 'react-helmet-async';

const Dashboard = () => {
  const { user } = useAuth();

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

  return <PersonalizedDashboard />;
};

export default Dashboard;
