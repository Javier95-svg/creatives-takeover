import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { useAuth } from '@/contexts/AuthContext';

// Generate a session ID for anonymous tracking
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

interface PageAnalyticsEvent {
  event_type: 'page_view' | 'scroll' | 'click' | 'exit_intent' | 'time_on_page';
  event_data?: Record<string, any>;
  page_path?: string;
  page_title?: string;
}

export const usePageAnalytics = (pagePath?: string, pageTitle?: string) => {
  const { user } = useAuth();
  const sessionId = useRef(getSessionId());
  const startTime = useRef(Date.now());
  const scrollDepths = useRef(new Set<number>());
  const exitIntentTracked = useRef(false);
  const pageViewTracked = useRef(false);

  // Track analytics event
  const trackEvent = useCallback(async (event: PageAnalyticsEvent) => {
    try {
      await safe.insert(() => supabase.from('page_analytics').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        page_path: event.page_path || pagePath || window.location.pathname,
        page_title: event.page_title || pageTitle || document.title,
        event_type: event.event_type,
        event_data: event.event_data || {},
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        time_spent: event.event_type === 'time_on_page' ? Math.floor((Date.now() - startTime.current) / 1000) : 0,
      }));
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, [user, pagePath, pageTitle]);

  // Track page view on mount (only once)
  useEffect(() => {
    if (!pageViewTracked.current) {
      pageViewTracked.current = true;
      trackEvent({ event_type: 'page_view' });
    }
  }, []);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      // Track 25%, 50%, 75%, 100% milestones
      [25, 50, 75, 100].forEach(depth => {
        if (scrollPercent >= depth && !scrollDepths.current.has(depth)) {
          scrollDepths.current.add(depth);
          trackEvent({
            event_type: 'scroll',
            event_data: { scroll_depth: depth }
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackEvent]);

  // Track exit intent
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !exitIntentTracked.current) {
        exitIntentTracked.current = true;
        trackEvent({ event_type: 'exit_intent' });
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [trackEvent]);

  // Track time on page before leaving
  useEffect(() => {
    const handleBeforeUnload = () => {
      trackEvent({ event_type: 'time_on_page' });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [trackEvent]);

  // Track CTA clicks
  const trackClick = useCallback((ctaName: string, ctaLocation: string, additionalData?: Record<string, any>) => {
    trackEvent({
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
