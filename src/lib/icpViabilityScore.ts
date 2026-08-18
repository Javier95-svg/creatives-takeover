import type { IcpDraftDocument, IcpDraftSectionEvidence } from "@/lib/icpBuilderSession";

/**
 * A viability score for a generated ICP draft, shown beside the founder's idea.
 *
 * Deliberately a pure function of the draft rather than a second model call:
 * the same draft must always score the same, a reader who reloads must not see
 * the number move, and it has to work on drafts generated before this existed.
 *
 * What it actually measures is how well-evidenced and how sharply differentiated
 * the draft is right now - not whether the business will succeed, which nothing
 * can tell you at this stage. The copy beside it says so, because a number that
 * overclaims is worse than no number.
 *
 * Kept dependency-free so node:test can load it, matching heroFunnelRules.ts.
 */

export type ViabilityBand = "strong" | "promising" | "needsWork";

export interface ViabilityScore {
  /** 1.0 - 10.0, one decimal. */
  score: number;
  band: ViabilityBand;
  label: string;
  /** One line naming the biggest driver, so the number is never unexplained. */
  summary: string;
}

const CONFIDENCE_WEIGHT: Record<IcpDraftSectionEvidence["confidence"], number> = {
  high: 1,
  medium: 0.55,
  low: 0.2,
};

/** Thresholds are inclusive at the lower bound: <5 needs work, 5-7.9 promising, 8+ strong. */
export const VIABILITY_THRESHOLDS = { promising: 5, strong: 8 } as const;

function filled(value: string | null | undefined): number {
  return value && value.trim().length > 0 ? 1 : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resolveViabilityBand(score: number): ViabilityBand {
  if (score >= VIABILITY_THRESHOLDS.strong) return "strong";
  if (score >= VIABILITY_THRESHOLDS.promising) return "promising";
  return "needsWork";
}

const BAND_LABELS: Record<ViabilityBand, string> = {
  strong: "Strong",
  promising: "Promising",
  needsWork: "Needs work",
};

export function computeViabilityScore(draft: IcpDraftDocument): ViabilityScore {
  const sections: IcpDraftSectionEvidence[] = [
    draft.customer.evidence,
    draft.pain.evidence,
    draft.build.evidence,
    draft.moat.evidence,
    draft.competition.evidence,
  ];

  // Evidence: how much of the draft rests on something other than a guess.
  const averageConfidence =
    sections.reduce((total, section) => total + (CONFIDENCE_WEIGHT[section.confidence] ?? 0.2), 0) /
    (sections.length || 1);
  const sourceCount = draft.sources?.length ?? 0;
  const evidencePillar = averageConfidence * 3 + (Math.min(sourceCount, 4) / 4) * 1;

  // Problem clarity: a sharp, triggered, costly pain is the strongest early signal.
  const rankedPains = draft.decisionBrief?.rankedPains?.length ?? 0;
  const clarityPillar =
    (Math.min(rankedPains, 3) / 3) * 1.2 +
    filled(draft.pain.costOfInaction) * 0.6 +
    filled(draft.pain.triggerMoment) * 0.6 +
    filled(draft.decisionBrief?.buyingTrigger) * 0.6;

  // Differentiation: a named gap an incumbent leaves open.
  const competitorCount = draft.competition.directCompetitors?.length ?? 0;
  const differentiationPillar =
    filled(draft.moat.whyHardToCopy) * 0.8 +
    filled(draft.moat.incumbentGap) * 0.7 +
    (Math.min(competitorCount, 3) / 3) * 0.9 +
    filled(draft.competition.exploitableGap) * 0.6;

  // Each unanswered question is a real hole, but they must not sink the score
  // on their own - a draft can be honest about gaps and still be worth pursuing.
  const missingPenalty = Math.min((draft.confidence?.missingSignals?.length ?? 0) * 0.25, 1);

  const raw = evidencePillar + clarityPillar + differentiationPillar - missingPenalty;
  const score = Math.round(clamp(raw, 1, 10) * 10) / 10;
  const band = resolveViabilityBand(score);

  const pillars: Array<{ name: string; value: number; max: number }> = [
    { name: "evidence", value: evidencePillar, max: 4 },
    { name: "problem clarity", value: clarityPillar, max: 3 },
    { name: "differentiation", value: differentiationPillar, max: 3 },
  ];
  const weakest = pillars.reduce((low, pillar) =>
    pillar.value / pillar.max < low.value / low.max ? pillar : low,
  );

  return {
    score,
    band,
    label: BAND_LABELS[band],
    summary:
      band === "strong"
        ? "Well evidenced across customer, pain and differentiation."
        : `Weakest on ${weakest.name}. Validate that first.`,
  };
}
