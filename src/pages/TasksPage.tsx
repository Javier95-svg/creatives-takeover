import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { ProgressiveFounderStagePrompt } from '@/components/dashboard/ProgressiveFounderStagePrompt';
import { TaskCalendarCommandCenter } from '@/components/dashboard/TaskCalendarCommandCenter';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const TasksPage = () => {
  const markToolUsed = useLeanStartupStore(s => s.markToolUsed);
  useEffect(() => { markToolUsed('tasks'); }, [markToolUsed]);

  return (
    <>
      <Helmet>
        <title>Tasks Calendar — Creatives Takeover</title>
      </Helmet>
      <div className="space-y-4">
        <ProgressiveFounderStagePrompt />
        <TaskCalendarCommandCenter />
      </div>
    </>
  );
};

export default TasksPage;
