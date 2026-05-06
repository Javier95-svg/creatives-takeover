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
      subtitle="A stage-based weekly challenge that resets every Monday."
    >
      <div className="space-y-6">
        <WeeklyMissionPanel />
      </div>
    </DashboardLayout>
  );
};

export default WeeklyMissionPage;
