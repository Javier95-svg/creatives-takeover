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
  const trackingEnabled = true;

  const updateFunnel = useCallback(async (updates: Record<string, unknown>, useUpsert = false) => {
    if (!trackingEnabled || !user?.id) return;

    try {
      const payload = {
        session_id: sessionId.current,
        user_id: user.id,
        updated_at: new Date().toISOString(),
        ...updates,
      };

      if (useUpsert) {
        await supabase.from('conversion_funnels').upsert(payload, {
          onConflict: 'session_id',
        });
        return;
      }

      await supabase
        .from('conversion_funnels')
        .update(payload)
        .eq('session_id', sessionId.current);
    } catch (error) {
      console.error('Funnel tracking error:', error);
    }
  }, [trackingEnabled, user]);

  // Track conversion event
  const trackEvent = useCallback(async (event: ConversionEvent) => {
    if (!trackingEnabled) return;
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
  }, [user, trackingEnabled]);

  // Track trigger view (stage 1)
  const trackTriggerView = useCallback(async (
    triggerType: string,
    context?: Record<string, any>,
    abTestVariant?: string,
    abTestName?: string
  ) => {
    if (!trackingEnabled) return;
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
    await updateFunnel({
      stage_1_viewed_at: new Date().toISOString(),
    }, true);
  }, [trackEvent, trackingEnabled, updateFunnel]);

  // Track user engagement (stage 2)
  const trackEngagement = useCallback(async (
    triggerType: string,
    engagementScore?: number
  ) => {
    if (!trackingEnabled) return;
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
    await updateFunnel({
      stage_2_engaged_at: new Date().toISOString(),
    });
  }, [trackEvent, trackingEnabled, updateFunnel]);

  // Track sign-up started (stage 3)
  const trackSignupStarted = useCallback(async (triggerType: string) => {
    if (!trackingEnabled) return;
    funnelStage.current = 3;
    await trackEvent({
      triggerType,
      eventType: 'signup_started',
    });

    // Update funnel
    await updateFunnel({
      stage_3_signup_started_at: new Date().toISOString(),
    });
  }, [trackEvent, trackingEnabled, updateFunnel]);

  // Track sign-up completed (stage 4)
  const trackSignupCompleted = useCallback(async (triggerType: string) => {
    if (!trackingEnabled) return;
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
    const startTime = pageLoadTime.current;
    const completionTime = Math.floor((Date.now() - startTime) / 1000);

    await updateFunnel({
      stage_4_signup_completed_at: new Date().toISOString(),
      completed: true,
      completion_time: completionTime,
    });
  }, [trackEvent, trackingEnabled, updateFunnel]);

  // Track dismissal
  const trackDismissal = useCallback(async (triggerType: string) => {
    if (!trackingEnabled) return;
    await trackEvent({
      triggerType,
      eventType: 'dismissed',
    });

    // Mark as dropped off
    await updateFunnel({
      dropped_off_at_stage: funnelStage.current,
      drop_off_reason: 'dismissed',
    });
  }, [trackEvent, trackingEnabled, updateFunnel]);

  // Track abandonment
  const trackAbandonment = useCallback(async (triggerType: string, reason?: string) => {
    if (!trackingEnabled) return;
    await trackEvent({
      triggerType,
      eventType: 'abandoned',
    });

    // Mark as dropped off
    await updateFunnel({
      dropped_off_at_stage: funnelStage.current,
      drop_off_reason: reason || 'abandoned',
    });
  }, [trackEvent, trackingEnabled, updateFunnel]);

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

