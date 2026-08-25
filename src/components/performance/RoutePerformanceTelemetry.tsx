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
    let reported = false;
    const report = () => {
      if (reported || (fcp === null && lcp === null)) return;
      reported = true;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      captureEvent('initial_web_vitals', {
        route: window.location.pathname,
        fcp_ms: fcp === null ? null : Math.round(fcp),
        lcp_ms: lcp === null ? null : Math.round(lcp),
        ttfb_ms: navigation ? Math.round(navigation.responseStart) : null,
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

    try {
      paintObserver.observe({ type: 'paint', buffered: true });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
      // Older browsers simply omit these optional measurements.
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') report();
    };
    window.addEventListener('pagehide', report, { once: true });
    document.addEventListener('visibilitychange', onVisibilityChange, { once: true });

    return () => {
      paintObserver.disconnect();
      lcpObserver.disconnect();
      window.removeEventListener('pagehide', report);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}

export default RoutePerformanceTelemetry;
