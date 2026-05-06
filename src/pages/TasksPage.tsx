import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FullTaskManager } from '@/components/dashboard/FullTaskManager';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const TasksPage = () => {
  const { markToolUsed } = useLeanStartupStore();
  useEffect(() => { markToolUsed('tasks'); }, [markToolUsed]);

  return (
    <>
      <Helmet>
        <title>Your Tasks — Creatives Takeover</title>
      </Helmet>
      <FullTaskManager />
    </>
  );
};

export default TasksPage;
