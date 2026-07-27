import { supabase } from '@/integrations/supabase/client';
import {
  getPmfDecisionAction,
  type PmfDecisionActionInput,
} from '@/lib/pmfDecisionAction';

export async function syncPmfDecisionAction(input: PmfDecisionActionInput): Promise<string | null> {
  const action = getPmfDecisionAction(input);
  const { data, error } = await (supabase as any).rpc('sync_pmf_decision_daily_task_v1', {
    p_analysis_id: input.analysisId,
    p_task_text: action.title,
    p_task_description: action.description,
    p_source_route: action.route,
  });

  if (error) throw error;
  return typeof data === 'string' ? data : null;
}
