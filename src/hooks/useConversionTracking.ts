import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ConversionEvent {
  triggerType: string;
  triggerContext?: Record<string, any>;
  eventType: 'viewed' | 'dismissed' | 'clicked' | 'signup_started' | 'signup_completed' | 'abandoned';
  pagePath?: string;
  pageTitle?: string;
  timeToTrigger?: number;
  timeToAction?: number;
  engagementScore?: number;
  abTestVariant?: string;
  abTestName?: string;
}

export interface FunnelStage {
  stage: 1 | 2 | 3 | 4;
  timestamp: Date;
  data?: Record<string, any>;
}

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('conversion_session_id');
  if (!sessionId) {
    sessionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('conversion_session_id', sessionId);
  }
  return sessionId;
};

export const useConversionTracking = () => {
  const { user } = useAuth();
  const sessionId = useRef(getSessionId());
  const pageLoadTime = useRef(Date.now());
  const triggerTimes = useRef<Map<string, number>>(new Map());
  const funnelStage = useRef<number>(0);

  // Track conversion event
  const trackEvent = useCallback(async (event: ConversionEvent) => {
    try {
      const now = Date.now();
      const timeToTrigger = event.timeToTrigger ?? 
        (triggerTimes.current.has(event.triggerType) 
          ? Math.floor((now - triggerTimes.current.get(event.triggerType)!) / 1000)
          : Math.floor((now - pageLoadTime.current) / 1000));

      await supabase.from('conversion_events').insert({
        user_id: user?.id || null,
        session_id: sessionId.current,
        trigger_type: event.triggerType,
        trigger_context: event.triggerContext || {},
        event_type: event.eventType,
        page_path: event.pagePath || window.location.pathname,
        page_title: event.pageTitle || document.title,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        time_to_trigger: timeToTrigger,
        time_to_action: event.timeToAction,
        engagement_score: event.engagementScore,
        converted: event.eventType === 'signup_completed',
        conversion_time: event.eventType === 'signup_completed' ? new Date().toISOString() : null,
        conversion_source: event.eventType === 'signup_completed' ? event.triggerType : null,
        ab_test_variant: event.abTestVariant,
        ab_test_name: event.abTestName,
      });
    } catch (error) {
      console.error('Conversion tracking error:', error);
      // Fail silently - don't block user experience
    }
  }, [user]);

  // Track trigger view (stage 1)
  const trackTriggerView = useCallback(async (
    triggerType: string,
    context?: Record<string, any>,
    abTestVariant?: string,
    abTestName?: string
  ) => {
    const now = Date.now();
    triggerTimes.current.set(triggerType, now);
    funnelStage.current = 1;

    await trackEvent({
      triggerType,
      triggerContext: context,
      eventType: 'viewed',
      timeToTrigger: Math.floor((now - pageLoadTime.current) / 1000),
      abTestVariant,
      abTestName,
    });

    // Also update funnel
    try {
      await supabase.from('conversion_funnels').upsert({
        session_id: sessionId.current,
        user_id: user?.id || null,
        stage_1_viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id',
      });
    } catch (error) {
      console.error('Funnel tracking error:', error);
    }
  }, [trackEvent, user]);

  // Track user engagement (stage 2)
  const trackEngagement = useCallback(async (
    triggerType: string,
    engagementScore?: number
  ) => {
    funnelStage.current = 2;
    const triggerTime = triggerTimes.current.get(triggerType);
    const timeToAction = triggerTime 
      ? Math.floor((Date.now() - triggerTime) / 1000)
      : undefined;

    await trackEvent({
      triggerType,
      eventType: 'clicked',
      timeToAction,
      engagementScore,
    });

    // Update funnel
    try {
      await supabase.from('conversion_funnels').update({
        stage_2_engaged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('session_id', sessionId.current);
    } catch (error) {
      console.error('Funnel tracking error:', error);
    }
  }, [trackEvent]);

  // Track sign-up started (stage 3)
  const trackSignupStarted = useCallback(async (triggerType: string) => {
    funnelStage.current = 3;
    await trackEvent({
      triggerType,
      eventType: 'signup_started',
    });

    // Update funnel
    try {
      await supabase.from('conversion_funnels').update({
        stage_3_signup_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('session_id', sessionId.current);
    } catch (error) {
      console.error('Funnel tracking error:', error);
    }
  }, [trackEvent]);

  // Track sign-up completed (stage 4)
  const trackSignupCompleted = useCallback(async (triggerType: string) => {
    funnelStage.current = 4;
    const triggerTime = triggerTimes.current.get(triggerType);
    const timeToAction = triggerTime 
      ? Math.floor((Date.now() - triggerTime) / 1000)
      : undefined;

    await trackEvent({
      triggerType,
      eventType: 'signup_completed',
      timeToAction,
    });

    // Update funnel
    try {
      const startTime = pageLoadTime.current;
      const completionTime = Math.floor((Date.now() - startTime) / 1000);

      await supabase.from('conversion_funnels').update({
        stage_4_signup_completed_at: new Date().toISOString(),
        completed: true,
        completion_time: completionTime,
        updated_at: new Date().toISOString(),
      }).eq('session_id', sessionId.current);
    } catch (error) {
      console.error('Funnel tracking error:', error);
    }
  }, [trackEvent]);

  // Track dismissal
  const trackDismissal = useCallback(async (triggerType: string) => {
    await trackEvent({
      triggerType,
      eventType: 'dismissed',
    });

    // Mark as dropped off
    try {
      await supabase.from('conversion_funnels').update({
        dropped_off_at_stage: funnelStage.current,
        drop_off_reason: 'dismissed',
        updated_at: new Date().toISOString(),
      }).eq('session_id', sessionId.current);
    } catch (error) {
      console.error('Funnel tracking error:', error);
    }
  }, [trackEvent]);

  // Track abandonment
  const trackAbandonment = useCallback(async (triggerType: string, reason?: string) => {
    await trackEvent({
      triggerType,
      eventType: 'abandoned',
    });

    // Mark as dropped off
    try {
      await supabase.from('conversion_funnels').update({
        dropped_off_at_stage: funnelStage.current,
        drop_off_reason: reason || 'abandoned',
        updated_at: new Date().toISOString(),
      }).eq('session_id', sessionId.current);
    } catch (error) {
      console.error('Funnel tracking error:', error);
    }
  }, [trackEvent]);

  return {
    trackTriggerView,
    trackEngagement,
    trackSignupStarted,
    trackSignupCompleted,
    trackDismissal,
    trackAbandonment,
    sessionId: sessionId.current,
  };
};

