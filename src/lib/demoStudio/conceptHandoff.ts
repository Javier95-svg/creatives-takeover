import { createJourneyHandoff, upsertJourneyOutcome } from '@/lib/journeyOutcomes';
import type { DemoStudioProject } from './types';

/** Retriable bookkeeping after publication; it never republishes or spends credits. */
export async function prepareConceptValidation(project: DemoStudioProject) {
  if (!project.validation_context_id) throw new Error('Choose an ICP context before starting validation.');
  const result = await upsertJourneyOutcome({
    userId: project.owner_id, tool: 'demo_studio', artifactType: 'concept_page',
    artifactId: project.id, artifactVersion: project.updated_at,
    validationContextId: project.validation_context_id, status: 'ready',
  });
  const outcomeId = (result.outcome as { id?: string } | null)?.id;
  if (!outcomeId || !['ready', 'verified'].includes(result.evaluation.status)) {
    throw new Error('Review the concept page publication requirements before starting validation.');
  }
  const params = new URLSearchParams({ context: project.validation_context_id, project: project.id, mode: 'discover', concept: project.id });
  const handoff = await createJourneyHandoff({
    sourceOutcomeId: outcomeId, destinationTool: 'pmf_lab',
    payload: {
      validationContextId: project.validation_context_id,
      icpAnalysisId: project.source_icp_analysis_id ?? null,
      demoProjectId: project.id, demoId: null, conceptPageId: project.id,
      sourceArtifactId: project.id, sourceArtifactVersion: project.updated_at,
      destinationRoute: `/pmf-lab?${params}`,
    },
    idempotencyKey: `concept:${project.id}:pmf`,
  });
  params.set('handoff', handoff.id);
  return `/pmf-lab?${params}`;
}
