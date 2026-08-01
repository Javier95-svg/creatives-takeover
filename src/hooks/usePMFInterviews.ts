import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PMFInterviewLog } from '@/hooks/usePMFLab';
import { trackPrebuildLineageEvent } from '@/lib/journeyOutcomes';

const TABLE = 'pmf_interviews' as any;

function fromRow(row: any): PMFInterviewLog {
  return {
    id: row.id,
    sourceLeadId: row.source_lead_id ?? undefined,
    intervieweeName: row.interviewee_name,
    basicProfile: row.basic_profile,
    segment: row.segment,
    mainFeedback: row.main_feedback,
    objections: row.objections,
    missingFeatures: row.missing_features,
    interestLevel: row.interest_level,
    buyingIntent: row.buying_intent,
    assumptionFingerprint: row.assumption_fingerprint ?? undefined,
    assumptionStatement: row.assumption_statement ?? undefined,
    assumptionStatus: row.assumption_status ?? undefined,
    landingPageShown: row.landing_page_shown,
    solutionPitched: row.solution_pitched,
    askedAboutPricing: row.asked_about_pricing,
    joinedWaitlist: row.joined_waitlist,
    referredSomeone: row.referred_someone,
    offeredToPay: row.offered_to_pay,
  };
}

function toRow(userId: string, contextId: string, handoffId: string | null, interview: PMFInterviewLog) {
  return {
    id: interview.id,
    user_id: userId,
    validation_context_id: contextId,
    originating_handoff_id: handoffId,
    source_lead_id: interview.sourceLeadId ?? null,
    interviewee_name: interview.intervieweeName,
    basic_profile: interview.basicProfile,
    segment: interview.segment,
    main_feedback: interview.mainFeedback,
    objections: interview.objections,
    missing_features: interview.missingFeatures,
    interest_level: interview.interestLevel,
    buying_intent: interview.buyingIntent,
    assumption_fingerprint: interview.assumptionFingerprint ?? null,
    assumption_statement: interview.assumptionStatement ?? null,
    assumption_status: interview.assumptionStatus ?? null,
    landing_page_shown: interview.landingPageShown,
    solution_pitched: interview.solutionPitched,
    asked_about_pricing: interview.askedAboutPricing,
    joined_waitlist: interview.joinedWaitlist,
    referred_someone: interview.referredSomeone,
    offered_to_pay: interview.offeredToPay,
    evidence_origin: 'founder_reported',
  };
}

export function usePMFInterviews(userId?: string, contextId?: string | null, handoffId?: string | null) {
  const [interviews, setInterviews] = useState<PMFInterviewLog[]>([]);
  const [loading, setLoading] = useState(Boolean(userId && contextId));
  const activeContextRef = useRef(contextId);
  activeContextRef.current = contextId;

  const reload = useCallback(async () => {
    if (!userId || !contextId) {
      setInterviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('validation_context_id', contextId)
      .order('created_at', { ascending: true });
    if (activeContextRef.current !== contextId) return;
    setLoading(false);
    if (error) throw error;
    setInterviews((data ?? []).map(fromRow));
  }, [contextId, userId]);

  useEffect(() => { void reload(); }, [reload]);

  const saveInterview = useCallback(async (interview: PMFInterviewLog) => {
    if (!userId || !contextId) throw new Error('Choose an evidence case before saving an interview.');
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(toRow(userId, contextId, handoffId ?? null, interview) as any, { onConflict: 'id' })
      .select('*')
      .single();
    if (error) throw error;
    const saved = fromRow(data);
    setInterviews((current) => {
      const exists = current.some((item) => item.id === saved.id);
      return exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved];
    });
    trackPrebuildLineageEvent('prebuild_evidence_collected', {
      validationContextId: contextId, handoffId, destinationTool: 'pmf_lab', artifactId: saved.id,
      evidenceType: 'founder_reported_interview',
    });
    return saved;
  }, [contextId, handoffId, userId]);

  const saveMany = useCallback(async (items: PMFInterviewLog[]) => {
    if (!userId || !contextId || items.length === 0) return;
    const { error } = await supabase
      .from(TABLE)
      .upsert(items.map((item) => toRow(userId, contextId, handoffId ?? null, item)) as any, { onConflict: 'id' });
    if (error) throw error;
    await reload();
  }, [contextId, handoffId, reload, userId]);

  const deleteInterview = useCallback(async (interviewId: string) => {
    if (!userId || !contextId) return;
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', interviewId)
      .eq('user_id', userId)
      .eq('validation_context_id', contextId);
    if (error) throw error;
    setInterviews((current) => current.filter((item) => item.id !== interviewId));
  }, [contextId, userId]);

  return { interviews, loading, reload, saveInterview, saveMany, deleteInterview };
}
