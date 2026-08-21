import type { IcpDraftDocument, IcpDraftSectionEvidence } from "@/lib/icpBuilderSession";
// Relative with an explicit extension: this module is loaded directly by
// node:test, which does not resolve the "@/" alias.
import { fieldIsReal, rankedPainIsReal } from "./icpFieldProvenance.ts";

/**
 * A viability score for a generated ICP draft, shown beside the founder's idea.
 *
 * Deliberately a pure function of the draft rather than a second model call:
 * the same draft must always score the same, a reader who reloads must not see
 * the number move, and it has to work on drafts generated before this existed.
 *
 * The score has two halves, and the split matters:
 *
 *   viability - a judgement about the BUSINESS, reasoned by the draft generator
 *               across five dimensions it has to commit to explicitly.
 *   rigor     - how well-evidenced the draft is, which damps the verdict. A
 *               confident-sounding draft built on nothing cannot score high.
 *
 * The previous version had only the second half, and even that was mostly
 * constant: it credited any non-empty string, and the generator backfilled
 * every unanswered field with prose saying the field was unanswered. Problem
 * clarity scored a flat 3.00/3.00 on every draft ever produced, differentiation
 * had a floor of 2.10/3.00, and the reachable range was 4.7 to 9.0, so the
 * badge could not tell a founder their idea was weak. That is the one thing the
 * "Assess viability" call to action promises, so the number now reads the idea.
 *
 * Kept dependency-free so node:test can load it, matching heroFunnelRules.ts.
 */

export type ViabilityBand = "strong" | "promising" | "needsWork";

export interface ViabilityDriver {
  key: string;
  label: string;
  /** 0 - 1, normalized so drivers with different maximums stay comparable. */
  ratio: number;
}

export interface ViabilityScore {
  /** 1.0 - 10.0, one decimal. */
  score: number;
  band: ViabilityBand;
  label: string;
  /** One line naming the biggest driver, so the number is never unexplained. */
  summary: string;
  /** 0 - 1. The business judgement, before rigor damping. */
  viability: number;
  /** 0 - 1. How well-evidenced the draft is. */
  rigor: number;
  /** The lowest-scoring driver across both halves. */
  weakestDriver: ViabilityDriver;
  dimensions: ViabilityDriver[];
  pillars: ViabilityDriver[];
  /** Whether the draft carried a viability assessment, or predates it. */
  basis: "full" | "legacy";
  /** True when nothing citable was retrieved, which caps the score. */
  ungrounded: boolean;
}

const CONFIDENCE_WEIGHT: Record<IcpDraftSectionEvidence["confidence"], number> = {
  high: 1,
  medium: 0.55,
  low: 0.2,
};

/** Thresholds are inclusive at the lower bound: <5 needs work, 5-7.9 promising, 8+ strong. */
export const VIABILITY_THRESHOLDS = { promising: 5, strong: 8 } as const;

/**
 * Weights reflect what actually kills early companies. Pain severity and
 * willingness to pay lead because an unpaid non-problem cannot be rescued by a
 * good channel or a clever moat.
 */
const DIMENSION_WEIGHTS = {
  painSeverity: 0.28,
  willingnessToPay: 0.24,
  competitiveIntensity: 0.18,
  reachability: 0.16,
  founderEdge: 0.14,
} as const;

const DIMENSION_LABELS: Record<keyof typeof DIMENSION_WEIGHTS, string> = {
  painSeverity: "pain severity",
  willingnessToPay: "willingness to pay",
  competitiveIntensity: "an uncrowded niche",
  reachability: "reachability",
  founderEdge: "founder edge",
};

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

const PLACEHOLDER_HOSTS = new Set(["example.com", "example.org", "localhost"]);

/**
 * A citation only counts if a reader could actually open it. Shared with the
 * outcome contract so "authentic" means one thing across the codebase.
 */
export function isAuthenticIcpCitation(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "https:" || parsed.protocol === "http:")
      && !PLACEHOLDER_HOSTS.has(parsed.hostname.toLowerCase())
      && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export function countAuthenticSources(draft: IcpDraftDocument): number {
  return (draft.sources ?? []).filter((source) => isAuthenticIcpCitation(source.url)).length;
}

/** Only competitors we can link are evidence. An invented name is not. */
export function countLinkedCompetitors(draft: IcpDraftDocument): number {
  return (draft.competition?.directCompetitors ?? []).filter((competitor) =>
    isAuthenticIcpCitation(competitor.url),
  ).length;
}

