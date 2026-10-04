import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { touchProject, useProjectOutcomes, useProjects, type Project, type ProjectOutcomes } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { loadIcpArtifactById, type ResolvedIcpSource } from '@/lib/icpHandoffSource';
import type { PmfVerdictSummary } from '@/lib/icpToGtmIntake';

// The project the founder is working in, with what the earlier stages already
// produced for it. Tools read this instead of "the latest row", so switching
// project in the workspace changes what every tool shows and pre-fills.

export interface ActiveProjectContext {
  projectId: string | null;
  project: Project | null;
  outcomes: ProjectOutcomes | null;
  /** The project's current ICP draft, when it has one. */
  icp: ResolvedIcpSource | null;
  /** Short customer line from the ICP, for "For {project} · Customer: …". */
  customerLine: string | null;
  pmf: (PmfVerdictSummary & { id: string }) | null;
  isLoading: boolean;
}

// Once per tab per project: make the server agree that this is the current
// project, so outputs written by edge functions land in it too.
const touchedThisSession = new Set<string>();

export function useActiveProjectContext(): ActiveProjectContext {
  const { user } = useAuth();
  const { activeProject, activeProjectId, isLoading: projectsLoading } = useProjects();
  const outcomesQuery = useProjectOutcomes(activeProjectId);
  const outcomes = outcomesQuery.data ?? null;
  const icpDraftId = outcomes?.icpDraftId ?? null;
  const pmfResultId = outcomes?.pmfResultId ?? null;

  useEffect(() => {
    if (!activeProjectId || touchedThisSession.has(activeProjectId)) return;
    touchedThisSession.add(activeProjectId);
    void touchProject(activeProjectId);
  }, [activeProjectId]);

  const icpQuery = useQuery({
    queryKey: ['project-icp', user?.id, icpDraftId],
    enabled: Boolean(user?.id && icpDraftId),
    staleTime: 60_000,
    queryFn: () => loadIcpArtifactById(user!.id, icpDraftId!),
  });

  const pmfQuery = useQuery({
    queryKey: ['project-pmf', pmfResultId],
    enabled: Boolean(pmfResultId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pmf_analysis_results')
        .select('id, verdict, pmf_score')
        .eq('id', pmfResultId!)
        .maybeSingle();
      if (error || !data) return null;
      return { id: data.id as string, verdict: (data.verdict as string | null) ?? null, score: data.pmf_score === null ? null : Number(data.pmf_score) };
    },
  });

  const icp = icpQuery.data ?? null;
  const customerLine = useMemo(() => {
    const doc = icp?.artifact.draftDocument;
    if (!doc) return null;
    const line = doc.decisionBrief?.primarySegment || doc.customer.roleLine || doc.gatePreview.roleLine || '';
    return line.trim() ? line.trim() : null;
  }, [icp]);

  return {
    projectId: activeProjectId,
    project: activeProject,
    outcomes,
    icp,
    customerLine,
    pmf: pmfQuery.data ?? null,
    isLoading: projectsLoading || outcomesQuery.isLoading || (Boolean(icpDraftId) && icpQuery.isLoading),
  };
}
