// Pure stage vocabulary shared by browser and email workers.
export const BIZMAP_STAGE_ORDER = [
  'IDENTITY', 'PROTOTYPE', 'VALIDATING', 'BUILDING', 'LAUNCH', 'TRACTION', 'FUNDRAISING',
] as const;
export type BizMapStage = (typeof BIZMAP_STAGE_ORDER)[number];

/** How the seven stages are named where a person reads them, in cycle order. */
export const FOUNDER_STAGE_LABELS = [
  'Identity', 'Prototyping', 'Validation', 'Building', 'Launch', 'Traction', 'Fundraise',
] as const;

/**
 * The label for a quiz-assigned stage, 1 to 7.
 *
 * Profiles used to title-case the free-text business_stage column, which is why
 * they showed things like "Growing" and "Scaling". That column is unvalidated
 * and holds ten different values in production, none of them a cycle stage.
 * assigned_stage is the quiz's placement and is the only trustworthy source.
 */
export function founderStageLabel(assignedStage: number | null | undefined) {
  if (typeof assignedStage !== 'number') return null;
  return FOUNDER_STAGE_LABELS[assignedStage - 1] ?? null;
}
