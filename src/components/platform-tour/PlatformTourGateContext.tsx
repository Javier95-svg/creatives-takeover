import { createContext, useContext } from 'react';

/** Why a visitor hit the wall, so the dialog can say something specific. */
export type TourGateReason = 'pulse' | 'credits' | 'account' | 'tool' | 'network';

/**
 * Deliberately the only capability a panel receives.
 *
 * A panel can change panel, follow an allowlisted public link, or call this.
 * There is no fourth verb, which is what makes "a visitor cannot actually use
 * the platform" a property of the code rather than a promise about it.
 */
export const PlatformTourGateContext = createContext<(reason: TourGateReason) => void>(() => {});

export function useTourGate() {
  return useContext(PlatformTourGateContext);
}
