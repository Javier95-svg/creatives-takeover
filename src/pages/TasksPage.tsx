import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { TaskCalendarCommandCenter } from '@/components/dashboard/TaskCalendarCommandCenter';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const TasksPage = () => {
  const { markToolUsed } = useLeanStartupStore();
  useEffect(() => { markToolUsed('tasks'); }, [markToolUsed]);

  return (
    <>
      <Helmet>
        <title>Tasks Calendar — Creatives Takeover</title>
      </Helmet>
      <TaskCalendarCommandCenter />
    </>
  );
};

export default TasksPage;
