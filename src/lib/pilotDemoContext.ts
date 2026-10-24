import { createContext, useContext } from 'react';

import type { PilotDemoAction, PilotDemoState } from './pilotDemo';

// The /enterprise pilot demo's shared state, read by the demo screens. The
// provider lives in src/components/enterprise/PilotDemoContext.tsx.

export type PilotDemoEvent = 'joined' | 'task_toggled' | 'checkin_sent' | 'row_opened' | 'csv_exported' | 'reset';

/** Element ids of the three demo windows, for scrolling between them. */
export const PILOT_DEMO_ANCHORS = { join: 'pilot-demo-join', founder: 'pilot-demo-founder', program: 'pilot-demo-program' } as const;

export interface PilotDemoContextValue {
  state: PilotDemoState;
  dispatch: (action: PilotDemoAction) => void;
  track: (event: PilotDemoEvent) => void;
  /** Scrolls a demo window into view; instant when the visitor prefers less motion. */
  scrollTo: (anchor: keyof typeof PILOT_DEMO_ANCHORS) => void;
}

export const PilotDemoContext = createContext<PilotDemoContextValue | null>(null);

export function usePilotDemo(): PilotDemoContextValue {
  const value = useContext(PilotDemoContext);
  if (!value) throw new Error('usePilotDemo must be used inside PilotDemoProvider');
  return value;
}
