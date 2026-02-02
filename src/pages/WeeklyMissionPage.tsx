import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WeeklyMissionPanel } from '@/components/dashboard/decision-engine/WeeklyMissionPanel';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const WeeklyMissionPage = () => {
  const { markToolUsed } = useLeanStartupStore();
  useEffect(() => { markToolUsed('weekly-mission'); }, [markToolUsed]);

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
