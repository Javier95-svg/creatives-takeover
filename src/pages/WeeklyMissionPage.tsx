import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WeeklyMissionPanel } from '@/components/dashboard/decision-engine/WeeklyMissionPanel';

const WeeklyMissionPage = () => {
  return (
    <DashboardLayout
      title="Weekly Mission"
      subtitle="Set and track your weekly goals"
    >
      <div className="space-y-6">
        <WeeklyMissionPanel />
      </div>
    </DashboardLayout>
  );
};

export default WeeklyMissionPage;
