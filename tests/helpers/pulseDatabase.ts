import assert from 'node:assert/strict';
import { pulseScope } from '../../src/lib/pulseScope.ts';

// In-memory service stub. All data is synthetic; no accounts or network touched.
export class PulseDatabase {
  failures = new Set<string>();
  reads: string[] = [];
  tables: Record<string, Record<string, any>[]> = {
    chatbot_conversations: [{ id: 'conv', session_id: '11111111-1111-4111-8111-111111111111', user_id: 'owner', purpose: 'pulse_home', business_context: { pulseScope: pulseScope('founder', null) } }],
    chatbot_messages: [], mentors: [], projects: [],
    profiles: [{ id: 'owner', user_type: 'founder', approval_status: 'approved', quiz_answers_v2: { answers: { goal: 'Validate demand' } } }],
    icp_analysis_results: [], pmf_analysis_results: [], mvp_projects: [], gtm_plans: [], demo_studio_projects: [], traction_engine_sprints: [],
  };
  from(table: string) {
    assert.ok(table in this.tables, `Unexpected table/action: ${table}`);
    this.reads.push(table);
    const filters: ((row: Record<string, any>) => boolean)[] = [];
    let insert: Record<string, any> | undefined, update: Record<string, any> | undefined, descending = false, limit = Infinity;
    const execute = () => {
      if (this.failures.has(table)) return { data: [], error: { message: 'Synthetic unavailable source' } };
      if (insert) this.tables[table].push({ ...insert, id: `row-${this.tables[table].length}`, created_at: this.tables[table].length });
      let rows = this.tables[table].filter(row => filters.every(filter => filter(row)));
      if (update) rows.forEach(row => Object.assign(row, update));
      if (descending) rows = [...rows].reverse();
      return { data: rows.slice(0, limit), error: null };
    };
    const query = {
      select: (_fields: string) => query,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query; },
      is: (key: string, value: unknown) => { filters.push(row => (row[key] ?? null) === value); return query; },
      contains: (key: string, value: Record<string, unknown>) => { filters.push(row => Object.entries(value).every(([k, v]) => JSON.stringify(row[key]?.[k]) === JSON.stringify(v))); return query; },
      order: (_key: string, opts: { ascending: boolean }) => { descending = !opts.ascending; return query; },
      limit: (value: number) => { limit = value; return query; },
      insert: (value: Record<string, any>) => { insert = value; return query; },
      update: (value: Record<string, any>) => { update = value; return query; },
      maybeSingle: async () => {
        const result = execute();
        if (result.data.length > 1) return { data: null, error: { message: 'More than one current result' } };
        return { ...result, data: result.data[0] ?? null };
      },
      then: (resolve: (value: ReturnType<typeof execute>) => unknown) => Promise.resolve(execute()).then(resolve),
    };
    return query;
  }
}
