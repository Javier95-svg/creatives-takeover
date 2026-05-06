import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { FullTaskManager } from '@/components/dashboard/FullTaskManager';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const TasksPage = () => {
  const { markToolUsed } = useLeanStartupStore();
  useEffect(() => { markToolUsed('tasks'); }, [markToolUsed]);

  return (
    <DashboardLayout
      title="Your Tasks"
      subtitle="Specific actions tied to your current Startup Development Cycle stage."
    >
      <FullTaskManager />
    </DashboardLayout>
  );
};

export default TasksPage;
