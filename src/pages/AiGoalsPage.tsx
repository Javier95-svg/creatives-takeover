import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AiGoalsPlanner } from '@/components/focus-funnel/AiGoalsPlanner';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const AiGoalsPage = () => {
  const markToolUsed = useLeanStartupStore(s => s.markToolUsed);
  useEffect(() => { markToolUsed('ai-goals'); }, [markToolUsed]);

  return (
    <>
      <Helmet>
        <title>AI Goals Planner — Creatives Takeover</title>
      </Helmet>
      <DashboardLayout
        title="AI Goals Planner"
        subtitle="Break down goals into projects and next actions."
      >
        <AiGoalsPlanner />
      </DashboardLayout>
    </>
  );
};

export default AiGoalsPage;
