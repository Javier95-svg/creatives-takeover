import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import type { PublishedProofCase, PublishedProofMetric } from '@/types/proof';

const publicProofColumns = 'id,slug,public_name,company_name,segment,founder_stage,starting_assumption,actions_completed,evidence_summary,verification_mode,decision_changed,outcome_summary,published_at';

const mapProofCase = (row: any): PublishedProofCase => ({
  id: row.id,
  slug: row.slug,
  title: row.company_name ? `${row.public_name} · ${row.company_name}` : row.public_name,
  summary: row.segment,
  approved_public_identity: row.public_name,
  founder_stage: row.founder_stage,
  starting_assumption: row.starting_assumption,
  actions_completed: row.actions_completed ?? [],
  evidence_summary: Array.isArray(row.evidence_summary)
    ? row.evidence_summary.map((entry: unknown) => typeof entry === 'string' ? entry : JSON.stringify(entry)).join('\n')
    : typeof row.evidence_summary === 'string' ? row.evidence_summary : JSON.stringify(row.evidence_summary),
  verification_mode: row.verification_mode,
  decision_changed: row.decision_changed,
  external_outcome: row.outcome_summary,
  published_at: row.published_at,
});

export function usePublishedProofCases() {
  return useQuery({
    queryKey: ['published-proof-cases'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('published_proof_cases_v1')
        .select(publicProofColumns)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapProofCase);
    },
  });
}

export function usePublishedProofCase(slug?: string) {
  return useQuery({
    queryKey: ['published-proof-case', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('published_proof_cases_v1')
        .select(publicProofColumns)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data ? mapProofCase(data) : null;
    },
  });
}

export function usePublishedProofMetrics() {
  return useQuery({
    queryKey: ['published-proof-metrics'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('published_proof_metrics_v1')
        .select('id,label,value,cohort_label,period_start,period_end,denominator,source_systems,created_at')
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({ ...row, unit: 'number', published_at: row.created_at })) as PublishedProofMetric[];
    },
  });
}
