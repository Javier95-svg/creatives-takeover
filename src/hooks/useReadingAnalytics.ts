import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReadingEvent {
  articleId: string;
  articleTitle: string;
  timeSpent?: number;
  action: 'view' | 'click' | 'like' | 'share';
  metadata?: Record<string, any>;
}

export const useReadingAnalytics = () => {
  const { user } = useAuth();

  const trackReadingEvent = async (event: ReadingEvent) => {
    // Track for both authenticated and anonymous users
    try {
      const eventData = {
        user_id: user?.id || null,
        article_id: event.articleId,
        article_title: event.articleTitle,
        action: event.action,
        time_spent: event.timeSpent,
        metadata: event.metadata,
        session_id: getSessionId(),
        created_at: new Date().toISOString()
      };

      // For now, we'll store in localStorage for anonymous users
      // and in database for authenticated users
      if (user) {
        // TODO: When we create analytics table, store in database
        console.log('Tracking authenticated user event:', eventData);
      } else {
        // Store anonymous analytics in localStorage
        const anonymousEvents = JSON.parse(
          localStorage.getItem('insighta-analytics') || '[]'
        );
        anonymousEvents.push(eventData);
        
        // Keep only last 100 events to prevent storage bloat
        if (anonymousEvents.length > 100) {
          anonymousEvents.splice(0, anonymousEvents.length - 100);
        }
        
        localStorage.setItem('insighta-analytics', JSON.stringify(anonymousEvents));
      }
    } catch (error) {
      console.error('Error tracking reading event:', error);
    }
  };

  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('insighta-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('insighta-session-id', sessionId);
    }
    return sessionId;
  };

  // Track page visit
  const trackPageVisit = (pageName: string) => {
    trackReadingEvent({
      articleId: `page_${pageName}`,
      articleTitle: `Page Visit: ${pageName}`,
      action: 'view',
      metadata: {
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        referrer: document.referrer
      }
    });
  };

  return {
    trackReadingEvent,
    trackPageVisit
  };
};
