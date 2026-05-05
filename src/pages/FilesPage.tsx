import { Helmet } from 'react-helmet-async';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { MyFilesSection } from '@/components/dashboard/MyFilesSection';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { useAuth } from '@/contexts/AuthContext';

const FilesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { data, loading, refreshDashboard } = usePersonalizedDashboard();

  if (!authLoading && !user) {
    return <Navigate to="/signup" replace />;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <Helmet>
        <title>My Files — Creatives Takeover</title>
      </Helmet>
      <DashboardLayout
        title="My Files"
        subtitle="Your ICP draft, uploads, and platform-generated documents."
      >
        <MyFilesSection
          files={data?.dashboardFiles || []}
          primaryIcp={data?.primaryIcp ?? null}
          refreshDashboard={refreshDashboard}
        />
      </DashboardLayout>
    </>
  );
};

export default FilesPage;
