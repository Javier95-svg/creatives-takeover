import { WORKSPACE_ROUTES } from './workspaceNavigation.ts';

/**
 * The Builder path: from an idea to a validated project, in three steps. A
 * Builder sees the same sidebar as a Founder; this is what tells them which
 * three tools matter first and which one is next.
 *
 * Every step is completed by saved work, never by a click: an idea chosen in
 * Decision Sprint, and the BizMap Identity and Validating stages (a ready ICP
 * Builder brief, a ready PMF Lab result). Once all three are done the idea is a
 * project, which is when a Builder is offered the move to Founder.
 */

export type BuilderStepKey = 'explore' | 'define' | 'validate';

export interface BuilderStep {
  key: BuilderStepKey;
  label: string;
  title: string;
  tool: string;
  route: string;
}

export const BUILDER_STEPS: readonly BuilderStep[] = [
  { key: 'explore', label: 'Explore', title: 'Pick the idea to test', tool: 'Decision Sprint', route: '/decision-sprint' },
  { key: 'define', label: 'Define', title: 'Define who it is for', tool: 'ICP Builder', route: WORKSPACE_ROUTES['ICP Builder'] },
  { key: 'validate', label: 'Validate', title: 'Test it with real people', tool: 'PMF Lab', route: WORKSPACE_ROUTES['PMF Lab'] },
];

export interface BuilderPathEvidence {
  /** Decision Sprint has a chosen idea. */
  ideaChosen: boolean;
  /** BizMap Identity stage complete (a ready ICP Builder brief). */
  customerDefined: boolean;
  /** BizMap Validating stage complete (a ready PMF Lab result). */
  validated: boolean;
}

export function builderPath(evidence: BuilderPathEvidence) {
  const done: Record<BuilderStepKey, boolean> = {
    // Defining a customer or testing with people means an idea was picked.
    explore: evidence.ideaChosen || evidence.customerDefined || evidence.validated,
    define: evidence.customerDefined,
    validate: evidence.validated,
  };
  const next = BUILDER_STEPS.find((step) => !done[step.key]) ?? null;
  return {
    steps: BUILDER_STEPS.map((step) => ({ ...step, done: done[step.key], current: next?.key === step.key })),
    next,
    doneCount: BUILDER_STEPS.filter((step) => done[step.key]).length,
    /** All three done: the idea is a validated project. */
    complete: next === null,
  };
}

/** Decision Sprint keeps its draft in user_preferences.validationDraft. */
export function hasChosenIdea(preferences: unknown): boolean {
  const draft = (preferences as { validationDraft?: { chosenIdeaId?: unknown } } | null)?.validationDraft;
  return typeof draft?.chosenIdeaId === 'string' && draft.chosenIdeaId.length > 0;
}
