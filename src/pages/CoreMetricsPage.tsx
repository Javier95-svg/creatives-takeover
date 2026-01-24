import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CoreMetrics } from '@/components/dashboard/CoreMetrics';

const CoreMetricsPage = () => {
  return (
    <DashboardLayout
      title="Core Metrics"
      subtitle="Track your key performance indicators"
    >
      <div className="space-y-6">
        <CoreMetrics />
      </div>
    </DashboardLayout>
  );
};

export default CoreMetricsPage;
