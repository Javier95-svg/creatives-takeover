import { supabase } from '@/integrations/supabase/client';

export interface ConversionMetrics {
  triggerType: string;
  totalViews: number;
  totalClicks: number;
  totalSignups: number;
  conversionRate: number;
  avgTimeToConversion: number;
}

export interface FunnelMetrics {
  stage1Views: number;
  stage2Engagements: number;
  stage3SignupStarts: number;
  stage4Completions: number;
  dropOffRate: number;
  avgCompletionTime: number;
}

/**
 * Get conversion rate by trigger type
 */
export async function getConversionRateByTrigger(
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: Date = new Date()
): Promise<ConversionMetrics[]> {
  try {
    const { data, error } = await supabase.rpc('get_conversion_rate_by_trigger', {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
    });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      triggerType: row.trigger_type,
      totalViews: Number(row.total_views) || 0,
      totalClicks: Number(row.total_clicks) || 0,
      totalSignups: Number(row.total_signups) || 0,
      conversionRate: Number(row.conversion_rate) || 0,
      avgTimeToConversion: 0, // Calculate separately if needed
    }));
  } catch (error) {
    console.error('Error fetching conversion rates:', error);
    return [];
  }
}

/**
 * Get funnel metrics
 */
export async function getFunnelMetrics(
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: Date = new Date()
): Promise<FunnelMetrics> {
  try {
    const { data, error } = await supabase
      .from('conversion_funnels')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    const funnels = data || [];
    const stage1Views = funnels.filter(f => f.stage_1_viewed_at).length;
    const stage2Engagements = funnels.filter(f => f.stage_2_engaged_at).length;
    const stage3SignupStarts = funnels.filter(f => f.stage_3_signup_started_at).length;
    const stage4Completions = funnels.filter(f => f.completed).length;

    const completedFunnels = funnels.filter(f => f.completed && f.completion_time);
    const avgCompletionTime = completedFunnels.length > 0
      ? completedFunnels.reduce((sum, f) => sum + (f.completion_time || 0), 0) / completedFunnels.length
      : 0;

    const dropOffRate = stage1Views > 0
      ? ((stage1Views - stage4Completions) / stage1Views) * 100
      : 0;

    return {
      stage1Views,
      stage2Engagements,
      stage3SignupStarts,
      stage4Completions,
      dropOffRate: Math.round(dropOffRate * 100) / 100,
      avgCompletionTime: Math.round(avgCompletionTime),
    };
  } catch (error) {
    console.error('Error fetching funnel metrics:', error);
    return {
      stage1Views: 0,
      stage2Engagements: 0,
      stage3SignupStarts: 0,
      stage4Completions: 0,
      dropOffRate: 0,
      avgCompletionTime: 0,
    };
  }
}

/**
 * Get drop-off points
 */
export async function getDropOffPoints(
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: Date = new Date()
): Promise<Record<number, number>> {
  try {
    const { data, error } = await supabase
      .from('conversion_funnels')
      .select('dropped_off_at_stage')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('dropped_off_at_stage', 'is', null);

    if (error) throw error;

    const dropOffs: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    (data || []).forEach((funnel: any) => {
      const stage = funnel.dropped_off_at_stage;
      if (stage && stage >= 1 && stage <= 4) {
        dropOffs[stage] = (dropOffs[stage] || 0) + 1;
      }
    });

    return dropOffs;
  } catch (error) {
    console.error('Error fetching drop-off points:', error);
    return { 1: 0, 2: 0, 3: 0, 4: 0 };
  }
}

/**
 * Get conversion events for a specific trigger type
 */
export async function getTriggerEvents(
  triggerType: string,
  startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: Date = new Date()
) {
  try {
    const { data, error } = await supabase
      .from('conversion_events')
      .select('*')
      .eq('trigger_type', triggerType)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trigger events:', error);
    return [];
  }
}

