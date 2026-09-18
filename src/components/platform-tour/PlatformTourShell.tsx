import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout';
import { ProfilePhoto } from '@/components/workspace/ProfilePhoto';
import { PlatformTourSearchField } from './PlatformTourSearchField';
import { CreditNavigationMenu } from '@/components/CreditNavigationMenu';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { PLATFORM_TOUR_FIXTURE } from '@/lib/platformTour/tourFixture';
import { tourHighlightPath, type TourPanel } from '@/lib/platformTour/tourPanels';
import type { TourGateReason } from './PlatformTourGateContext';
import { PlatformTourHeaderBadge } from './PlatformTourHeaderBadge';

/**
 * The real workspace shell, filled with fixtures instead of an account.
 *
 * Every slot takes a NAMED presentational export. The default exports of
 * WorkspaceAccountSearch, WorkspaceProfileAvatar and PulseHome are
 * hasApplicationConfig switches that lazy-load a Live sibling the moment the app
 * is configured, which in production is always, and each Live sibling queries
 * Supabase for a signed-in user. Importing a default here would quietly turn an
 * anonymous marketing page into an authenticated one.
 *
 * The header search is owned here rather than reused, because the product's
 * search module also carries a lazy reference to its Live variant.
 */
export function PlatformTourShell({ panel, onNavigate, openGate, children }: {
  panel: TourPanel;
  onNavigate: (path: string) => void;
  openGate: (reason: TourGateReason) => void;
  children: ReactNode;
}) {
  const { account, credits } = PLATFORM_TOUR_FIXTURE;
  return <WorkspaceLayout
    home={panel.kind === 'home'}
    onNavigate={onNavigate}
    currentPath={tourHighlightPath(panel)}
    account={{ username: account.displayName, plan: `${account.plan} · sample` }}
    avatar={<ProfilePhoto initials={account.initials} />}
    profileHref={account.profileHref}
    search={<PlatformTourSearchField />}
    credits={<CreditNavigationMenu
      compact
      showPurchaseButton
      totalAvailable={credits.totalAvailable}
      planMonthlyCredits={credits.planMonthlyCredits}
      topUpCredits={credits.topUpCredits}
      creditsSpent={credits.creditsSpent}
      navigate={onNavigate}
      createCreditPackCheckout={() => openGate('credits')}
    />}
    utilities={<PlatformTourHeaderBadge />}
    theme={<ThemeToggle />}
    signOut={<Button asChild variant="ghost" size="icon-sm" aria-label="Exit tour" title="Exit tour">
      <Link to="/"><LogOut className="h-4 w-4" /></Link>
    </Button>}
  >
    {children}
  </WorkspaceLayout>;
}
