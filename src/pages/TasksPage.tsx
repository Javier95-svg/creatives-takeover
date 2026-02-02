import { useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TaskOverview } from '@/components/dashboard/TaskOverview';
import { useLeanStartupStore } from '@/store/leanStartupStore';

const TasksPage = () => {
  const { markToolUsed } = useLeanStartupStore();
  useEffect(() => { markToolUsed('tasks'); }, [markToolUsed]);

  return (
    <DashboardLayout
      title="Your Tasks"
      subtitle="Manage and complete your daily tasks"
    >
      <div className="space-y-6">
        <TaskOverview />
      </div>
    </DashboardLayout>
  );
};

export default TasksPage;
