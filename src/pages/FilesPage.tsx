import { Helmet } from 'react-helmet-async';
import { MyFilesSection } from '@/components/dashboard/MyFilesSection';
import { useDashboardData } from '@/contexts/DashboardDataContext';

const FilesPage = () => {
  const { personalized } = useDashboardData();
  const { data, refreshDashboard } = personalized;

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
