import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { hasCategoryAccess, isUserType, type UserType, type ApprovalStatus } from '../../../src/lib/accountTypes.ts';
import { sanitizeRoleProfile } from '../../../src/lib/roleProfileSchema.ts';
import { pulseScope, type PulseScope } from '../../../src/lib/pulseScope.ts';
import { stageEvidence } from './pulse-evidence.ts';

export class PulseContextError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

type Data = Record<string, unknown>;
export type PulseSource = {
  table: string;
  state: 'available' | 'missing' | 'unavailable';
  id?: string;
  updatedAt?: string | null;
  data?: unknown;
  basis?: string;
};
export interface PulseContext {
  version: 1;
  scope: PulseScope;
  account: { userType: UserType; approvalStatus: ApprovalStatus; hasCategoryAccess: boolean; roleProfile: unknown };
  onboarding: { provenance: string; assignedStage: unknown; reportedStage: unknown; answers: unknown; challenge: unknown; timeline: unknown };
  activeProject: { id: string; title: string; ideaSummary: string | null } | null;
  outcomes: Record<string, PulseSource>;
  unavailableSources: string[];
}

// Budget each source independently. Never slice serialized JSON or let a large
// ICP consume the space reserved for PMF/MVP/GTM. Empty/false/zero remain facts.
export function compactPulseData(value: unknown, budget = 2800): unknown {
  let remaining = budget;
  const visit = (item: unknown, depth: number): unknown => {
    if (remaining <= 0 || depth > 8) return undefined;
    if (item === null || typeof item === 'boolean' || typeof item === 'number') { remaining -= 8; return item; }
    if (typeof item === 'string') {
      const length = Math.min(remaining, 650);
      const text = item.slice(0, length);
      remaining -= text.length + 8;
      return text.length < item.length ? `${text}… [excerpt]` : text;
    }
    if (Array.isArray(item)) return item.slice(0, 8).map(part => visit(part, depth + 1)).filter(part => part !== undefined);
    if (item && typeof item === 'object') {
      const result: Data = {};
      for (const [key, part] of Object.entries(item).slice(0, 24)) {
        if (remaining < key.length + 12) break;
        remaining -= key.length + 8;
        const parsed = visit(part, depth + 1);
        if (parsed !== undefined) result[key] = parsed;
      }
      return result;
    }
    return undefined;
  };
  return visit(value, 0) ?? null;
}

const STAGES = [
  { key: 'icp', table: 'icp_analysis_results', owner: 'user_id', fields: 'target_audience,business_description,verdict,industry,analysis_data' },
  { key: 'pmf', table: 'pmf_analysis_results', owner: 'user_id', fields: 'pmf_score,verdict,target_market,industry,analysis_data' },
  { key: 'mvp', table: 'mvp_projects', owner: 'user_id', fields: 'title,project_type,deployment_status,metadata' },
  { key: 'gtm', table: 'gtm_plans', owner: 'user_id', fields: 'plan_title,status,plan_content' },
  { key: 'demo', table: 'demo_studio_projects', owner: 'owner_id', fields: 'name,tagline,category,launch_published' },
  { key: 'traction', table: 'traction_engine_sprints', owner: 'user_id', fields: 'channel,status,summary_recommendation' },
] as const;

