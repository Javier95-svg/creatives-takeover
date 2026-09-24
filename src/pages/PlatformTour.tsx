import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SEO, { createBreadcrumbSchema, createSoftwareApplicationSchema } from '@/components/SEO';
import { PlatformTourShell } from '@/components/platform-tour/PlatformTourShell';
import { PlatformTourFrameBar } from '@/components/platform-tour/PlatformTourFrameBar';
import { PlatformTourSignupGate } from '@/components/platform-tour/PlatformTourSignupGate';
import { PlatformTourGateContext, type TourGateReason } from '@/components/platform-tour/PlatformTourGateContext';
import { PulseHomePanel } from '@/components/platform-tour/panels/PulseHomePanel';
import { DashboardPanel } from '@/components/platform-tour/panels/DashboardPanel';
import { IcpBuilderPanel } from '@/components/platform-tour/panels/IcpBuilderPanel';
import { PmfLabPanel } from '@/components/platform-tour/panels/PmfLabPanel';
import { NetworkPanel } from '@/components/platform-tour/panels/NetworkPanel';
import { InstitutionsPanel } from '@/components/platform-tour/panels/InstitutionsPanel';
import { ToolCatalogPanel } from '@/components/platform-tour/panels/ToolCatalogPanel';
import { DEFAULT_TOUR_PANEL, resolveTourNavigation, resolveTourPanel } from '@/lib/platformTour/tourPanels';
import { referrerKind, trackPlatformTourOpened, trackPlatformTourGateShown, trackPlatformTourPanelViewed } from '@/lib/platformTour/tourAnalytics';
import {
  EMPTY_TOUR_BUDGET, panelBlocked, questionsExhausted, questionsLeft,
  recordPanel, recordQuestion, type TourBudget,
} from '@/lib/platformTour/tourLimits';
import '@/components/platform-tour/platform-tour.css';

/**
 * The guided tour of the workspace for visitors without an account, shared as a
 * link with universities, business schools and funds.
 *
 * Two rules hold this page together.
 *
 * It is served to anonymous visitors and performs no product reads or writes.
 * Everything on screen comes from static fixtures and the product's own config,
 * so there is no account, no project and nothing saved. The single edge from
 * here to the database is captureEvent, which reaches recordRoadmapAnalyticsEvent
 * and is early-returned there for any event name outside its three-name
 * allowlist; tests/platform-tour asserts that rather than trusting it.
 *
 * Panels are addressed with ?panel= rather than a path segment, because
 * /demo/:publicId already serves published founder demos and /demo/dashboard
 * would be read as a demo with the public id "dashboard".
 *
 * Naming: this feature is PlatformTour everywhere in code. Demo Studio is the
 * separate founder tool for building product demos, and the two must never be
 * confusable. The string "demo" appears only in the route path and the SEO
 * config entry.
 */
export default function PlatformTour() {
  const [params, setParams] = useSearchParams();
  const routerNavigate = useNavigate();
  const requested = params.get('panel');
  const panel = resolveTourPanel(requested);
  const [gate, setGate] = useState<{ reason: TourGateReason; open: boolean }>({ reason: 'account', open: false });
  const [budget, setBudget] = useState<TourBudget>(EMPTY_TOUR_BUDGET);

  const openGate = useCallback((reason: TourGateReason) => {
    trackPlatformTourGateShown({ panel: panel.key, reason });
    setGate({ reason, open: true });
  }, [panel.key]);

  // Panels already opened stay free, so comparing two of them costs nothing and
  // only genuinely new ground counts against the limit.
  const selectPanel = useCallback((key: string) => {
    if (panelBlocked(budget, key)) { openGate('depth'); return; }
    setParams(key === DEFAULT_TOUR_PANEL ? {} : { panel: key });
  }, [budget, openGate, setParams]);

  const askQuestion = useCallback(() => {
    setBudget(recordQuestion);
    openGate(questionsLeft(budget) <= 1 ? 'questions' : 'pulse');
  }, [budget, openGate]);

  // An unknown or hostile ?panel= silently becomes the home panel and is
  // rewritten with replace, so it never lands in the visitor's history.
  useEffect(() => {
    if (requested && requested !== panel.key) setParams({}, { replace: true });
  }, [requested, panel.key, setParams]);

  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    trackPlatformTourOpened({ panel: panel.key, referrer_kind: referrerKind(document.referrer, window.location.hostname) });
  }, [panel.key]);
  useEffect(() => {
    trackPlatformTourPanelViewed({ panel: panel.key });
    setBudget((current) => recordPanel(current, panel.key));
  }, [panel.key]);

  /**
   * The only navigation a panel or the sidebar can cause. A destination is
   * either another panel, one of the genuinely public pages, or a prompt to
   * sign up. There is no fourth outcome.
   */
  const onNavigate = useCallback((path: string) => {
    const target = resolveTourNavigation(path);
    if (target.kind === 'panel') { selectPanel(target.panel); return; }
    if (target.kind === 'external') { routerNavigate(target.path); return; }
    openGate('account');
  }, [selectPanel, routerNavigate, openGate]);

  return <>
    <SEO
      title="Platform Tour | Creatives Takeover"
      description="Walk through the founder workspace with a sample project. See the seven stage cycle, the tools and the artifacts each one produces. No signup, nothing saved."
      url="/demo"
      canonical="https://creatives-takeover.com/demo"
      image="/demo-page-metadata.png"
      imageWidth={3051}
      imageHeight={1265}
      structuredData={[
        createSoftwareApplicationSchema({
          name: 'Creatives Takeover',
          description:
            'Business development platform for early stage founders. Seven stages from defining an ideal customer through validation, build, launch, traction and fundraising, each producing a saved artifact.',
          url: '/demo',
          applicationCategory: 'BusinessApplication',
          featureList: [
            'Ideal customer profile generation',
            'Demand capture pages with measured response',
            'Product market fit evidence and decision scoring',
            'MVP scoping and build',
            'Go to market planning',
            'Investor research and pitch review',
          ],
          price: '0',
        }),
        createBreadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Platform Tour', url: '/demo' }]),
      ]}
    />
    <PlatformTourGateContext.Provider value={openGate}>
      <div className="platform-tour">
      <PlatformTourShell panel={panel} onNavigate={onNavigate} openGate={openGate}>
        {panel.kind === 'home' ? <PulseHomePanel onNavigate={onNavigate} onAsk={askQuestion} exhausted={questionsExhausted(budget)} />
          : panel.kind === 'dashboard' ? <DashboardPanel />
          : panel.kind === 'icp' ? <IcpBuilderPanel />
          : panel.kind === 'pmf' ? <PmfLabPanel />
          : panel.kind === 'network' ? <NetworkPanel />
          : panel.kind === 'institutions' ? <InstitutionsPanel />
          : <ToolCatalogPanel tool={panel.tool!} />}
      </PlatformTourShell>
      </div>
      {/* Outside the shell: the route region sets contain: layout paint, which
          would trap a fixed child inside the scrolling panel. */}
      <PlatformTourFrameBar panel={panel} onSelect={selectPanel} />
      <PlatformTourSignupGate reason={gate.reason} open={gate.open}
        onOpenChange={(open) => setGate((current) => ({ ...current, open }))} />
    </PlatformTourGateContext.Provider>
  </>;
}
