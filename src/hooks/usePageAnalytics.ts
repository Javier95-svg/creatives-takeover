import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAnalyticsSessionId,
  type PageAnalyticsEventType,
  trackPageAnalyticsEvent,
} from '@/lib/pageAnalytics';

interface PageAnalyticsEvent {
  event_type: PageAnalyticsEventType;
  event_data?: Record<string, unknown>;
  page_path?: string;
  page_title?: string;
}

export const usePageAnalytics = (pagePath?: string, pageTitle?: string) => {
  const { user } = useAuth();
  const sessionId = useRef(getAnalyticsSessionId());
  const startTime = useRef(Date.now());
  const scrollDepths = useRef(new Set<number>());
  const exitIntentTracked = useRef(false);
  const pageViewTracked = useRef(false);

  // Track analytics event
  const trackEvent = useCallback(async (event: PageAnalyticsEvent) => {
    await trackPageAnalyticsEvent({
      eventType: event.event_type,
      userId: user?.id || null,
      sessionId: sessionId.current,
      pagePath: event.page_path || pagePath || window.location.pathname,
      pageTitle: event.page_title || pageTitle || document.title,
      eventData: event.event_data || {},
      timeSpent: event.event_type === 'time_on_page' ? Math.floor((Date.now() - startTime.current) / 1000) : 0,
    });
  }, [user, pagePath, pageTitle]);

  // Track page view on mount (only once)
  useEffect(() => {
    if (!pageViewTracked.current) {
      pageViewTracked.current = true;
      void trackEvent({ event_type: 'page_view' });
    }
  }, [trackEvent]);

  // Track scroll depth.
  // This used to read documentElement.scrollHeight on every scroll event, which
  // forces a synchronous layout — on a long page that is layout thrash on every
  // scroll frame, and it showed up in a CPU profile of /newspaper as the single
  // largest application-JS cost during interaction. Now the work is coalesced
  // to one rAF per frame, and the listener detaches once all four milestones
  // have fired, so the common case is no handler at all.
  useEffect(() => {
    const MILESTONES = [25, 50, 75, 100];
    let queued = false;

    const measure = () => {
      queued = false;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const scrollPercent = Math.round((window.scrollY / scrollable) * 100);
      for (const depth of MILESTONES) {
        if (scrollPercent >= depth && !scrollDepths.current.has(depth)) {
          scrollDepths.current.add(depth);
          void trackEvent({
            event_type: 'scroll',
            event_data: { scroll_depth: depth }
          });
        }
      }

      if (scrollDepths.current.size >= MILESTONES.length) detach();
    };

    const handleScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    const detach = () => window.removeEventListener('scroll', handleScroll);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return detach;
  }, [trackEvent]);

  // Track exit intent
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitIntentTracked.current) {
        exitIntentTracked.current = true;
        void trackEvent({ event_type: 'exit_intent' });
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [trackEvent]);

  // Track time on page before leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      void trackEvent({ event_type: 'time_on_page' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [trackEvent]);

  // Track CTA clicks
  const trackClick = useCallback((ctaName: string, ctaLocation: string, additionalData?: Record<string, unknown>) => {
    void trackEvent({
      event_type: 'click',
      event_data: {
        cta_name: ctaName,
        cta_location: ctaLocation,
        ...additionalData
      }
    });
  }, [trackEvent]);

  return { trackClick };
};