function computeRigorPillars(draft: IcpDraftDocument): ViabilityDriver[] {
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
  const sourceCount = countAuthenticSources(draft);

  /*
   * When retrieval never ran, the citation term is dropped and the pillar is
   * rescaled rather than scored as a miss.
   *
   * Otherwise a platform-side gap (an unset or expired API credential) would
   * read to every founder as "no evidence exists for your idea", which is a
   * statement about our configuration, not their market. Only score the
   * absence of citations when we actually went looking.
   */
  const retrievalRan = draft.evidenceRetrieval !== "unavailable";
  const evidence = retrievalRan
    ? averageConfidence * 3 + (Math.min(sourceCount, 4) / 4) * 1
    : averageConfidence * 3 * (4 / 3);

  // Problem clarity: a sharp, triggered, costly pain is the strongest early
  // signal. Each term asks whether the field was actually answered, not whether
  // a string is present, because the generator pads every gap with prose.
  const answeredPains = [0, 1, 2].filter((index) => rankedPainIsReal(draft, index)).length;
  const clarity =
    (answeredPains / 3) * 1.2 +
    (fieldIsReal(draft, "pain.costOfInaction") ? 1 : 0) * 0.6 +
    (fieldIsReal(draft, "pain.triggerMoment") ? 1 : 0) * 0.6 +
    (fieldIsReal(draft, "decisionBrief.buyingTrigger") ? 1 : 0) * 0.6;

  /*
   * Differentiation: a named gap an incumbent leaves open.
   *
   * The competitor term counts only competitors we could link, which is
   * impossible when retrieval never ran. Left in, it would dock every founder
   * 0.9 of 3.0 for a credential they do not control, and "weakest on
   * differentiation" would become the new hardcoded verdict. Same treatment as
   * the citation term above: drop it and rescale rather than score it a miss.
   */
  const competitorCount = countLinkedCompetitors(draft);
  const namedGaps =
    (fieldIsReal(draft, "moat.whyHardToCopy") ? 1 : 0) * 0.8 +
    (fieldIsReal(draft, "moat.incumbentGap") ? 1 : 0) * 0.7 +
    (fieldIsReal(draft, "competition.exploitableGap") ? 1 : 0) * 0.6;
  const differentiation = retrievalRan
    ? namedGaps + (Math.min(competitorCount, 3) / 3) * 0.9
    : namedGaps * (3 / 2.1);

  return [
    { key: "evidence", label: "evidence", ratio: clamp(evidence / 4, 0, 1) },
    { key: "clarity", label: "problem clarity", ratio: clamp(clarity / 3, 0, 1) },
    { key: "differentiation", label: "differentiation", ratio: clamp(differentiation / 3, 0, 1) },
  ];
}

function computeDimensions(draft: IcpDraftDocument): ViabilityDriver[] | null {
  const assessment = draft.viabilityAssessment;
  if (!assessment) return null;
  return (Object.keys(DIMENSION_WEIGHTS) as Array<keyof typeof DIMENSION_WEIGHTS>).map((key) => {
    const raw = assessment[key]?.score;
    const score = typeof raw === "number" && Number.isFinite(raw) ? clamp(raw, 0, 100) : 0;
    return { key, label: DIMENSION_LABELS[key], ratio: score / 100 };
  });
}

export function computeViabilityScore(draft: IcpDraftDocument): ViabilityScore {
  const pillars = computeRigorPillars(draft);
  const rigor = (pillars[0].ratio * 4 + pillars[1].ratio * 3 + pillars[2].ratio * 3) / 10;
  const dimensions = computeDimensions(draft);
  // Only "ungrounded" if we searched and came back empty. If retrieval never
  // ran there is nothing for the founder to act on, so neither the cap nor the
  // warning applies.
  const ungrounded = draft.evidenceRetrieval !== "unavailable" && countAuthenticSources(draft) === 0;

  /*
   * Drafts generated before viabilityAssessment existed have no business
   * judgement to read. Scoring them on rigor alone is the honest fallback: it
   * is the same thing the old badge measured, so an archived draft keeps a
   * stable number rather than collapsing to 1.0.
   */
  const viability = dimensions
    ? dimensions.reduce(
        (total, dimension) => total + dimension.ratio * DIMENSION_WEIGHTS[dimension.key as keyof typeof DIMENSION_WEIGHTS],
        0,
      )
    : rigor;

  // Rigor never carries the score on its own, but it can hold a confident
  // verdict down to just over half its face value.
  const raw = 1 + 9 * viability * (0.55 + 0.45 * rigor);

  // Nothing retrieved means nothing corroborated, and an uncorroborated draft
  // has not earned "Strong" however good the idea sounds.
  const capped = ungrounded ? Math.min(raw, VIABILITY_THRESHOLDS.strong - 0.1) : raw;
  const score = Math.round(clamp(capped, 1, 10) * 10) / 10;
  const band = resolveViabilityBand(score);

  const drivers = dimensions ? [...dimensions, ...pillars] : pillars;
  const weakestDriver = drivers.reduce((low, driver) => (driver.ratio < low.ratio ? driver : low));

  return {
    score,
    band,
    label: BAND_LABELS[band],
    summary: buildSummary(band, weakestDriver, ungrounded),
    viability,
    rigor,
    weakestDriver,
    dimensions: dimensions ?? [],
    pillars,
    basis: dimensions ? "full" : "legacy",
    ungrounded,
  };
}

function buildSummary(band: ViabilityBand, weakest: ViabilityDriver, ungrounded: boolean): string {
  if (ungrounded) {
    return `No outside evidence was found, so the score is capped. Weakest on ${weakest.label}.`;
  }
  if (band === "strong") {
    return `Well evidenced across the board. ${sentenceCase(weakest.label)} is still the thinnest part.`;
  }
  return `Weakest on ${weakest.label}. Validate that first.`;
}

function sentenceCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
