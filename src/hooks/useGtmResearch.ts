import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createIdempotencyKey } from '@/lib/idempotency';
import { captureEvent } from '@/lib/analytics';
import type {
  BusinessProfile, BuyingSignal, Competitor, ContactRoute, CriterionVerdict, DraftStatus, FitTier, ResearchRunKind, ResearchRunStatus,
  ResearchStepKey, ResearchStepStatus, Segment,
} from '@/lib/gtmResearch';

export interface ResearchRunRow {
  id: string;
  status: ResearchRunStatus;
  kind: ResearchRunKind;
  parent_run_id: string | null;
  input: { websiteUrl?: string; description?: string };
  business_profile: BusinessProfile | null;
  competitors: Competitor[];
  segments: Segment[];
  selected_segment: Segment | null;
  counts: { checked?: number; qualified?: number; candidates?: number; drafts?: number; searches?: number; signals?: number };
  credits_reserved: number;
  credits_charged: number | null;
  gifted: boolean;
  cohort_id: string | null;
  rerun_used: boolean;
  auto_refresh: boolean;
  last_refreshed_at: string | null;
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

export interface ProspectDraft {
  id: string; subject: string; body: string; language: string; status: DraftStatus; edited: boolean;
  variant_b_subject: string | null; variant_b_body: string | null; chosen_variant: 'a' | 'b';
  sent_at: string | null; replied_at: string | null;
}

export interface ProspectContact { id: string; full_name: string; role: string | null; email: string; email_status: 'valid' | 'catch_all'; provider: string; sources: string[]; found_at: string }

export interface ProspectRow {
  id: string; run_id: string | null; domain: string; name: string; description: string | null; location: string | null;
  size_band: string | null; industry: string | null; fit_score: number; fit_tier: FitTier; criteria: Array<CriterionVerdict & { checkedAt?: string }>;
  contact_routes: ContactRoute[]; suggested_roles: string[]; blocked: boolean; signals: BuyingSignal[];
  status: 'new' | 'shortlisted' | 'dismissed' | 'in_pipeline' | 'contacted'; feedback: { reason?: string; at?: string } | null;
  pipeline_entry_id: string | null; contact_id: string | null; last_checked_at: string;
  draft: ProspectDraft | null;
  contact: ProspectContact | null;
}

const ACTIVE: ResearchRunStatus[] = ['analyzing', 'queued', 'running'];
const POLL_MS = 3_000;
// The generated types do not know the research tables yet.
const db = supabase as unknown as { from: (table: string) => any; rpc: (name: string, args: Record<string, unknown>) => any };

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

const isRoot = (run: Pick<ResearchRunRow, 'kind' | 'parent_run_id'>) => run.kind === 'initial' || !run.parent_run_id;

/**
 * The current "Find customers" search for a project, kept fresh while the
 * agent works. A search is its first run plus the runs that added companies
 * to it (more, similar, re-run, weekly check); its prospects are shown together.
 */
export function useGtmResearch(projectId: string | null) {
  const { user } = useAuth();
  // The account id, not the user object: Supabase hands out a new user object on
  // token refreshes and tab focus, which must not reload the research.
  const userId = user?.id ?? null;
  const [run, setRun] = useState<ResearchRunRow | null>(null);
  const [root, setRoot] = useState<ResearchRunRow | null>(null);
  const [searches, setSearches] = useState<ResearchRunRow[]>([]);
  const [steps, setSteps] = useState<ResearchStepRow[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const runId = run?.id ?? null;
  const rootId = root?.id ?? null;
  const reported = useRef<string | null>(null);

  const scoped = useCallback((query: any) => (projectId ? query.eq('project_id', projectId) : query.is('project_id', null)), [projectId]);

  /** The run to show: a given one, or the newest in this project (follow-ups included). */
  const loadRun = useCallback(async (id?: string) => {
    if (!userId) return null;
    let query = db.from('gtm_research_runs').select('*').eq('user_id', userId);
    query = id ? query.eq('id', id) : scoped(query);
    const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
    return (data as ResearchRunRow | null) ?? null;
  }, [userId, scoped]);

  const loadDetails = useCallback(async (current: ResearchRunRow) => {
    if (!userId) return;
    const searchRoot = isRoot(current) ? current : ((await loadRun(current.parent_run_id!)) ?? current);
    const [{ data: family }, { data: stepRows }, { data: roots }] = await Promise.all([
      db.from('gtm_research_runs').select('id').eq('user_id', userId).eq('parent_run_id', searchRoot.id).neq('kind', 'initial'),
      db.from('gtm_research_steps').select('id, key, batch, status, log, started_at, finished_at, created_at').eq('run_id', current.id).order('created_at'),
      scoped(db.from('gtm_research_runs').select('*').eq('user_id', userId).eq('kind', 'initial').not('started_at', 'is', null))
        .order('created_at', { ascending: false }).limit(10),
    ]);
    const runIds = [searchRoot.id, ...((family ?? []) as Array<{ id: string }>).map((row) => row.id)];
    const { data: prospectRows } = await db.from('gtm_prospect_companies')
      .select('*, gtm_outreach_drafts(id, subject, body, language, status, edited, variant_b_subject, variant_b_body, chosen_variant, sent_at, replied_at), gtm_prospect_contacts(id, full_name, role, email, email_status, provider, sources, found_at)')
      .in('run_id', runIds).order('fit_score', { ascending: false });
    setRoot(searchRoot);
    setSearches((roots ?? []) as ResearchRunRow[]);
    setSteps((stepRows ?? []) as ResearchStepRow[]);
    type Joined = ProspectRow & { gtm_outreach_drafts?: ProspectDraft[] | ProspectDraft | null; gtm_prospect_contacts?: ProspectContact[] | null };
    setProspects(((prospectRows ?? []) as Joined[]).map(({ gtm_outreach_drafts: drafts, gtm_prospect_contacts: contacts, ...row }) => ({
      ...row, signals: row.signals ?? [], draft: Array.isArray(drafts) ? drafts[0] ?? null : drafts ?? null, contact: contacts?.[0] ?? null,
    })));
  }, [userId, loadRun, scoped]);

  const refresh = useCallback(async (id?: string) => {
    const next = await loadRun(id);
    setRun(next);
    if (next) await loadDetails(next);
    else { setRoot(null); setSteps([]); setProspects([]); }
    return next;
  }, [loadRun, loadDetails]);

  // The spinner is for a new account or project only; anything else refreshes
  // in place so the page never blanks out under the founder.
  const loadedScope = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    const scope = `${userId ?? ''}:${projectId ?? ''}`;
    const firstLoad = loadedScope.current !== scope;
    if (firstLoad) setLoading(true);
    void refresh().finally(() => {
      if (!alive) return;
      loadedScope.current = scope;
      setLoading(false);
    });
    return () => { alive = false; };
  }, [refresh, userId, projectId]);

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
      captureEvent('gtm_customer_research_completed', { status: run.status, qualified: run.counts.qualified ?? 0, credits_charged: run.credits_charged ?? 0, gifted: run.gifted, kind: run.kind ?? 'initial' });
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

