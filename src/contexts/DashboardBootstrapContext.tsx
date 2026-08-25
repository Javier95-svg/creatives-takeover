import { createContext, useContext, type ReactNode } from 'react';

import type { Day1Profile } from '@/components/dashboard/Day1Welcome';

const DashboardBootstrapContext = createContext<Day1Profile | null>(null);

export function DashboardBootstrapProvider({
  profile,
  children,
}: {
  profile: Day1Profile | null;
  children: ReactNode;
}) {
  return (
    <DashboardBootstrapContext.Provider value={profile}>
      {children}
    </DashboardBootstrapContext.Provider>
  );
}

/** The profile already loaded by DashboardShell; avoids a duplicate profiles read. */
export function useDashboardBootstrapProfile() {
  return useContext(DashboardBootstrapContext);
}
