import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { FullTaskManager } from '@/components/dashboard/FullTaskManager';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const TasksPage = () => {
  const { markToolUsed } = useLeanStartupStore();
  useEffect(() => { markToolUsed('tasks'); }, [markToolUsed]);

  return (
    <DashboardLayout
      title="Task Manager"
      subtitle="All your tasks across BizMap, daily goals, community challenges, and commitments"
    >
      <FullTaskManager />
    </DashboardLayout>
  );
};

export default TasksPage;