  /** Resumes a failed reading of the business from the step that failed. Free. */
  const retry = useCallback(() => act(async () => {
    if (!runId) return;
    await invoke('retry', { runId });
    captureEvent('gtm_customer_research_follow_up', { kind: 'retry_analysis' });
    await refresh(runId);
  }), [act, runId, refresh]);

  const edit = useCallback((changes: { profile?: Partial<Record<'offering' | 'audience' | 'valueProposition' | 'geography', string>>; removeCompetitors?: string[] }) => act(async () => {
    if (!runId) return;
    await invoke('edit', { runId, ...changes });
    await refresh(runId);
  }), [act, runId, refresh]);

  const start = useCallback((segment: Segment) => act(async () => {
    if (!runId) return;
    const data = await invoke('start', { runId, segment }, createIdempotencyKey('gtm-research', crypto.randomUUID()));
    captureEvent('gtm_customer_research_started', { gifted: Boolean(data.gifted), from_program: Boolean(data.fromProgram), must_have_criteria: segment.criteria.filter((criterion) => criterion.mustHave).length });
    await refresh(runId);
  }), [act, runId, refresh]);

  const cancel = useCallback(() => act(async () => {
    if (!runId) return;
    await invoke('cancel', { runId });
    await refresh(runId);
  }), [act, runId, refresh]);

