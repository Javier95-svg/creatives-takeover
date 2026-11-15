// In-memory stand-in for the Supabase client, with just enough of the query
// builder for the customer research pipeline. Used by the research tests and
// by scripts/gtm-research-eval.ts. All data is synthetic; nothing leaves memory.

type Row = Record<string, any>;

export class ResearchDb {
  tables: Record<string, Row[]> = {
    gtm_research_runs: [], gtm_research_steps: [], gtm_prospect_companies: [], gtm_outreach_drafts: [],
    gtm_domain_cache: [], gtm_suppressions: [], provider_spend_ledger: [], community_notifications: [],
  };
  rpcCalls: Array<{ name: string; args: Row }> = [];
  private seq = 0;
  rpc(name: string, args: Row) { this.rpcCalls.push({ name, args }); return Promise.resolve({ data: { success: true }, error: null }); }
  from(table: string) {
    if (!(table in this.tables)) throw new Error(`Unexpected table: ${table}`);
    const rows = this.tables[table];
    const filters: Array<(row: Row) => boolean> = [];
    let mode: 'select' | 'insert' | 'update' | 'upsert' = 'select';
    let payload: Row | Row[] | null = null; let upsertOptions: Row = {};
    let head = false; let limit = Infinity; let order: { key: string; ascending: boolean } | null = null; let joinDrafts = false;
    const db = this;
    const run = () => {
      if (mode === 'insert' || mode === 'upsert') {
        const list = (Array.isArray(payload) ? payload : [payload]) as Row[];
        const keys = String(upsertOptions.onConflict ?? (table === 'gtm_domain_cache' ? 'domain' : '')).split(',').filter(Boolean);
        const written: Row[] = [];
        for (const item of list) {
          const existing = mode === 'upsert' && keys.length ? rows.find((row) => keys.every((key) => row[key] === (item[key] ?? (key === 'batch' ? 0 : undefined)))) : undefined;
          if (existing) { if (!upsertOptions.ignoreDuplicates) Object.assign(existing, item); written.push(existing); continue; }
          const row = { id: `id-${++db.seq}`, created_at: new Date(Date.now() + db.seq).toISOString(), status: table === 'gtm_research_steps' ? 'queued' : undefined, batch: 0, ...item };
          rows.push(row); written.push(row);
        }
        return { data: written, error: null, count: written.length };
      }
      let found = rows.filter((row) => filters.every((filter) => filter(row)));
      if (mode === 'update') { found.forEach((row) => Object.assign(row, payload)); return { data: found, error: null, count: found.length }; }
      if (order) found = [...found].sort((a, b) => (a[order!.key] > b[order!.key] ? 1 : -1) * (order!.ascending ? 1 : -1));
      found = found.slice(0, limit);
      if (joinDrafts) found = found.map((row) => ({ ...row, gtm_outreach_drafts: db.tables.gtm_outreach_drafts.filter((draft) => draft.prospect_id === row.id) }));
      return { data: head ? null : found, error: null, count: found.length };
    };
    const query: any = {
      select: (fields = '*', options: Row = {}) => { head = Boolean(options.head); joinDrafts = String(fields).includes('gtm_outreach_drafts'); return query; },
      insert: (value: Row | Row[]) => { mode = 'insert'; payload = value; return query; },
      upsert: (value: Row | Row[], options: Row = {}) => { mode = 'upsert'; payload = value; upsertOptions = options; return query; },
      update: (value: Row) => { mode = 'update'; payload = value; return query; },
      eq: (key: string, value: unknown) => { filters.push((row) => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { filters.push((row) => values.includes(row[key])); return query; },
      is: (key: string, value: unknown) => { filters.push((row) => (row[key] ?? null) === value); return query; },
      not: (key: string, operator: string, value: unknown) => { filters.push((row) => (operator === 'is' ? (row[key] ?? null) !== value : row[key] !== value)); return query; },
      neq: (key: string, value: unknown) => { filters.push((row) => row[key] !== value); return query; },
      gte: (key: string, value: string) => { filters.push((row) => String(row[key]) >= value); return query; },
      order: (key: string, options: Row = {}) => { order = { key, ascending: options.ascending !== false }; return query; },
      limit: (value: number) => { limit = value; return query; },
      maybeSingle: async () => { const result = run(); return { ...result, data: (result.data as Row[] | null)?.[0] ?? null }; },
      single: async () => { const result = run(); return { ...result, data: (result.data as Row[] | null)?.[0] ?? null }; },
      then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve().then(run).then(resolve, reject),
    };
    return query;
  }
}

/**
 * Drives a run through the real step handlers in order, the way the worker
 * does. When the run pauses for review, `confirm` picks the segment (the first
 * proposed one by default).
 */
export async function driveResearchRun(db: ResearchDb, run: Row, first: string, logs: string[], confirm: (run: Row) => Row = (current) => current.segments[0]) {
  const { STEP_HANDLERS } = await import('../../supabase/functions/_shared/gtm-research-pipeline.ts');
  const queue: Array<{ key: string; batch: number }> = [{ key: first, batch: 0 }];
  let guard = 0;
  while (queue.length && guard++ < 45) {
    const next = queue.shift()!;
    const step: Row = { id: `step-${run.id}-${guard}`, run_id: run.id, user_id: run.user_id, key: next.key, batch: next.batch, attempt: 1, max_attempts: 3, detail: {}, status: 'running' };
    db.tables.gtm_research_steps.push(step);
    const outcome = await (STEP_HANDLERS as Row)[next.key](db, run, step);
    Object.assign(step, { status: outcome.status ?? 'done', detail: outcome.detail ?? {}, log: outcome.log });
    Object.assign(run, outcome.runPatch ?? {});
    logs.push(`${next.key}: ${outcome.log}`);
    if (run.status === 'needs_review') {
      Object.assign(run, { selected_segment: confirm(run), status: 'running' });
      queue.push({ key: 'discover_companies', batch: 0 });
      continue;
    }
    for (const item of outcome.next ?? []) queue.push({ key: item.key, batch: item.batch ?? 0 });
  }
}
