import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CoreMetrics } from '@/components/dashboard/CoreMetrics';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const CoreMetricsPage = () => {
  const markToolUsed = useLeanStartupStore(s => s.markToolUsed);
  useEffect(() => { markToolUsed('core-metrics'); }, [markToolUsed]);

  return (
    <DashboardLayout
      title="Core Metrics"
      subtitle="Track your key performance indicators."
    >
      <div className="space-y-6">
        <CoreMetrics />
      </div>
    </DashboardLayout>
  );
};

export default CoreMetricsPage;
