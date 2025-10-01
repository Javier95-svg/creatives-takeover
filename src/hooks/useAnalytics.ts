import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InteractionMetric {
  id: string;
  sessionId: string;
  userId?: string;
  eventType: 'message_sent' | 'message_received' | 'quick_action_clicked' | 'satisfaction_rated' | 'conversation_ended' | 'error_occurred';
  data: Record<string, any>;
  timestamp: string;
  pageUrl: string;
  userAgent: string;
}

export interface UserSatisfactionSignal {
  sessionId: string;
  userId?: string;
  rating: number; // 1-5
  feedback?: string;
  timestamp: string;
  context: {
    messageCount: number;
    sessionDuration: number;
    lastMessageType: string;
  };
}

export interface ConversationMetrics {
  sessionId: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  messageCount: number;
  botResponseCount: number;
  userSatisfaction?: number;
  completionRate: number;
  averageResponseTime: number;
  errorCount: number;
  topics: string[];
  intents: string[];
  dropped: boolean;
  dropReason?: string;
}

export interface AnalyticsConfig {
  enableTracking: boolean;
  enableRealTimeAnalytics: boolean;
  enableUserSatisfaction: boolean;
  enableConversationMetrics: boolean;
  enableErrorTracking: boolean;
  batchSize: number;
  flushInterval: number; // in milliseconds
  analyticsProviders: ('supabase' | 'google_analytics' | 'mixpanel' | 'amplitude')[];
  googleAnalyticsId?: string;
  mixpanelToken?: string;
  amplitudeApiKey?: string;
}

export class AnalyticsManager {
  private config: AnalyticsConfig;
  private metricsBuffer: InteractionMetric[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.startFlushTimer();
  }

  trackInteraction(metric: Omit<InteractionMetric, 'id' | 'timestamp'>): void {
    if (!this.config.enableTracking) return;

    const fullMetric: InteractionMetric = {
      ...metric,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    this.metricsBuffer.push(fullMetric);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.config.batchSize) {
      this.flushMetrics();
    }
  }

  trackUserSatisfaction(signal: UserSatisfactionSignal): void {
    if (!this.config.enableUserSatisfaction) return;

    this.trackInteraction({
      sessionId: signal.sessionId,
      userId: signal.userId,
      eventType: 'satisfaction_rated',
      data: {
        rating: signal.rating,
        feedback: signal.feedback,
        context: signal.context
      },
      pageUrl: window.location.href,
      userAgent: navigator.userAgent
    });
  }

  trackConversationMetrics(metrics: ConversationMetrics): void {
    if (!this.config.enableConversationMetrics) return;

    this.trackInteraction({
      sessionId: metrics.sessionId,
      userId: metrics.userId,
      eventType: 'conversation_ended',
      data: {
        startTime: metrics.startTime,
        endTime: metrics.endTime,
        messageCount: metrics.messageCount,
        botResponseCount: metrics.botResponseCount,
        userSatisfaction: metrics.userSatisfaction,
        completionRate: metrics.completionRate,
        averageResponseTime: metrics.averageResponseTime,
        errorCount: metrics.errorCount,
        topics: metrics.topics,
        intents: metrics.intents,
        dropped: metrics.dropped,
        dropReason: metrics.dropReason
      },
      pageUrl: window.location.href,
      userAgent: navigator.userAgent
    });
  }

  trackError(error: Error, context: Record<string, any>): void {
    if (!this.config.enableErrorTracking) return;

    this.trackInteraction({
      sessionId: context.sessionId || 'unknown',
      userId: context.userId,
      eventType: 'error_occurred',
      data: {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context
      },
      pageUrl: window.location.href,
      userAgent: navigator.userAgent
    });
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Send to Supabase
      if (this.config.analyticsProviders.includes('supabase')) {
        await this.sendToSupabase(metricsToFlush);
      }

      // Send to Google Analytics
      if (this.config.analyticsProviders.includes('google_analytics') && this.config.googleAnalyticsId) {
        await this.sendToGoogleAnalytics(metricsToFlush);
      }

      // Send to Mixpanel
      if (this.config.analyticsProviders.includes('mixpanel') && this.config.mixpanelToken) {
        await this.sendToMixpanel(metricsToFlush);
      }

      // Send to Amplitude
      if (this.config.analyticsProviders.includes('amplitude') && this.config.amplitudeApiKey) {
        await this.sendToAmplitude(metricsToFlush);
      }
    } catch (error) {
      console.error('Error flushing analytics metrics:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  private async sendToSupabase(metrics: InteractionMetric[]): Promise<void> {
    const { error } = await supabase
      .from('interaction_metrics')
      .insert(metrics);

    if (error) throw error;
  }

  private async sendToGoogleAnalytics(metrics: InteractionMetric[]): Promise<void> {
    // Google Analytics 4 implementation
    if (typeof gtag !== 'undefined') {
      metrics.forEach(metric => {
        gtag('event', metric.eventType, {
          event_category: 'chatbot',
          event_label: metric.data.messageType || 'unknown',
          value: metric.data.rating || 1,
          custom_parameters: metric.data
        });
      });
    }
  }

  private async sendToMixpanel(metrics: InteractionMetric[]): Promise<void> {
    if (typeof mixpanel !== 'undefined') {
      metrics.forEach(metric => {
        mixpanel.track(metric.eventType, {
          ...metric.data,
          sessionId: metric.sessionId,
          userId: metric.userId,
          timestamp: metric.timestamp
        });
      });
    }
  }

  private async sendToAmplitude(metrics: InteractionMetric[]): Promise<void> {
    if (typeof amplitude !== 'undefined') {
      metrics.forEach(metric => {
        amplitude.getInstance().logEvent(metric.eventType, {
          ...metric.data,
          sessionId: metric.sessionId,
          userId: metric.userId,
          timestamp: metric.timestamp
        });
      });
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.flushInterval);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush remaining metrics
    this.flushMetrics();
  }
}

// React Hook for Analytics
export const useAnalytics = (config: AnalyticsConfig) => {
  const managerRef = useRef<AnalyticsManager | null>(null);

  useEffect(() => {
    managerRef.current = new AnalyticsManager(config);
    
    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
      }
    };
  }, [config]);

  const trackInteraction = useCallback((metric: Omit<InteractionMetric, 'id' | 'timestamp'>) => {
    if (managerRef.current) {
      managerRef.current.trackInteraction(metric);
    }
  }, []);

  const trackUserSatisfaction = useCallback((signal: UserSatisfactionSignal) => {
    if (managerRef.current) {
      managerRef.current.trackUserSatisfaction(signal);
    }
  }, []);

  const trackConversationMetrics = useCallback((metrics: ConversationMetrics) => {
    if (managerRef.current) {
      managerRef.current.trackConversationMetrics(metrics);
    }
  }, []);

  const trackError = useCallback((error: Error, context: Record<string, any>) => {
    if (managerRef.current) {
      managerRef.current.trackError(error, context);
    }
  }, []);

  return {
    trackInteraction,
    trackUserSatisfaction,
    trackConversationMetrics,
    trackError
  };
};

