import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { captureEvent } from '@/lib/analytics';

export type PageAnalyticsEventType = 'page_view' | 'scroll' | 'click' | 'exit_intent' | 'time_on_page';

export interface PageAnalyticsPayload {
  eventType: PageAnalyticsEventType;
  userId?: string | null;
  sessionId?: string;
  pagePath?: string;
  pageTitle?: string;
  eventData?: Record<string, unknown>;
  timeSpent?: number;
}

export const getAnalyticsSessionId = () => {
  let sessionId: string | null = null;

  try {
    sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
  } catch (error) {
    console.warn('Analytics session storage unavailable:', error);
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  return sessionId;
};

export const trackPageAnalyticsEvent = async ({
  eventType,
  userId = null,
  sessionId = getAnalyticsSessionId(),
  pagePath,
  pageTitle,
  eventData,
  timeSpent = 0,
}: PageAnalyticsPayload) => {
  const resolvedPath = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '/');
  const resolvedTitle = pageTitle || (typeof document !== 'undefined' ? document.title : null);
  const resolvedReferrer = typeof document !== 'undefined' ? document.referrer || null : null;
  const resolvedUserAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

  try {
    await safe.insert(async () =>
      await supabase.from('page_analytics').insert({
        user_id: userId,
        session_id: sessionId,
        page_path: resolvedPath,
        page_title: resolvedTitle,
        event_type: eventType,
        event_data: eventData || {},
        referrer: resolvedReferrer,
        user_agent: resolvedUserAgent,
        time_spent: timeSpent,
      }),
    );

    try {
      captureEvent(eventType, {
        ...(eventData || {}),
        page_path: resolvedPath,
        page_title: resolvedTitle,
        user_id: userId,
        session_id: sessionId,
      });
    } catch (error) {
      console.warn('PostHog page analytics capture failed', error);
    }
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};
