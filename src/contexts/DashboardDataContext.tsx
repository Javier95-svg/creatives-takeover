import { createContext, ReactNode, useContext, useMemo } from 'react';

import { normalizePlan, type Plan } from '@/config/planPermissions';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useDashboardInitialization } from '@/hooks/useDashboardInitialization';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { useSubscription } from '@/hooks/useSubscription';
import { useUnifiedTasks } from '@/hooks/useUnifiedTasks';
import { useWeeklyMission } from '@/hooks/decision-engine/useWeeklyMission';

type DashboardPersonalized = ReturnType<typeof usePersonalizedDashboard>;
type DashboardBizMapProgress = ReturnType<typeof useBizMapProgress>;
type DashboardTasks = ReturnType<typeof useUnifiedTasks>;
type DashboardWeeklyMission = ReturnType<typeof useWeeklyMission>;
type DashboardMetrics = ReturnType<typeof useDashboardMetrics>;
type DashboardSubscription = ReturnType<typeof useSubscription>;

interface DashboardDataContextValue {
  personalized: DashboardPersonalized;
  progress: DashboardBizMapProgress;
  tasks: DashboardTasks;
  weeklyMission: DashboardWeeklyMission;
  metrics: DashboardMetrics;
  subscription: DashboardSubscription;
  currentPlan: Plan;
  isInitializing: boolean;
  initialLoading: boolean;
  incompleteTaskCount: number;
  refreshDashboardData: () => Promise<void>;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const personalized = usePersonalizedDashboard();
  const progress = useBizMapProgress();
  const tasks = useUnifiedTasks();
  const weeklyMission = useWeeklyMission();
  const metrics = useDashboardMetrics();
  const subscription = useSubscription();
  const { isInitializing } = useDashboardInitialization();

  const currentPlan = normalizePlan(subscription.subscriptionData?.subscription_tier);
  const incompleteTaskCount = Math.max(metrics.totalTasksToday - metrics.tasksCompletedToday, 0);
  const initialLoading =
    isInitializing ||
    (personalized.loading && !personalized.data?.profile) ||
    (progress.loading && !progress.progress);

  const value = useMemo<DashboardDataContextValue>(
    () => ({
      personalized,
      progress,
      tasks,
      weeklyMission,
      metrics,
      subscription,
      currentPlan,
      isInitializing,
      initialLoading,
      incompleteTaskCount,
      refreshDashboardData: async () => {
        await Promise.all([
          personalized.refreshDashboard(),
          progress.refreshProgress(),
          weeklyMission.refresh(),
          Promise.resolve(tasks.refetch()),
        ]);
      },
    }),
    [
      currentPlan,
      incompleteTaskCount,
      initialLoading,
      isInitializing,
      metrics,
      personalized,
      progress,
      subscription,
      tasks,
      weeklyMission,
    ],
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error('useDashboardData must be used within DashboardDataProvider');
  }
  return context;
}

export function useOptionalDashboardData() {
  return useContext(DashboardDataContext);
}
