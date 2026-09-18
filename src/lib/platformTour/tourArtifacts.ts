import { FOUNDER_TOOL_CATALOG, type FounderToolDefinition } from '../../config/founderToolCatalog.ts';
import { PLATFORM_TOUR_FIXTURE } from './tourFixture.ts';

export type TourArtifactStatus = 'complete' | 'in_progress' | 'locked';

/**
 * Where the seeded founder stands on a given tool.
 *
 * Derived from the stage numbers rather than stored, so a tool added to
 * FOUNDER_TOOL_CATALOG cannot leave a hole in the tour. Storing a hand-written
 * map was the alternative and it would have gone stale on the first catalog
 * change, which is exactly the kind of drift a visitor notices.
 */
export function tourArtifactStatus(tool: Pick<FounderToolDefinition, 'stageNumber'>): TourArtifactStatus {
  const current = PLATFORM_TOUR_FIXTURE.project.assignedStage;
  if (tool.stageNumber < current) return 'complete';
  if (tool.stageNumber === current) return 'in_progress';
  return 'locked';
}

export const TOUR_ARTIFACT_LABELS: Record<TourArtifactStatus, string> = {
  complete: 'Artifact saved',
  in_progress: 'In progress',
  locked: 'Later in the cycle',
};

/** Counts for the progress line, so the framing never contradicts the panels. */
export function tourArtifactTotals() {
  const counts: Record<TourArtifactStatus, number> = { complete: 0, in_progress: 0, locked: 0 };
  for (const tool of FOUNDER_TOOL_CATALOG) counts[tourArtifactStatus(tool)] += 1;
  return counts;
}
