import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { compactPulseData, resolvePulseContext, type PulseContext, type PulseSource } from './pulse-context.ts';

/**
 * What a founder has already saved for a project, for a tool's AI prompt.
 *
 * Project memory plan, phase 1 (2026-11-22). Before this, each tool built its
 * prompt from what the browser happened to send, so founders re-explained the
 * customer, problem and decisions in every tool. This reuses the Pulse context
 * (the project's current result from each tool, its stated focus, the
 * founder's saved notes and tool-recorded assumptions, each labelled with how
 * far it is proven) and picks the parts each tool needs, within a size budget.
 *
 * It never throws and never blocks a generation: no project, a failed read or
 * a non-founder account simply returns null and the tool works as before.
 */

export type ProjectContextPurpose = 'pmf_scoring' | 'demo_copy' | 'gtm_plan' | 'mvp_build' | 'first_customer';
type SourceKey = 'icp' | 'pmf' | 'mvp' | 'gtm' | 'demo' | 'traction' | 'research';

// A tool never reads its own earlier result here (a PMF score must not lean on
// the last PMF score), only what the other stages produced.
const SOURCES: Record<ProjectContextPurpose, SourceKey[]> = {
  pmf_scoring: ['icp', 'demo'],
  demo_copy: ['icp', 'pmf', 'gtm'],
  gtm_plan: ['icp', 'pmf', 'mvp', 'demo', 'traction', 'research'],
  mvp_build: ['icp', 'pmf', 'gtm', 'demo'],
  first_customer: ['icp', 'pmf', 'gtm'],
};

const LABEL: Record<SourceKey, string> = {
  icp: 'ICP draft (ICP Builder)',
  pmf: 'PMF result (PMF Lab)',
  mvp: 'MVP scope (MVP Builder)',
  gtm: 'Go-to-market plan (GTM Strategist)',
  demo: 'Demo page (Demo Studio)',
  traction: 'Traction sprint (Traction Engine)',
  research: 'Customer research (GTM Strategist, Find customers)',
};

/** Characters for the whole block; roughly a quarter as many tokens. */
export const PROJECT_CONTEXT_BUDGET: Record<ProjectContextPurpose, number> = {
  pmf_scoring: 3500,
  demo_copy: 3500,
  gtm_plan: 6000,
  mvp_build: 5000,
  first_customer: 2500,
};

export interface ProjectContextHints {
  /** A workspace project the request names; used only if the user owns it. */
  projectId?: string | null;
  icpAnalysisId?: string | null;
  demoProjectId?: string | null;
  gtmPlanId?: string | null;
  mvpProjectId?: string | null;
}

export interface ProjectContextBlock {
  projectId: string;
  text: string;
  /** The stages that contributed, for logs and tests. */
  sources: string[];
}

// Functions import different supabase-js versions; any client with .from works.
// deno-lint-ignore no-explicit-any
type Db = { from: (relation: string) => any };
const isId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);

async function projectOf(db: Db, table: string, ownerColumn: string, id: string, userId: string): Promise<string | null> {
  const { data } = await db.from(table).select('project_id').eq('id', id).eq(ownerColumn, userId).maybeSingle();
  const projectId = (data as { project_id?: unknown } | null)?.project_id;
  return isId(projectId) ? projectId : null;
}

/**
 * The project a request is about: the project of a result it names, then a
 * project it names, then the founder's most recently used project (the same
 * rule ensure_active_project uses to file new results, so reads and writes agree).
 */
