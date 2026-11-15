import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createIdempotencyKey } from '@/lib/idempotency';
import { captureEvent } from '@/lib/analytics';
import type {
  BusinessProfile, Competitor, ContactRoute, CriterionVerdict, FitTier, ResearchRunStatus, ResearchStepKey, ResearchStepStatus, Segment,
} from '@/lib/gtmResearch';

export interface ResearchRunRow {
  id: string;
  status: ResearchRunStatus;
  input: { websiteUrl?: string; description?: string };
  business_profile: BusinessProfile | null;
  competitors: Competitor[];
  segments: Segment[];
  selected_segment: Segment | null;
  counts: { checked?: number; qualified?: number; candidates?: number; drafts?: number; searches?: number };
  credits_reserved: number;
  credits_charged: number | null;
  gifted: boolean;
  error_code: string | null;
  error_detail: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ResearchStepRow {
  id: string; key: ResearchStepKey; batch: number; status: ResearchStepStatus; log: string | null;
  started_at: string | null; finished_at: string | null; created_at: string;
}

export interface ProspectDraft { id: string; subject: string; body: string; language: string; status: 'draft' | 'approved' | 'sent_manually'; edited: boolean }

export interface ProspectRow {
  id: string; run_id: string | null; domain: string; name: string; description: string | null; location: string | null;
  size_band: string | null; industry: string | null; fit_score: number; fit_tier: FitTier; criteria: Array<CriterionVerdict & { checkedAt?: string }>;
  contact_routes: ContactRoute[]; suggested_roles: string[]; blocked: boolean;
  status: 'new' | 'shortlisted' | 'dismissed' | 'in_pipeline' | 'contacted'; feedback: { reason?: string; at?: string } | null;
  pipeline_entry_id: string | null; last_checked_at: string;
  draft: ProspectDraft | null;
}

const ACTIVE: ResearchRunStatus[] = ['analyzing', 'queued', 'running'];
const POLL_MS = 3_000;
// The generated types do not know the research tables yet.
const db = supabase as unknown as { from: (table: string) => any };

interface ResearchError { message: string; creditError?: boolean; errorCode?: string }

async function invoke(action: string, payload: Record<string, unknown>, idempotencyKey?: string) {
  const { data, error } = await supabase.functions.invoke('gtm-research', {
    body: { action, ...payload },
    ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
  });
  if (error || data?.error) {
    let body: Record<string, unknown> | null = data ?? null;
    const context = (error as { context?: Response } | null)?.context;
    if (!body && context && typeof context.json === 'function') body = await context.json().catch(() => null);
    const failure: ResearchError = {
      message: String(body?.error ?? 'Something went wrong. Nothing was charged.'),
      creditError: Boolean(body?.creditError),
      errorCode: typeof body?.errorCode === 'string' ? body.errorCode : undefined,
    };
    throw failure;
  }
  return data as Record<string, unknown>;
}

/** The current "Find customers" run for a project, kept fresh while the agent works. */
export function useGtmResearch(projectId: string | null) {
  const { user } = useAuth();
  const [run, setRun] = useState<ResearchRunRow | null>(null);
  const [steps, setSteps] = useState<ResearchStepRow[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const runId = run?.id ?? null;
  const reported = useRef<string | null>(null);

  const loadRun = useCallback(async (id?: string) => {
    if (!user) return null;
    let query = db.from('gtm_research_runs').select('*').eq('user_id', user.id);
    query = id ? query.eq('id', id) : projectId ? query.eq('project_id', projectId) : query.is('project_id', null);
    const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
    return (data as ResearchRunRow | null) ?? null;
  }, [user, projectId]);

  const loadDetails = useCallback(async (id: string) => {
    const [{ data: stepRows }, { data: prospectRows }] = await Promise.all([
      db.from('gtm_research_steps').select('id, key, batch, status, log, started_at, finished_at, created_at').eq('run_id', id).order('created_at'),
      db.from('gtm_prospect_companies').select('*, gtm_outreach_drafts(id, subject, body, language, status, edited)').eq('run_id', id)
        .order('fit_score', { ascending: false }),
    ]);
    setSteps((stepRows ?? []) as ResearchStepRow[]);
    setProspects(((prospectRows ?? []) as Array<ProspectRow & { gtm_outreach_drafts?: ProspectDraft[] | ProspectDraft | null }>).map(({ gtm_outreach_drafts: drafts, ...row }) => ({
      ...row, draft: Array.isArray(drafts) ? drafts[0] ?? null : drafts ?? null,
    })));
  }, []);

  const refresh = useCallback(async (id?: string) => {
    const next = await loadRun(id);
    setRun(next);
    if (next) await loadDetails(next.id);
    else { setSteps([]); setProspects([]); }
    return next;
  }, [loadRun, loadDetails]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void refresh().finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refresh]);

  // Poll while the agent works; stop when it pauses for review or finishes.
  useEffect(() => {
    if (!runId || !run || !ACTIVE.includes(run.status)) return;
    const timer = window.setInterval(() => { void refresh(runId); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [runId, run, refresh]);

  useEffect(() => {
    if (!run || reported.current === run.id) return;
    if (['completed', 'partial'].includes(run.status) || (run.status === 'failed' && run.started_at)) {
      reported.current = run.id;
      captureEvent('gtm_customer_research_completed', { status: run.status, qualified: run.counts.qualified ?? 0, credits_charged: run.credits_charged ?? 0, gifted: run.gifted });
    }
  }, [run]);

  const act = useCallback(async <T,>(work: () => Promise<T>) => {
    setBusy(true);
    try { return await work(); } finally { setBusy(false); }
  }, []);

  const analyze = useCallback((input: { websiteUrl?: string; description?: string; planId?: string | null; playId?: string | null }) => act(async () => {
    const data = await invoke('analyze', { ...input, projectId });
    captureEvent('gtm_customer_research_analyzed', { has_website: Boolean(input.websiteUrl), from_plan: Boolean(input.planId) });
    await refresh(String(data.runId));
  }), [act, projectId, refresh]);

  const edit = useCallback((changes: { profile?: Partial<Record<'offering' | 'audience' | 'valueProposition' | 'geography', string>>; removeCompetitors?: string[] }) => act(async () => {
    if (!runId) return;
    await invoke('edit', { runId, ...changes });
    await refresh(runId);
  }), [act, runId, refresh]);

  const start = useCallback((segment: Segment) => act(async () => {
    if (!runId) return;
    const data = await invoke('start', { runId, segment }, createIdempotencyKey('gtm-research', crypto.randomUUID()));
    captureEvent('gtm_customer_research_started', { gifted: Boolean(data.gifted), must_have_criteria: segment.criteria.filter((criterion) => criterion.mustHave).length });
    await refresh(runId);
  }), [act, runId, refresh]);

  const cancel = useCallback(() => act(async () => {
    if (!runId) return;
    await invoke('cancel', { runId });
    await refresh(runId);
  }), [act, runId, refresh]);

  const startOver = useCallback(() => { setRun(null); setSteps([]); setProspects([]); }, []);

  const updateProspect = useCallback(async (id: string, patch: Partial<Pick<ProspectRow, 'status' | 'feedback' | 'pipeline_entry_id'>>) => {
    setProspects((previous) => previous.map((prospect) => (prospect.id === id ? { ...prospect, ...patch } : prospect)));
    const { error } = await db.from('gtm_prospect_companies').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { if (runId) await loadDetails(runId); throw error; }
    if (patch.status) captureEvent('gtm_prospect_action', { action: patch.status });
    if (patch.feedback) captureEvent('gtm_prospect_feedback', { reason: patch.feedback.reason ?? 'other' });
  }, [loadDetails, runId]);

  const updateDraft = useCallback(async (prospectId: string, patch: Partial<Pick<ProspectDraft, 'subject' | 'body' | 'status'>>) => {
    const prospect = prospects.find((item) => item.id === prospectId);
    if (!prospect?.draft) return;
    const edited = Boolean(patch.subject !== undefined || patch.body !== undefined) || prospect.draft.edited;
    setProspects((previous) => previous.map((item) => (item.id === prospectId && item.draft ? { ...item, draft: { ...item.draft, ...patch, edited } } : item)));
    const { error } = await db.from('gtm_outreach_drafts').update({ ...patch, edited, updated_at: new Date().toISOString() }).eq('id', prospect.draft.id);
    if (error) { if (runId) await loadDetails(runId); throw error; }
  }, [loadDetails, prospects, runId]);

  return { run, steps, prospects, loading, busy, analyze, edit, start, cancel, startOver, refresh, updateProspect, updateDraft };
}

export type GtmResearch = ReturnType<typeof useGtmResearch>;