  /** More companies for the current search: +10 (more), like the shortlisted ones (similar), or the free re-run. */
  const followUp = useCallback((kind: 'more' | 'similar' | 'rerun') => act(async () => {
    if (!rootId) return;
    const data = await invoke(kind, { runId: rootId }, kind === 'rerun' ? undefined : createIdempotencyKey(`gtm-research-${kind}`, crypto.randomUUID()));
    captureEvent('gtm_customer_research_follow_up', { kind });
    await refresh(String(data.runId));
  }), [act, rootId, refresh]);

  /** Another target group from the same analysis, without reading the site again. */
  const branch = useCallback(() => act(async () => {
    if (!rootId) return;
    const data = await invoke('branch', { runId: rootId });
    captureEvent('gtm_customer_research_follow_up', { kind: 'branch' });
    await refresh(String(data.runId));
  }), [act, rootId, refresh]);

  const setAutoRefresh = useCallback((enabled: boolean) => act(async () => {
    if (!rootId) return;
    await invoke('auto_refresh', { runId: rootId, enabled });
    captureEvent('gtm_customer_research_follow_up', { kind: enabled ? 'weekly_on' : 'weekly_off' });
    setRoot((previous) => (previous ? { ...previous, auto_refresh: enabled } : previous));
  }), [act, rootId]);

  const selectSearch = useCallback((id: string) => act(async () => { await refresh(id); }), [act, refresh]);

  const startOver = useCallback(() => { setRun(null); setRoot(null); setSteps([]); setProspects([]); }, []);

  const updateProspect = useCallback(async (id: string, patch: Partial<Pick<ProspectRow, 'status' | 'feedback' | 'pipeline_entry_id' | 'contact_id'>>) => {
    setProspects((previous) => previous.map((prospect) => (prospect.id === id ? { ...prospect, ...patch } : prospect)));
    const { error } = await db.from('gtm_prospect_companies').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { if (run) await loadDetails(run); throw error; }
    if (patch.status) captureEvent('gtm_prospect_action', { action: patch.status });
    if (patch.feedback) captureEvent('gtm_prospect_feedback', { reason: patch.feedback.reason ?? 'other' });
  }, [loadDetails, run]);

  const updateDraft = useCallback(async (prospectId: string, patch: Partial<Pick<ProspectDraft, 'subject' | 'body' | 'status' | 'variant_b_subject' | 'variant_b_body' | 'chosen_variant' | 'sent_at' | 'replied_at'>>) => {
    const prospect = prospects.find((item) => item.id === prospectId);
    if (!prospect?.draft) return;
    const textChanged = ['subject', 'body', 'variant_b_subject', 'variant_b_body'].some((field) => field in patch);
    const edited = textChanged || prospect.draft.edited;
    setProspects((previous) => previous.map((item) => (item.id === prospectId && item.draft ? { ...item, draft: { ...item.draft, ...patch, edited } } : item)));
    const { error } = await db.from('gtm_outreach_drafts').update({ ...patch, edited, updated_at: new Date().toISOString() }).eq('id', prospect.draft.id);
    if (error) { if (run) await loadDetails(run); throw error; }
  }, [loadDetails, prospects, run]);

