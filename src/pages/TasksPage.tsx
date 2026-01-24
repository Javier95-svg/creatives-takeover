import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { TaskOverview } from '@/components/dashboard/TaskOverview';

const TasksPage = () => {
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
