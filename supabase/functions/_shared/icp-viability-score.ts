/**
 * Server-side twin of src/lib/icpViabilityScore.ts.
 *
 * It exists so `icp_analysis_results.niche_score` and the badge the founder
 * sees can never disagree. They used to: the stored score was an 82/64/41
 * ladder derived from a single confidence token while the badge ran this
 * formula, so the same draft carried two different verdicts.
 *
 * Edge functions cannot import from src/, so the logic is duplicated rather
 * than shared. tests/icp-viability-parity.test.ts runs both implementations
 * over the same fixture matrix and fails if any score diverges, which guards
 * the duplication far better than comparing source text would.
 *
 * It carries the same legacy-artifact fallback as the client copy, because
 * claiming a guest artifact generated before this shipped runs the stored
 * document back through here. Without the fallback those drafts would score
 * every field as unanswered and land a materially lower stored score than the
 * badge beside them, which is the exact divergence this file exists to remove.
 */

import type { DraftDocument, ViabilityAssessment } from "./icp-draft.ts";

/**
 * Backfill sentences as of the release that introduced provenance tracking.
 *
 * FROZEN HISTORICAL SNAPSHOT. Mirrors src/lib/icpFieldProvenance.ts. Do not
 * update it when the generator's fallback wording changes: drafts written after
 * that release carry their own provenance map and never reach this path, and
 * drafts written before it contain exactly these strings forever.
 */
const LEGACY_FALLBACK_STRINGS: ReadonlySet<string> = new Set([
  "The best-fit early customer still needs to be narrowed.",
  "Adjacent customers without the same urgent trigger are not the first segment to serve.",
  "The primary pain still needs direct customer language.",
  "Secondary pain 2 still needs interview evidence.",
  "Secondary pain 3 still needs interview evidence.",
  "The buying trigger still needs validation.",
  "The current manual or competing alternative still needs to be named in interviews.",
  "The trigger moment still needs a clearer founder example.",
  "The cost of leaving this pain unsolved still needs to be made explicit.",
  "Why this advantage is hard to copy still needs stronger proof.",
  "The incumbent gap still needs to be stated more sharply.",
  "The exploitable competitive gap still needs clearer founder or market evidence.",
]);

export type ViabilityBand = "strong" | "promising" | "needsWork";

export interface ServerViabilityScore {
  score: number;
  band: ViabilityBand;
  label: string;
  viability: number;
  rigor: number;
  ungrounded: boolean;
}

const CONFIDENCE_WEIGHT: Record<"high" | "medium" | "low", number> = {
  high: 1,
  medium: 0.55,
  low: 0.2,
};

export const VIABILITY_THRESHOLDS = { promising: 5, strong: 8 } as const;

const DIMENSION_WEIGHTS = {
  painSeverity: 0.28,
  willingnessToPay: 0.24,
  competitiveIntensity: 0.18,
  reachability: 0.16,
  founderEdge: 0.14,
} as const;

const BAND_LABELS: Record<ViabilityBand, string> = {
  strong: "Strong",
  promising: "Promising",
  needsWork: "Needs work",
};

const PLACEHOLDER_HOSTS = new Set(["example.com", "example.org", "localhost"]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isAuthenticCitation(url: string | null | undefined): boolean {
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

export function resolveViabilityBand(score: number): ViabilityBand {
  if (score >= VIABILITY_THRESHOLDS.strong) return "strong";
  if (score >= VIABILITY_THRESHOLDS.promising) return "promising";
  return "needsWork";
}

function readPath(draft: DraftDocument, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) return value[Number(segment)];
    if (typeof value === "object") return (value as Record<string, unknown>)[segment];
    return undefined;
  }, draft);
}

function isReal(draft: DraftDocument, path: string): boolean {
  const recorded = draft.fieldProvenance?.[path];
  if (recorded) return recorded === "model";

  // Legacy artifact: classify by matching the frozen backfill prose.
  const value = path.startsWith("decisionBrief.rankedPains.")
    ? readPath(draft, `${path}.pain`)
    : readPath(draft, path);
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return Boolean(trimmed) && !LEGACY_FALLBACK_STRINGS.has(trimmed);
}

export function computeIcpViabilityScore(draft: DraftDocument): ServerViabilityScore {
  const sections = [
    draft.customer.evidence,
    draft.pain.evidence,
    draft.build.evidence,
    draft.moat.evidence,
    draft.competition.evidence,
  ];

  const averageConfidence =
    sections.reduce((total, section) => total + (CONFIDENCE_WEIGHT[section.confidence] ?? 0.2), 0) /
    (sections.length || 1);
  const sourceCount = (draft.sources ?? []).filter((source) => isAuthenticCitation(source.url)).length;
  // See the client copy: a missing credential must not read as "no evidence
  // exists for your idea". Drop the citation term and rescale when retrieval
  // never ran, and only call a draft ungrounded if we actually searched.
  const retrievalRan = draft.evidenceRetrieval !== "unavailable";
  const evidencePillar = retrievalRan
    ? averageConfidence * 3 + (Math.min(sourceCount, 4) / 4) * 1
    : averageConfidence * 3 * (4 / 3);

  const answeredPains = [0, 1, 2].filter((index) => isReal(draft, `decisionBrief.rankedPains.${index}`)).length;
  const clarityPillar =
    (answeredPains / 3) * 1.2 +
    (isReal(draft, "pain.costOfInaction") ? 1 : 0) * 0.6 +
    (isReal(draft, "pain.triggerMoment") ? 1 : 0) * 0.6 +
    (isReal(draft, "decisionBrief.buyingTrigger") ? 1 : 0) * 0.6;

  const competitorCount = (draft.competition?.directCompetitors ?? []).filter((competitor) =>
    isAuthenticCitation(competitor.url),
  ).length;
  const differentiationPillar =
    (isReal(draft, "moat.whyHardToCopy") ? 1 : 0) * 0.8 +
    (isReal(draft, "moat.incumbentGap") ? 1 : 0) * 0.7 +
    (Math.min(competitorCount, 3) / 3) * 0.9 +
    (isReal(draft, "competition.exploitableGap") ? 1 : 0) * 0.6;

  const rigor =
    (clamp(evidencePillar / 4, 0, 1) * 4 +
      clamp(clarityPillar / 3, 0, 1) * 3 +
      clamp(differentiationPillar / 3, 0, 1) * 3) / 10;

  const assessment: ViabilityAssessment | undefined = draft.viabilityAssessment;
  const viability = assessment
    ? (Object.keys(DIMENSION_WEIGHTS) as Array<keyof typeof DIMENSION_WEIGHTS>).reduce((total, key) => {
        const raw = assessment[key]?.score;
        const value = typeof raw === "number" && Number.isFinite(raw) ? clamp(raw, 0, 100) : 0;
        return total + (value / 100) * DIMENSION_WEIGHTS[key];
      }, 0)
    : rigor;

  const ungrounded = retrievalRan && sourceCount === 0;
  const raw = 1 + 9 * viability * (0.55 + 0.45 * rigor);
  const capped = ungrounded ? Math.min(raw, VIABILITY_THRESHOLDS.strong - 0.1) : raw;
  const score = Math.round(clamp(capped, 1, 10) * 10) / 10;
  const band = resolveViabilityBand(score);

  return { score, band, label: BAND_LABELS[band], viability, rigor, ungrounded };
}