// Automated Reporting Hook
export const useAutomatedReporting = (config: AnalyticsConfig) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const generateUsageReport = useCallback(async (timeRange: { start: string; end: string }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interaction_metrics')
        .select('*')
        .gte('timestamp', timeRange.start)
        .lte('timestamp', timeRange.end);

      if (error) throw error;

      // Generate usage trends
      const trends = {
        totalInteractions: data.length,
        uniqueUsers: new Set(data.map(d => d.userId).filter(Boolean)).size,
        averageSessionDuration: calculateAverageSessionDuration(data),
        topIntents: getTopIntents(data),
        satisfactionTrend: calculateSatisfactionTrend(data),
        errorRate: calculateErrorRate(data),
        peakUsageHours: calculatePeakUsageHours(data)
      };

      setReports(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'usage_trends',
        timeRange,
        data: trends,
        generatedAt: new Date().toISOString()
      }]);

      return trends;
    } catch (error) {
      console.error('Error generating usage report:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reports,
    loading,
    generateUsageReport
  };
};

// Helper functions
function calculateAverageSessionDuration(data: InteractionMetric[]): number {
  const sessions = new Map<string, { start: Date; end: Date }>();
  
  data.forEach(metric => {
    if (!sessions.has(metric.sessionId)) {
      sessions.set(metric.sessionId, { start: new Date(metric.timestamp), end: new Date(metric.timestamp) });
    } else {
      const session = sessions.get(metric.sessionId)!;
      const timestamp = new Date(metric.timestamp);
      if (timestamp < session.start) session.start = timestamp;
      if (timestamp > session.end) session.end = timestamp;
    }
  });

  const durations = Array.from(sessions.values()).map(s => s.end.getTime() - s.start.getTime());
  return durations.reduce((sum, d) => sum + d, 0) / durations.length;
}

function getTopIntents(data: InteractionMetric[]): Array<{ intent: string; count: number }> {
  const intentCounts = new Map<string, number>();
  
  data.forEach(metric => {
    if (metric.data.intent) {
      intentCounts.set(metric.data.intent, (intentCounts.get(metric.data.intent) || 0) + 1);
    }
  });

  return Array.from(intentCounts.entries())
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function calculateSatisfactionTrend(data: InteractionMetric[]): Array<{ date: string; averageRating: number }> {
  const satisfactionData = data
    .filter(metric => metric.eventType === 'satisfaction_rated')
    .map(metric => ({
      date: metric.timestamp.split('T')[0],
      rating: metric.data.rating
    }));

  const dailyRatings = new Map<string, number[]>();
  satisfactionData.forEach(item => {
    if (!dailyRatings.has(item.date)) {
      dailyRatings.set(item.date, []);
    }
    dailyRatings.get(item.date)!.push(item.rating);
  });

  return Array.from(dailyRatings.entries())
    .map(([date, ratings]) => ({
      date,
      averageRating: ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateErrorRate(data: InteractionMetric[]): number {
  const errorCount = data.filter(metric => metric.eventType === 'error_occurred').length;
  return (errorCount / data.length) * 100;
}

function calculatePeakUsageHours(data: InteractionMetric[]): Array<{ hour: number; count: number }> {
  const hourCounts = new Map<number, number>();
  
  data.forEach(metric => {
    const hour = new Date(metric.timestamp).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  return Array.from(hourCounts.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
