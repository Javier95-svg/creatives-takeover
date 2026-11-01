import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { captureEvent } from '@/lib/analytics';

/**
 * Lightweight real-user timing for route transitions and the initial paint.
 * It deliberately uses browser APIs instead of a third-party runtime so the
 * measurement itself does not add to the startup path.
 */
export function RoutePerformanceTelemetry() {
  const location = useLocation();
  const initialVitalsAttached = useRef(false);

  useEffect(() => {
    const startedAt = performance.now();
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        captureEvent('route_rendered', {
          route: location.pathname,
          duration_ms: Math.round(performance.now() - startedAt),
          navigation_type: 'spa',
        });
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    if (initialVitalsAttached.current || !('PerformanceObserver' in window)) return;
    initialVitalsAttached.current = true;

    let fcp: number | null = null;
    let lcp: number | null = null;
    // Layout shift and the slowest tap or keypress of the visit (INP is the
    // 98th percentile, which for the few interactions of a typical visit is
    // the slowest one). Timings only: no content, no identifiers.
    let cls = 0;
    let slowestInteraction: number | null = null;
    let reported = false;
    const report = () => {
      if (reported || (fcp === null && lcp === null)) return;
      reported = true;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
      captureEvent('initial_web_vitals', {
        route: window.location.pathname,
        fcp_ms: fcp === null ? null : Math.round(fcp),
        lcp_ms: lcp === null ? null : Math.round(lcp),
        ttfb_ms: navigation ? Math.round(navigation.responseStart) : null,
        cls: Math.round(cls * 1000) / 1000,
        inp_ms: slowestInteraction === null ? null : Math.round(slowestInteraction),
        connection: connection?.effectiveType ?? null,
      });
    };

    const paintObserver = new PerformanceObserver((entries) => {
      const firstContentfulPaint = entries.getEntries().find((entry) => entry.name === 'first-contentful-paint');
      if (firstContentfulPaint) fcp = firstContentfulPaint.startTime;
    });
    const lcpObserver = new PerformanceObserver((entries) => {
      const lcpEntries = entries.getEntries();
      const latest = lcpEntries[lcpEntries.length - 1];
      if (latest) lcp = latest.startTime;
    });
    const shiftObserver = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
        if (!entry.hadRecentInput) cls += entry.value;
      }
    });
    const interactionObserver = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries() as Array<PerformanceEntry & { interactionId?: number }>) {
        if (entry.interactionId) slowestInteraction = Math.max(slowestInteraction ?? 0, entry.duration);
      }
    });

    try {
      paintObserver.observe({ type: 'paint', buffered: true });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Older browsers simply omit these optional measurements.
    }
    // Separate, so a browser without one of them still reports the rest.
    try { shiftObserver.observe({ type: 'layout-shift', buffered: true }); } catch { /* unsupported */ }
    try {
      interactionObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    } catch { /* unsupported */ }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') report();
    };
    window.addEventListener('pagehide', report, { once: true });
    document.addEventListener('visibilitychange', onVisibilityChange, { once: true });

    return () => {
      paintObserver.disconnect();
      lcpObserver.disconnect();
      shiftObserver.disconnect();
      interactionObserver.disconnect();
      window.removeEventListener('pagehide', report);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}

export default RoutePerformanceTelemetry;
