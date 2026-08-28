import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { ProgressiveFounderStagePrompt } from '@/components/dashboard/ProgressiveFounderStagePrompt';
import { TaskTodayWorkspace } from '@/components/dashboard/TaskTodayWorkspace';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const TasksPage = () => {
  const markToolUsed = useLeanStartupStore(s => s.markToolUsed);
  useEffect(() => { markToolUsed('tasks'); }, [markToolUsed]);

  return (
    <>
      <Helmet>
        <title>Today's Tasks — Creatives Takeover</title>
      </Helmet>
      <div className="space-y-5">
        <ProgressiveFounderStagePrompt />
        <TaskTodayWorkspace />
      </div>
    </>
  );
};

export default TasksPage;
