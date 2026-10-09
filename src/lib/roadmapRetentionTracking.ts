import { supabase } from '@/integrations/supabase/client';
import { canonicalTool, toolForPath } from '../../supabase/functions/_shared/roadmap-retention.ts';
import { sectionForPath } from './workspaceSections.ts';
import { getAnalyticsConsent, getConsentDecision, hasAnalyticsConsent } from './consent.ts';
import type { SectionTimeTarget } from './sectionTime.ts';

// Essential first party product state, independent of third party analytics delivery.
export async function recordRoadmapActivity(input: { tool?: string; status?: 'opened' | 'progress' | 'completed'; projectId?: string | null; step?: string | null } = {}) {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  const search = window.location.search;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  const tool = input.tool ? canonicalTool(input.tool) : toolForPath(path);
  const params = new URLSearchParams(search);
  const emailId = params.get('retention_email_id');
  const { error } = await supabase.rpc('record_roadmap_activity' as never, {
    p_path: path + search,
    p_tool: tool?.key ?? null,
    p_status: input.status ?? null,
    p_project_id: input.projectId ?? (/^\/icp\/draft\/([^/]+)$/.exec(path)?.[1] ?? null),
    p_step: input.step ?? null,
    p_email_id: emailId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(emailId) ? emailId : null,
  } as never);
  if (error) console.warn('Roadmap activity could not be recorded', error.code);
}

/**
 * One row per account, section and day (visits counted), for the admin adoption
 * report. First-party and independent of cookie consent, like the tool activity
 * above, and it covers sections with no tool events: Network, Community, Content.
 */
export async function recordSectionVisit(path: string) {
  const match = sectionForPath(path);
  if (!match) return;
  const { error } = await supabase.rpc('record_section_visit' as never, { p_section: match.section, p_tool: match.tool ?? '' } as never);
  if (error) console.warn('Section visit could not be recorded', error.code);
}

/**
 * Active seconds in a section, from the consent-gated timer in sectionTime.ts.
 * The server also refuses it unless the account's latest choice is Accept.
 */
export async function recordSectionTime(target: SectionTimeTarget, seconds: number) {
  if (!hasAnalyticsConsent()) return;
  const { error } = await supabase.rpc('record_section_time' as never, { p_section: target.section, p_tool: target.tool, p_seconds: seconds } as never);
  if (error) console.warn('Section time could not be recorded', error.code);
}

let syncedConsent: string | null = null;

/**
 * Saves the account's cookie choice, so the adoption report can show how many
 * active accounts its time figures cover. Called on sign-in and on every change.
 */
export async function syncConsentToAccount(userId: string) {
  const decision = getAnalyticsConsent() === 'unknown' ? null : getConsentDecision();
  if (!decision) return;
  const key = `${userId}:${decision.status}:${decision.decidedAt}`;
  if (key === syncedConsent) return;
  syncedConsent = key;
  const { error } = await supabase.rpc('record_analytics_consent' as never, {
    p_status: decision.status, p_version: decision.version, p_decided_at: decision.decidedAt,
  } as never);
  if (error) {
    syncedConsent = null;
    console.warn('Cookie choice could not be saved to the account', error.code);
  }
}

export function recordRoadmapAnalyticsEvent(name: string, props: Record<string, unknown> = {}) {
  if (!['tool_opened', 'tool_output_created', 'icp_builder_step_completed'].includes(name)) return;
  const tool = typeof props.tool === 'string' ? props.tool : name.startsWith('icp_') ? 'icp_builder' : null;
  if (!tool) return;
  const stepNames: Record<string, string> = {
    fast_input: 'your idea description', guided_seed: 'your business idea',
    guided_persona: 'your customer description', guided_workaround: 'your customer alternatives',
  };
  // Output generation is progress. Only persisted outcome evaluation completes work.
  void recordRoadmapActivity({ tool, status: name === 'tool_opened' ? 'opened' : 'progress',
    projectId: typeof props.artifact_id === 'string' ? props.artifact_id : null,
    step: typeof props.step_name === 'string' ? stepNames[props.step_name] ?? props.step_name : null,
  }).catch(() => { /* Telemetry must not interrupt product work. */ });
}
