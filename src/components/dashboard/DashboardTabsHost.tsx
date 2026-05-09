import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useLocation } from 'react-router-dom';

import Dashboard from '@/pages/Dashboard';
import FilesPage from '@/pages/FilesPage';
import FocusFunnel from '@/pages/FocusFunnel';
import ReferralDashboardPage from '@/pages/ReferralDashboardPage';
import TasksPage from '@/pages/TasksPage';
import YourRoutinePage from '@/pages/YourRoutinePage';

type DashboardTabId = 'home' | 'files' | 'tasks' | 'routine' | 'referral' | 'focusFunnel';

interface DashboardTabDefinition {
  id: DashboardTabId;
  path: string;
  Component: ComponentType;
}

const DASHBOARD_TABS: DashboardTabDefinition[] = [
  { id: 'home', path: '/dashboard', Component: Dashboard },
  { id: 'files', path: '/dashboard/files', Component: FilesPage },
  { id: 'tasks', path: '/dashboard/tasks', Component: TasksPage },
  { id: 'routine', path: '/dashboard/routine', Component: YourRoutinePage },
  { id: 'referral', path: '/dashboard/referral', Component: ReferralDashboardPage },
  { id: 'focusFunnel', path: '/dashboard/focus-funnel', Component: FocusFunnel },
];

function resolveDashboardTab(pathname: string) {
  if (pathname === '/dashboard/weekly-mission') {
    return DASHBOARD_TABS.find((tab) => tab.id === 'routine') ?? DASHBOARD_TABS[0];
  }

  return DASHBOARD_TABS.find((tab) => tab.path === pathname) ?? DASHBOARD_TABS[0];
}

export function DashboardTabsHost() {
  const { pathname } = useLocation();
  const activeTab = useMemo(() => resolveDashboardTab(pathname), [pathname]);
  const [mountedTabIds, setMountedTabIds] = useState<Set<DashboardTabId>>(() => new Set([activeTab.id]));
  const scrollPositions = useRef<Record<DashboardTabId, number>>({} as Record<DashboardTabId, number>);

  useEffect(() => {
    setMountedTabIds((current) => {
      if (current.has(activeTab.id)) return current;
      const next = new Set(current);
      next.add(activeTab.id);
      return next;
    });
  }, [activeTab.id]);

  useLayoutEffect(() => {
    const positions = scrollPositions.current;
    const tabId = activeTab.id;
    const savedScroll = positions[tabId] ?? 0;
    const restoreFrame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: savedScroll, left: 0, behavior: 'auto' });
    });

    return () => {
      window.cancelAnimationFrame(restoreFrame);
      positions[tabId] = window.scrollY;
    };
  }, [activeTab.id]);

  return (
    <>
      {DASHBOARD_TABS.map(({ id, Component }) => {
        if (!mountedTabIds.has(id)) return null;

        const isActive = id === activeTab.id;
        return (
          <section key={id} hidden={!isActive} aria-hidden={!isActive}>
            <Component />
          </section>
        );
      })}
    </>
  );
}
