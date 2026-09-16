import { lazy, Suspense, useState } from 'react';
import { CreditNavigationMenu } from '@/components/CreditNavigationMenu';
import { enterWorkspaceRoute } from '@/lib/workspaceNavigation';
import { hasApplicationConfig } from '@/lib/hasApplicationConfig';

const LiveCreditDisplay = lazy(() => import('@/components/CreditDisplay').then(module => ({ default: module.CreditDisplay })));

export function PreviewCreditMenu() {
  const [checkoutError, setCheckoutError] = useState('');
  if (hasApplicationConfig) {
    return <Suspense fallback={<span className="text-xs text-muted-foreground">Loading credits…</span>}><LiveCreditDisplay compact showPurchaseButton /></Suspense>;
  }
  return <div className="flex shrink-0 flex-col items-end gap-1">
    <CreditNavigationMenu compact showPurchaseButton totalAvailable={680} planMonthlyCredits={600} topUpCredits={100} creditsSpent={20}
      navigate={enterWorkspaceRoute}
      checkoutMessage={checkoutError}
      createCreditPackCheckout={() => setCheckoutError('Stripe checkout requires local application setup and sign-in. No checkout was created.')}
    />
  </div>;
}