  /**
   * The founder's customer contact for this company (the evidence pipeline
   * behind BizMap, First Customer Proof and program counts), created once.
   * A company already added to the GTM pipeline reuses the contact that
   * the pipeline created.
   */
  const ensureContact = useCallback(async (prospect: ProspectRow): Promise<string> => {
    if (prospect.contact_id) return prospect.contact_id;
    if (!userId) throw new Error('Sign in first');
    if (prospect.pipeline_entry_id) {
      const { data: existing } = await db.from('founder_customer_contacts').select('id').eq('user_id', userId)
        .eq('source', 'gtm').eq('display_name', `${prospect.name} (${prospect.domain})`).limit(1).maybeSingle();
      if (existing?.id) { await updateProspect(prospect.id, { contact_id: existing.id }); return existing.id as string; }
    }
    const { data, error } = await db.rpc('upsert_founder_customer_contact_v1', {
      p_display_name: prospect.contact?.full_name ?? prospect.name, p_company: prospect.name, p_role: prospect.contact?.role ?? null,
      p_profile_url: `https://${prospect.domain}`, p_source: 'web', p_notes: 'From GTM Strategist customer research',
      p_contact_id: null, p_creation_key: `gtm-research:${prospect.id}`,
    });
    if (error) throw error;
    const contact = Array.isArray(data) ? data[0] : data;
    if (!contact?.id) throw new Error('The contact could not be created');
    await updateProspect(prospect.id, { contact_id: contact.id });
    return contact.id as string;
  }, [updateProspect, userId]);

  const recordEvidence = useCallback(async (prospect: ProspectRow, contactId: string, eventType: 'outreach_sent' | 'reply_received') => {
    if (!userId) return;
    const { data: cycle } = await db.from('founder_cycle_state').select('selected_loop, recommended_loop').eq('user_id', userId).maybeSingle();
    const { error } = await db.rpc('record_customer_evidence_event_v1', {
      p_event_type: eventType, p_active_loop: cycle?.selected_loop ?? cycle?.recommended_loop ?? 'PROVE', p_contact_id: contactId,
      p_source_entity_type: 'gtm_prospect', p_source_entity_id: prospect.id, p_verification_mode: 'founder_reported',
      p_amount: null, p_currency: null, p_metadata: { domain: prospect.domain, variant: prospect.draft?.chosen_variant ?? 'a' },
      p_idempotency_key: `gtm-research:${prospect.id}:${eventType}`,
    });
    if (error) throw error;
  }, [userId]);

  const markSent = useCallback(async (prospect: ProspectRow) => {
    const contactId = await ensureContact(prospect);
    await updateDraft(prospect.id, { status: 'sent_manually', sent_at: new Date().toISOString() });
    await updateProspect(prospect.id, { status: 'contacted' });
    await recordEvidence(prospect, contactId, 'outreach_sent');
    captureEvent('gtm_draft_marked_sent', { tier: prospect.fit_tier, variant: prospect.draft?.chosen_variant ?? 'a' });
  }, [ensureContact, recordEvidence, updateDraft, updateProspect]);

  const markReplied = useCallback(async (prospect: ProspectRow) => {
    const contactId = await ensureContact(prospect);
    await updateDraft(prospect.id, { status: 'replied', replied_at: new Date().toISOString() });
    await recordEvidence(prospect, contactId, 'reply_received');
    captureEvent('gtm_draft_marked_replied', { tier: prospect.fit_tier, variant: prospect.draft?.chosen_variant ?? 'a' });
  }, [ensureContact, recordEvidence, updateDraft]);

  const findContact = useCallback((prospect: ProspectRow) => act(async () => {
    const data = await invoke('find_contact', { prospectId: prospect.id }, createIdempotencyKey('gtm-contact', crypto.randomUUID()));
    captureEvent('gtm_contact_lookup', { found: Boolean(data.contact) });
    if (run) await loadDetails(run);
    return { found: Boolean(data.contact), message: typeof data.message === 'string' ? data.message : null };
  }), [act, loadDetails, run]);

  return {
    run, root, searches, steps, prospects, loading, busy,
    analyze, retry, edit, start, cancel, followUp, branch, setAutoRefresh, selectSearch, startOver, refresh,
    updateProspect, updateDraft, ensureContact, markSent, markReplied, findContact,
  };
}

export type GtmResearch = ReturnType<typeof useGtmResearch>;
