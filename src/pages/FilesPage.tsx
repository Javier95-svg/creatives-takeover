import { Helmet } from 'react-helmet-async';
import { MyFilesSection } from '@/components/dashboard/MyFilesSection';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';

const FilesPage = () => {
  const { data, loading, refreshDashboard } = usePersonalizedDashboard();

  if (loading && !data?.profile) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <Helmet>
        <title>My Files — Creatives Takeover</title>
      </Helmet>
      <MyFilesSection
        files={data?.dashboardFiles || []}
        primaryIcp={data?.primaryIcp ?? null}
        refreshDashboard={refreshDashboard}
      />
    </>
  );
};

export default FilesPage;
