import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { captureEvent, isInternalUser } from '@/lib/analytics';
import { hasAnalyticsConsent } from '@/lib/consent';

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

const newSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

// Without consent nothing is stored on the device, so the session id lives in
// memory and lasts for this page load.
let memorySessionId: string | null = null;

export const getAnalyticsSessionId = () => {
  if (!hasAnalyticsConsent()) {
    memorySessionId ??= newSessionId();
    return memorySessionId;
  }

  let sessionId: string | null = null;

  try {
    sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      // Consent given mid-visit: keep the id this visit already used.
      sessionId = memorySessionId ?? newSessionId();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
  } catch (error) {
    console.warn('Analytics session storage unavailable:', error);
    sessionId = memorySessionId ??= newSessionId();
  }

  return sessionId;
};

// Both navbars and the page itself report the page as they mount, which sent
// two or three page_view events per page load. One per path per load counts.
const PAGE_VIEW_DEDUPE_MS = 5_000;
let lastPageView: { path: string; at: number } | null = null;

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

  // The team's own visits stay out of the admin dashboard as well as PostHog.
  if (isInternalUser()) return;
  if (eventType === 'page_view') {
    const now = Date.now();
    if (lastPageView && lastPageView.path === resolvedPath && now - lastPageView.at < PAGE_VIEW_DEDUPE_MS) return;
    lastPageView = { path: resolvedPath, at: now };
  }

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
