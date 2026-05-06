import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { WeeklyMissionPanel } from '@/components/dashboard/decision-engine/WeeklyMissionPanel';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const WeeklyMissionPage = () => {
  const { markToolUsed } = useLeanStartupStore();
  useEffect(() => { markToolUsed('weekly-mission'); }, [markToolUsed]);

  return (
    <>
      <Helmet>
        <title>Weekly Mission — Creatives Takeover</title>
      </Helmet>
      <div className="space-y-6">
        <WeeklyMissionPanel />
      </div>
    </>
  );
};

export default WeeklyMissionPage;
