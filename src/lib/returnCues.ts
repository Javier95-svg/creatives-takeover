import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { recordMeaningfulAction, type EngagementSection } from '@/lib/engagementSession';

export interface ReturnCue {
  id: string;
  source_section: EngagementSection;
  entity_type: string | null;
  entity_id: string | null;
  reason_key: string;
  scheduled_for: string;
  cta_url: string;
  status: 'scheduled' | 'completed' | 'dismissed' | 'cancelled' | 'expired';
  dedupe_key: string;
}

export async function scheduleReturnCue(params: {
  sourceSection: Exclude<EngagementSection, 'account' | 'platform'>;
  entityType?: string | null;
  entityId?: string | null;
  reasonKey: string;
  scheduledFor: string;
  ctaUrl: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
  plan?: string;
  daysSinceSignup?: number;
}): Promise<ReturnCue> {
  const { data, error } = await supabase.rpc('upsert_user_return_cue_v1' as never, {
    p_source_section: params.sourceSection,
    p_entity_type: params.entityType ?? '',
    p_entity_id: params.entityId ?? '',
    p_reason_key: params.reasonKey,
    p_scheduled_for: params.scheduledFor,
    p_cta_url: params.ctaUrl,
    p_dedupe_key: params.dedupeKey,
    p_metadata: params.metadata ?? {},
  } as never);
  if (error) throw error;
  const cue = data as unknown as ReturnCue;
  captureEvent('return_cue_created', {
    cue_id: cue.id,
    section: params.sourceSection,
    reason_key: params.reasonKey,
    scheduled_for: params.scheduledFor,
  });
  recordMeaningfulAction({
    actionType: 'return_cue_scheduled',
    section: params.sourceSection,
    plan: params.plan ?? 'unknown',
    daysSinceSignup: params.daysSinceSignup ?? 0,
    entityType: params.entityType,
    entityId: params.entityId,
  });
  return cue;
}

export async function completeReturnCue(cueId: string): Promise<ReturnCue> {
  const { data, error } = await supabase.rpc('complete_user_return_cue_v1' as never, {
    p_cue_id: cueId,
  } as never);
  if (error) throw error;
  const cue = data as unknown as ReturnCue;
  captureEvent('return_cue_completed', {
    cue_id: cue.id,
    section: cue.source_section,
    reason_key: cue.reason_key,
  });
  return cue;
}
