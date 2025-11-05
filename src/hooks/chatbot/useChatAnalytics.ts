import { useCallback, useRef, useEffect } from 'react';
import { logInfo, trackEvent } from '@/lib/logger';
import { ChatMessage } from '@/types/api';

interface AnalyticsMetrics {
  sessionStartTime: number;
  messagesSent: number;
  messagesReceived: number;
  avgResponseTime: number;
  userSatisfaction?: number;
  completedFlows: string[];
  abandonedAt?: string;
}

/**
 * Tracks chat analytics and user interactions
 */
export function useChatAnalytics(sessionId: string) {
  const metricsRef = useRef<AnalyticsMetrics>({
    sessionStartTime: Date.now(),
    messagesSent: 0,
    messagesReceived: 0,
    avgResponseTime: 0,
    completedFlows: []
  });

  const lastMessageTime = useRef<number>(Date.now());

  const trackMessageSent = useCallback((message: string) => {
    metricsRef.current.messagesSent++;
    lastMessageTime.current = Date.now();
    
    trackEvent('chat_message_sent', {
      sessionId,
      messageLength: message.length,
      totalMessagesSent: metricsRef.current.messagesSent
    });
  }, [sessionId]);

  const trackMessageReceived = useCallback((message: ChatMessage) => {
    metricsRef.current.messagesReceived++;
    
    const responseTime = Date.now() - lastMessageTime.current;
    const totalResponses = metricsRef.current.messagesReceived;
    metricsRef.current.avgResponseTime = 
      (metricsRef.current.avgResponseTime * (totalResponses - 1) + responseTime) / totalResponses;
    
    trackEvent('chat_message_received', {
      sessionId,
      responseTime,
      avgResponseTime: metricsRef.current.avgResponseTime,
      messageType: message.messageType,
      hasQuickActions: !!message.quickActions?.length
    });
  }, [sessionId]);

  const trackFlowCompleted = useCallback((flowName: string) => {
    if (!metricsRef.current.completedFlows.includes(flowName)) {
      metricsRef.current.completedFlows.push(flowName);
      
      trackEvent('chat_flow_completed', {
        sessionId,
        flowName,
        totalFlowsCompleted: metricsRef.current.completedFlows.length,
        sessionDuration: Date.now() - metricsRef.current.sessionStartTime
      });
    }
  }, [sessionId]);

  const trackSatisfaction = useCallback((rating: number) => {
    metricsRef.current.userSatisfaction = rating;
    
    trackEvent('chat_satisfaction_rated', {
      sessionId,
      rating,
      sessionDuration: Date.now() - metricsRef.current.sessionStartTime,
      messagesSent: metricsRef.current.messagesSent
    });
  }, [sessionId]);

  const trackAbandonment = useCallback((context: string) => {
    metricsRef.current.abandonedAt = context;
    
    trackEvent('chat_abandoned', {
      sessionId,
      abandonedAt: context,
      sessionDuration: Date.now() - metricsRef.current.sessionStartTime,
      messagesSent: metricsRef.current.messagesSent,
      messagesReceived: metricsRef.current.messagesReceived
    });
  }, [sessionId]);

  const trackQuickAction = useCallback((actionId: string, actionText: string) => {
    trackEvent('chat_quick_action_clicked', {
      sessionId,
      actionId,
      actionText
    });
  }, [sessionId]);

  const trackError = useCallback((error: string, context?: any) => {
    trackEvent('chat_error_occurred', {
      sessionId,
      error,
      context
    });
  }, [sessionId]);

  // Track session end on unmount
  useEffect(() => {
    return () => {
      const sessionDuration = Date.now() - metricsRef.current.sessionStartTime;
      
      logInfo('Chat session ended', {
        sessionId,
        duration: sessionDuration,
        metrics: metricsRef.current
      });
      
      trackEvent('chat_session_ended', {
        sessionId,
        duration: sessionDuration,
        ...metricsRef.current
      });
    };
  }, [sessionId]);

  const getMetrics = useCallback(() => {
    return {
      ...metricsRef.current,
      currentSessionDuration: Date.now() - metricsRef.current.sessionStartTime
    };
  }, []);

  return {
    trackMessageSent,
    trackMessageReceived,
    trackFlowCompleted,
    trackSatisfaction,
    trackAbandonment,
    trackQuickAction,
    trackError,
    getMetrics
  };
}
