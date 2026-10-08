import { useCallback, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PlatformTourFrameBar } from './PlatformTourFrameBar';
import { PlatformTourShell } from './PlatformTourShell';
import { PlatformTourSignupGate } from './PlatformTourSignupGate';
import { PlatformTourGateContext, type TourGateReason } from './PlatformTourGateContext';
import { DEFAULT_TOUR_PANEL, resolveTourNavigation } from '@/lib/platformTour/tourPanels';
import { trackPlatformTourGateShown } from '@/lib/platformTour/tourAnalytics';
import './platform-tour.css';

/**
 * A real public page (Community, Newspaper, Podcast, Pricing…) opened from the
 * platform tour, kept inside the tour's sample workspace: the same sidebar,
 * top bar and sample account, so visitors keep learning the product's layout
 * instead of dropping into the marketing site. The page itself is the live
 * public page; WorkspaceLayout hides its own navbar and footer.
 */
export default function PlatformTourRouteFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [gate, setGate] = useState<{ reason: TourGateReason; open: boolean }>({ reason: 'account', open: false });

  const openGate = useCallback((reason: TourGateReason) => {
    trackPlatformTourGateShown({ panel: pathname, reason });
    setGate({ reason, open: true });
  }, [pathname]);

  // Same three outcomes as inside the tour: a tour panel, another public page,
  // or the sign-up prompt.
  const onNavigate = useCallback((path: string) => {
    const target = resolveTourNavigation(path);
    if (target.kind === 'panel') { navigate(target.panel === DEFAULT_TOUR_PANEL ? '/demo' : `/demo?panel=${target.panel}`); return; }
    if (target.kind === 'external') { navigate(target.path); return; }
    openGate('account');
  }, [navigate, openGate]);

  const section = '/' + (pathname.split('/')[1] ?? '');

  // Back to the previous page in the tour; straight to the tour when this page
  // was opened directly and there is nothing in this app to go back to.
  const goBack = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1); else navigate('/demo');
  }, [navigate]);

  return <PlatformTourGateContext.Provider value={openGate}>
    <div className="platform-tour">
      <PlatformTourShell currentPath={section} onNavigate={onNavigate} openGate={openGate}>
        {children}
      </PlatformTourShell>
    </div>
    {/* Outside the shell, as on /demo: the route region would trap a fixed child. */}
    <PlatformTourFrameBar onBack={goBack} />
    <PlatformTourSignupGate reason={gate.reason} open={gate.open}
      onOpenChange={(open) => setGate((current) => ({ ...current, open }))} />
  </PlatformTourGateContext.Provider>;
}
