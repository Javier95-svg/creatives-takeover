import { supabase } from '@/integrations/supabase/client';
import { canonicalTool, toolForPath } from '../../supabase/functions/_shared/roadmap-retention.ts';

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
