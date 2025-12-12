import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logError, logWarn, logInfo } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Alert {
  type: 'error_rate' | 'auth_failure' | 'rate_limit' | 'high_ambiguity';
  severity: 'critical' | 'warning';
  message: string;
  data: Record<string, unknown>;
}

/**
 * Check error rate and alert if too high
 */
async function checkErrorRate(supabase: any, timeWindowMinutes: number = 5, thresholdPercent: number = 5): Promise<Alert | null> {
  const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  const { data: metrics, error } = await supabase
    .from('chatbot_metrics')
    .select('success')
    .gte('created_at', startTime);
  
  if (error || !metrics || metrics.length === 0) {
    return null;
  }
  
  const totalRequests = metrics.length;
  const errorCount = metrics.filter((m: any) => !m.success).length;
  const errorRate = (errorCount / totalRequests) * 100;
  
  if (errorRate > thresholdPercent) {
    return {
      type: 'error_rate',
      severity: errorRate > 10 ? 'critical' : 'warning',
      message: `High error rate detected: ${errorRate.toFixed(2)}% (${errorCount}/${totalRequests} failures) in last ${timeWindowMinutes} minutes`,
      data: {
        errorRate: errorRate.toFixed(2),
        errorCount,
        totalRequests,
        timeWindowMinutes,
        threshold: thresholdPercent
      }
    };
  }
  
  return null;
}

/**
 * Check for recent auth failures
 */
async function checkAuthFailures(supabase: any, timeWindowMinutes: number = 5): Promise<Alert | null> {
  const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  const { data: failures, error } = await supabase
    .from('chatbot_error_logs')
    .select('*')
    .eq('error_type', 'auth_failure')
    .gte('created_at', startTime);
  
  if (error || !failures || failures.length === 0) {
    return null;
  }
  
  return {
    type: 'auth_failure',
    severity: 'critical',
    message: `Authentication failures detected: ${failures.length} failure(s) in last ${timeWindowMinutes} minutes`,
    data: {
      count: failures.length,
      timeWindowMinutes,
      failures: failures.map((f: any) => ({
        apiKeyName: f.api_key_name,
        endpoint: f.endpoint,
        createdAt: f.created_at
      }))
    }
  };
}

/**
 * Check for rate limit events
 */
async function checkRateLimits(supabase: any, timeWindowMinutes: number = 60, threshold: number = 10): Promise<Alert | null> {
  const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  const { data: rateLimits, error } = await supabase
    .from('chatbot_error_logs')
    .select('*')
    .eq('error_type', 'rate_limit')
    .gte('created_at', startTime);
  
  if (error || !rateLimits || rateLimits.length === 0) {
    return null;
  }
  
  if (rateLimits.length > threshold) {
    return {
      type: 'rate_limit',
      severity: 'warning',
      message: `High rate limit events: ${rateLimits.length} event(s) in last ${timeWindowMinutes} minutes (threshold: ${threshold})`,
      data: {
        count: rateLimits.length,
        timeWindowMinutes,
        threshold,
        events: rateLimits.map((r: any) => ({
          endpoint: r.endpoint,
          retryAfter: r.retry_after,
          createdAt: r.created_at
        }))
      }
    };
  }
  
  return null;
}

/**
 * Check for high ambiguity responses
 */
async function checkHighAmbiguity(supabase: any, timeWindowMinutes: number = 5, thresholdPercent: number = 20, ambiguityThreshold: number = 70): Promise<Alert | null> {
  const startTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();
  
  const { data: metrics, error } = await supabase
    .from('chatbot_metrics')
    .select('ambiguity_score, success')
    .gte('created_at', startTime)
    .eq('success', true);
  
  if (error || !metrics || metrics.length === 0) {
    return null;
  }
  
  const highAmbiguityCount = metrics.filter((m: any) => 
    m.ambiguity_score && m.ambiguity_score >= ambiguityThreshold
  ).length;
  
  const highAmbiguityRate = (highAmbiguityCount / metrics.length) * 100;
  
  if (highAmbiguityRate > thresholdPercent) {
    return {
      type: 'high_ambiguity',
      severity: 'warning',
      message: `High ambiguity rate detected: ${highAmbiguityRate.toFixed(2)}% (${highAmbiguityCount}/${metrics.length} responses) with ambiguity >= ${ambiguityThreshold} in last ${timeWindowMinutes} minutes`,
      data: {
        highAmbiguityRate: highAmbiguityRate.toFixed(2),
        highAmbiguityCount,
        totalResponses: metrics.length,
        timeWindowMinutes,
        thresholdPercent,
        ambiguityThreshold
      }
    };
  }
  
  return null;
}

/**
 * Send alert via webhook
 */
async function sendAlert(alert: Alert): Promise<void> {
  const webhookUrl = Deno.env.get('ALERT_WEBHOOK_URL');
  if (!webhookUrl) {
    logWarn('ALERT_WEBHOOK_URL not configured, alert not sent', { alert });
    return;
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: {
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          timestamp: new Date().toISOString(),
          ...alert.data
        }
      })
    });
    
    if (!response.ok) {
      logError('Failed to send alert', { 
        status: response.status, 
        alert: alert.type 
      });
    } else {
      logInfo('Alert sent successfully', { alert: alert.type });
    }
  } catch (error) {
    logError('Error sending alert', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      alert: alert.type 
    });
  }
}

/**
 * Main alert checking function
 */
async function checkAlerts(supabase: any): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  // Check all alert conditions in parallel
  const [errorRateAlert, authFailureAlert, rateLimitAlert, ambiguityAlert] = await Promise.all([
    checkErrorRate(supabase, 5, 5),
    checkAuthFailures(supabase, 5),
    checkRateLimits(supabase, 60, 10),
    checkHighAmbiguity(supabase, 5, 20, 70)
  ]);
  
  if (errorRateAlert) alerts.push(errorRateAlert);
  if (authFailureAlert) alerts.push(authFailureAlert);
  if (rateLimitAlert) alerts.push(rateLimitAlert);
  if (ambiguityAlert) alerts.push(ambiguityAlert);
  
  return alerts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for alerts
    const alerts = await checkAlerts(supabase);
    
    // Send alerts
    const alertPromises = alerts.map(alert => sendAlert(alert));
    await Promise.all(alertPromises);
    
    return new Response(JSON.stringify({
      success: true,
      alertsFound: alerts.length,
      alerts: alerts.map(a => ({
        type: a.type,
        severity: a.severity,
        message: a.message
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logError('Alert checking error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

