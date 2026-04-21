/**
 * UpgradeTriggerContext — provides the single-surface upgrade trigger system to the dashboard tree.
 *
 * Usage:
 *   // Wrap dashboard root with <UpgradeTriggerProvider>
 *   // In any child: const { fire } = useUpgradeTriggerContext();
 *   //               fire('rookie_icp_complete');
 */

import { createContext, useContext } from 'react';
import { useUpgradeTrigger, type UseUpgradeTriggerReturn, type UpgradeTriggerKey } from '@/hooks/useUpgradeTrigger';

const UpgradeTriggerContext = createContext<UseUpgradeTriggerReturn | null>(null);

export function UpgradeTriggerProvider({ children }: { children: React.ReactNode }) {
  const trigger = useUpgradeTrigger();

  return (
    <UpgradeTriggerContext.Provider value={trigger}>
      {children}
    </UpgradeTriggerContext.Provider>
  );
}

export function useUpgradeTriggerContext(): UseUpgradeTriggerReturn {
  const ctx = useContext(UpgradeTriggerContext);
  if (!ctx) throw new Error('useUpgradeTriggerContext must be used within UpgradeTriggerProvider');
  return ctx;
}

export type { UpgradeTriggerKey };