export async function resolvePulseContext(db: SupabaseClient, userId: string, projectId: string | null): Promise<PulseContext> {
  const { data: profile, error } = await db.from('profiles')
    .select('user_type,approval_status,role_profile,assigned_stage,business_stage,quiz_answers_v2,quiz_biggest_challenge,quiz_launch_timeline')
    .eq('id', userId).maybeSingle();
  if (error || !profile) throw new PulseContextError(503, 'Your account context is unavailable. Please retry.');
  const userType = profile.user_type ?? 'founder';
  const approval = profile.approval_status ?? 'approved';
  if (!isUserType(userType) || !['pending', 'approved', 'rejected'].includes(approval)) {
    throw new PulseContextError(503, 'Your account context could not be verified.');
  }
  const founder = userType === 'founder' || userType === 'builder';
  if (!founder && projectId) throw new PulseContextError(403, 'This account uses an account-level Pulse conversation.');
  const context: PulseContext = {
    version: 1, scope: pulseScope(userType, projectId),
    account: { userType, approvalStatus: approval as ApprovalStatus,
      hasCategoryAccess: hasCategoryAccess(userType, approval as ApprovalStatus),
      roleProfile: compactPulseData(sanitizeRoleProfile(userType, profile.role_profile as Data), 1800) },
    onboarding: {
      provenance: 'Account-level stated preferences and quiz placement, not proof of progress in the selected project.',
      assignedStage: founder ? profile.assigned_stage ?? null : null,
      reportedStage: founder ? profile.business_stage ?? null : null,
      answers: compactPulseData(profile.quiz_answers_v2, 3000),
      challenge: compactPulseData(profile.quiz_biggest_challenge, 300),
      timeline: compactPulseData(profile.quiz_launch_timeline, 200),
    },
    activeProject: null, outcomes: {}, unavailableSources: [],
  };
  if (!projectId) return context;
  const { data: project, error: projectError } = await db.from('projects')
    .select('id,title,idea_summary').eq('id', projectId).eq('user_id', userId).is('archived_at', null).maybeSingle();
  if (projectError) throw new PulseContextError(503, 'The selected project could not be loaded.');
  if (!project) throw new PulseContextError(404, 'The selected project is unavailable. Choose an active project.');
  context.activeProject = { id: project.id, title: String(project.title ?? '').slice(0, 160), ideaSummary: typeof project.idea_summary === 'string' ? project.idea_summary.slice(0, 1000) : null };

  // These are the same owner/project/current-outcome predicates used by
  // project_outcomes, but read the actual records instead of only their IDs.
  const results = await Promise.all(STAGES.map(async source => {
    try {
      const { data, error } = await db.from(source.table)
        .select(`id,updated_at,${source.fields}`).eq(source.owner, userId)
        .eq('project_id', projectId).is('superseded_at', null).maybeSingle();
      if (error) return [source.key, { table: source.table, state: 'unavailable' }] as const;
      if (!data) return [source.key, { table: source.table, state: 'missing' }] as const;
      const row = data as unknown as Data;
      const { id, updated_at, ...facts } = row;
      if (source.key === 'mvp') {
        const metadata = facts.metadata as Data | null;
        const setup = metadata?.setupInput as Data | null;
        const keys = ['productName', 'oneLineDescription', 'validatedProblemStatement', 'validatedTargetSegment', 'keyPainLanguage', 'coreCustomer', 'coreJob', 'successEvent', 'essentialFeatures', 'buildEvidenceMode'];
        facts.metadata = { framework: metadata?.framework,
          intendedSetup: Object.fromEntries(keys.filter(key => setup?.[key] !== undefined).map(key => [key, setup![key]])) };
      }
      const evidence = stageEvidence(source.key, facts);
      const fields = Object.entries(evidence.fields).filter(([, value]) => value !== undefined);
      const fieldBudget = Math.floor(4000 / Math.max(fields.length, 1));
      return [source.key, { table: source.table, state: 'available', id: String(id), updatedAt: typeof updated_at === 'string' ? updated_at : null,
        basis: evidence.basis, data: Object.fromEntries(fields.map(([key, value]) => [key, compactPulseData(value, ['plays', 'sectionProvenance', 'intendedSetup'].includes(key) ? 1400 : fieldBudget)])) }] as const;
    } catch {
      return [source.key, { table: source.table, state: 'unavailable' }] as const;
    }
  }));
  context.outcomes = Object.fromEntries(results);
  context.unavailableSources = results.filter(([, source]) => source.state === 'unavailable').map(([key]) => key);
  return context;
}

const ROLE_GUIDANCE: Record<UserType, string> = {
  founder: 'Help this founder use customer evidence, validate assumptions, execute and grow the selected project.',
  builder: 'Help this builder define and deliver a practical implementation using the selected project, technical constraints and prior evidence. Do not assume fundraising is their goal.',
  mentor: 'Help this mentor with expertise, mentoring work and bookings. Do not treat them as a founder building a startup or claim access to client work or booking details not provided.',
  marketplace: 'Help this service provider with their offering, positioning, capacity and enquiries. Do not treat them as a founder or invent listing/enquiry details.',
  investor: 'Help this investor using their investment focus, geography, stages and activity. Do not treat them as a founder or claim access to private founder records or match details.',
};

export function pulseRoleGuidance(context: PulseContext): string {
  return `${ROLE_GUIDANCE[context.account.userType]} ${context.account.hasCategoryAccess ? '' : 'Category access is awaiting approval or rejected. Do not recommend restricted category actions or imply approval.'}`;
}