export async function resolveProjectId(db: Db, userId: string, hints: ProjectContextHints = {}): Promise<string | null> {
  const owned: Array<[string, string, string | null | undefined]> = [
    ['icp_analysis_results', 'user_id', hints.icpAnalysisId],
    ['demo_studio_projects', 'owner_id', hints.demoProjectId],
    ['gtm_plans', 'user_id', hints.gtmPlanId],
    ['mvp_projects', 'user_id', hints.mvpProjectId],
  ];
  for (const [table, owner, id] of owned) {
    if (!isId(id)) continue;
    const projectId = await projectOf(db, table, owner, id, userId);
    if (projectId) return projectId;
  }
  if (isId(hints.projectId)) {
    const { data } = await db.from('projects').select('id').eq('id', hints.projectId).eq('user_id', userId).is('archived_at', null).maybeSingle();
    if (data) return hints.projectId;
  }
  const { data } = await db.from('projects').select('id')
    .eq('user_id', userId).is('archived_at', null)
    .order('last_run_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle();
  const fallback = (data as { id?: unknown } | null)?.id;
  return isId(fallback) ? fallback : null;
}

const json = (value: unknown, budget: number) => JSON.stringify(compactPulseData(value, budget));

/**
 * Turns a Pulse context into the prompt block for one tool. Pure, for tests.
 * The whole block, header and labels included, stays within the budget: the
 * sections shrink until it fits, and only then are trailing lines dropped.
 */
export function formatProjectContext(context: PulseContext, purpose: ProjectContextPurpose, budget = PROJECT_CONTEXT_BUDGET[purpose]): { text: string; sources: string[] } | null {
  let built = buildProjectContext(context, purpose, budget);
  for (let scale = 0.85; built && built.text.length > budget && scale > 0.2; scale *= 0.85) {
    built = buildProjectContext(context, purpose, Math.floor(budget * scale));
  }
  if (built && built.text.length > budget) {
    const lines = built.text.split('\n');
    while (lines.length > 1 && lines.join('\n').length > budget) lines.pop();
    built = { ...built, text: lines.join('\n') };
  }
  return built;
}

function buildProjectContext(context: PulseContext, purpose: ProjectContextPurpose, budget: number): { text: string; sources: string[] } | null {
  const project = context.activeProject;
  if (!project) return null;
  const available = SOURCES[purpose]
    .map((key) => [key, context.outcomes[key]] as const)
    .filter((entry): entry is readonly [SourceKey, PulseSource] => entry[1]?.state === 'available');
  const memory = context.memory;
  const notes = memory?.items ?? [];
  const assumptions = memory?.assumptions?.items ?? [];

  // Roughly: a fifth for the project and its stated focus, three fifths for
  // the stages, the rest for saved notes and assumptions.
  const stageBudget = available.length ? Math.floor((budget * 0.6) / available.length) : 0;
  const lines: string[] = [
    'PROJECT CONTEXT: what this founder has already saved in Creatives Takeover for this project.',
    'Use it so the output fits their startup and they do not have to repeat themselves. It is background, not evidence:',
    'each part states how far it is proven ("basis"). Never present a hypothesis, plan or founder statement as validated,',
    'never cite it as research, and when it conflicts with what the founder typed for this request, follow the request.',
    '',
    `Project: ${project.title}${project.ideaSummary ? ` | ${project.ideaSummary.slice(0, 400)}` : ''}`,
  ];
  if (project.statedFocus) {
    lines.push(`Stated focus (basis: ${project.statedFocus.provenance}): ${json({ answers: project.statedFocus.answers, stage: project.statedFocus.stage }, Math.floor(budget * 0.15))}`);
  }
  for (const [key, source] of available) {
    lines.push('', `${LABEL[key]} (basis: ${source.basis ?? 'saved result'}):`, json(source.data, stageBudget));
  }
  if (notes.length) {
    lines.push('', `Decision history (basis: ${memory!.provenance}):`);
    let room = Math.floor(budget * 0.12);
    for (const note of notes) {
      const tags = [note.source ?? 'pulse', note.evidence, note.scope === 'account' ? 'account-wide' : null].filter(Boolean).join(', ');
      const line = `- ${note.kind} [${tags}]: ${note.text}`;
      if (room - line.length < 0) break;
      room -= line.length;
      lines.push(line);
    }
  }
  const pending = memory?.pendingReview ?? [];
  if (pending.length) {
    lines.push('', 'Not settled: a tool result disagrees with the founder\'s own call on these. Do not treat either side as decided:');
    for (const item of pending.slice(0, 3)) lines.push(`- [${item.source ?? 'pulse'}] ${item.text}`);
  }
  if (assumptions.length) {
    lines.push('', `Assumptions recorded by CT tools (basis: ${memory!.assumptions!.provenance}):`);
    let room = Math.floor(budget * 0.08);
    for (const item of assumptions) {
      const line = `- [${item.status}] ${item.statement}`;
      if (room - line.length < 0) break;
      room -= line.length;
      lines.push(line);
    }
  }
  const sources = [...available.map(([key]) => key), ...(notes.length ? ['memory'] : []), ...(assumptions.length ? ['assumptions'] : [])];
  if (!sources.length && !project.statedFocus && !project.ideaSummary) return null;
  return { text: lines.join('\n'), sources };
}

export async function loadProjectContext(db: Db, userId: string, purpose: ProjectContextPurpose, hints: ProjectContextHints = {}): Promise<ProjectContextBlock | null> {
  try {
    const projectId = await resolveProjectId(db, userId, hints);
    if (!projectId) return null;
    const context = await resolvePulseContext(db as unknown as SupabaseClient, userId, projectId);
    const formatted = formatProjectContext(context, purpose);
    if (!formatted) return null;
    console.log('[project-context]', JSON.stringify({ purpose, projectId, sources: formatted.sources, chars: formatted.text.length }));
    return { projectId, ...formatted };
  } catch (error) {
    console.warn('[project-context] unavailable; continuing without it', { purpose, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
