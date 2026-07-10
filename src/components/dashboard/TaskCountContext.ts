import { createContext } from 'react';

export const TaskCountContext = createContext(0);

export interface DashboardWeeklyMetrics {
  weeklyMissionGoal: string | null;
  weeklyMissionProgress: number | null;
  tasksCompletedThisWeek: number;
  totalTasksThisWeek: number;
}

export const DashboardMetricsContext = createContext<DashboardWeeklyMetrics>({
  weeklyMissionGoal: null,
  weeklyMissionProgress: null,
  tasksCompletedThisWeek: 0,
  totalTasksThisWeek: 0,
});
