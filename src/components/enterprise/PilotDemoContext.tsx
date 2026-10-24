import { Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';

import { captureEvent } from '@/lib/analytics';
import { INITIAL_PILOT_DEMO, pilotDemoReducer } from '@/lib/pilotDemo';
import { PILOT_DEMO_ANCHORS, PilotDemoContext, type PilotDemoEvent } from '@/lib/pilotDemoContext';

// The shared state of the /enterprise pilot demo. Kept apart from the demo
// screens (PilotDemo.tsx), which load only when the section nears view.

export function PilotDemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(pilotDemoReducer, INITIAL_PILOT_DEMO);
  const track = useCallback((event: PilotDemoEvent) => captureEvent('enterprise_demo_action', { action: event }), []);
  const scrollTo = useCallback((anchor: keyof typeof PILOT_DEMO_ANCHORS) => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(PILOT_DEMO_ANCHORS[anchor])?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }, []);
  const value = useMemo(() => ({ state, dispatch, track, scrollTo }), [state, track, scrollTo]);
  return <PilotDemoContext.Provider value={value}>{children}</PilotDemoContext.Provider>;
}

/**
 * Shows `fallback` (the product screenshot) until the slot is near the
 * viewport, then the live demo, with the screenshot again while it loads.
 * Pages and crawlers without IntersectionObserver keep the screenshot.
 */
export function NearViewSlot({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || near || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setNear(true);
    }, { rootMargin: '600px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  return <div ref={ref}>{near ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}</div>;
}
