import type { ReactNode } from 'react';

import CreditStatusBanner from '@/components/CreditStatusBanner';
import { CreditGateProvider } from '@/contexts/CreditGateContext';

/** Loads credit state only for routes that can actually spend credits. */
export function CreditGateRoute({ children }: { children: ReactNode }) {
  return (
    <CreditGateProvider>
      <CreditStatusBanner />
      {children}
    </CreditGateProvider>
  );
}

export default CreditGateRoute;
