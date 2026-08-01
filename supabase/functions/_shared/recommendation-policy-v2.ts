export type RecommendationUrgency = "high" | "medium" | "low";

/** Founder-level pressure, derived from runway at onboarding. */
export type FounderUrgencyBand = "critical" | "high" | "moderate" | "stable";

/**
 * Families that move a founder closer to revenue, a customer, or a decision.
 * Under a short runway these outrank building and polish work.
 */
const REVENUE_PROXIMATE_FAMILIES = new Set([
  "gtm_strategist",
  "traction_engine",
  "icp_builder",
  "decision_sprint",
  "messages",
]);

/**
 * Valuable work that nonetheless spends runway before it returns any. Delayed,
 * not suppressed -- the tilt is bounded and never removes a candidate.
 */
const DEFERRABLE_UNDER_PRESSURE = new Set([
  "mvp_builder",
  "tech_stack",
  "demo_studio",
  "insighta_test",
]);

/**
 * Measured in base-rank steps, not raw score.
 *
 * Adjacent base ranks are 1/candidateCount apart, so a fixed score delta would
 * reorder a long candidate list and do nothing at all to a short one. Expressing
 * the tilt in rank steps makes it behave consistently for any list length.
 */
const URGENCY_TILT_RANK_STEPS: Record<FounderUrgencyBand, number> = {
  critical: 1,
  high: 0.5,
  moderate: 0.2,
  stable: 0,
};

/**
 * Immediate, prior-independent ranking bias from the founder's runway, in
 * base-rank steps. Multiply by the base step before adding it to a score.
 *
 * The collective priors only tell an urgent founder apart from a relaxed one
 * once a segment accumulates matured exposures, which takes weeks. This closes
 * that gap on day one. At 'critical' a revenue-proximate family gains one rank
 * and a deferrable one loses one, so the two can swap past each other, while
 * unclassified families stay exactly where the evidence put them.
 */
export function urgencyAdjustment(family: string, band: FounderUrgencyBand | null | undefined) {
  const tilt = band ? URGENCY_TILT_RANK_STEPS[band] ?? 0 : 0;
  if (!tilt) return 0;
  if (REVENUE_PROXIMATE_FAMILIES.has(family)) return tilt;
  if (DEFERRABLE_UNDER_PRESSURE.has(family)) return -tilt;
  return 0;
}

/**
 * Exploration trades a founder's next action for information. That trade is
 * not acceptable for someone weeks from running out of money.
 */
export function allowsExploration(band: FounderUrgencyBand | null | undefined) {
  return band !== "critical";
}

export interface LearningCandidate {
  key: string;
  urgency: RecommendationUrgency;
  reasonCodes: string[];
  estimatedMinutes: number;
  toolKey: string;
}

export interface LearningPrior {
  segment_key: string;
  recommendation_family: string;
  matured_exposures: number;
  unique_users: number;
  bayesian_mean: number;
  bayesian_lower_bound: number;
  posterior_variance: number;
  negative_rate: number;
}

export interface FamilyHealth {
  recommendation_family: string;
  status: "healthy" | "watch" | "critical" | "insufficient";
  current_negative_rate: number;
  reward_drift: number | null;
}

export interface RecentExposure {
  selected_tool_key: string;
  shown_at: string;
}

export interface LearningTuning {
  explorationPercent: number;
  explorationMinSamples: number;
  maxExplorationNegativeRate: number;
  frequencyWindowDays: number;
  frequencyCap: number;
  diversityWindowDays: number;
  repeatPenalty: number;
}

export interface FamilyEvidence {
  score: number;
  mean: number;
  uncertainty: number;
  samples: number;
  uniqueUsers: number;
  negativeRate: number;
  segment: string;
}

export interface FatigueDiagnostic {
  count: number;
  repeatedRecently: boolean;
  capped: boolean;
  penalty: number;
}

export interface RankedLearningResult {
  orderedCandidateKeys: string[];
  diagnostics: Record<string, unknown>;
}

export function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Ordered least- to most-specific. bestPriorByFamily and the SQL reader both
 * treat later entries as more specific, so new tiers may only be appended --
 * inserting or rewording an existing entry orphans every prior already
 * aggregated under the old key.
 *
 * Kept byte-compatible with public.recommendation_segment_keys_v1; the SQL
 * function writes the priors this function reads back.
 */
export function contextSegmentKeys(context: Record<string, unknown>): string[] {
  const stage = String(context.stage ?? "unknown");
  const goal = String(context.goal ?? "unknown");
  const blocker = String(context.blocker ?? "unknown");
  const capacity = String(context.capacityBand ?? "unknown");
  const plan = String(context.plan ?? "rookie");
  const urgency = String(context.urgencyBand ?? "unknown");
  const full = `stage:${stage}|goal:${goal}|blocker:${blocker}|capacity:${capacity}|plan:${plan}`;
  return [
    "global",
    `stage:${stage}`,
    `stage:${stage}|goal:${goal}`,
    `stage:${stage}|goal:${goal}|blocker:${blocker}`,
    full,
    `${full}|urgency:${urgency}`,
  ];
}

export function bestPriorByFamily(
  rows: LearningPrior[],
  segmentKeys: string[],
): Map<string, FamilyEvidence> {
  const specificity = new Map(segmentKeys.map((key, index) => [key, index]));
  const best = new Map<string, FamilyEvidence>();

  for (const row of rows) {
    const current = best.get(row.recommendation_family);
    const rowSpecificity = specificity.get(row.segment_key) ?? -1;
    const currentSpecificity = current ? specificity.get(current.segment) ?? -1 : -1;
    if (!current || rowSpecificity > currentSpecificity) {
      best.set(row.recommendation_family, {
        score: Number(row.bayesian_lower_bound) || 0,
        mean: Number(row.bayesian_mean) || 0,
        uncertainty: Math.sqrt(Math.max(0, Number(row.posterior_variance) || 0)),
        samples: Number(row.matured_exposures) || 0,
        uniqueUsers: Number(row.unique_users) || 0,
        negativeRate: Number(row.negative_rate) || 0,
        segment: row.segment_key,
      });
    }
  }

  return best;
}

function withinDays(isoDate: string, now: Date, days: number) {
  const timestamp = Date.parse(isoDate);
  return Number.isFinite(timestamp) && timestamp >= now.getTime() - days * 86_400_000;
}

export function fatigueForFamily(
  family: string,
  recentExposures: RecentExposure[],
  tuning: LearningTuning,
  now = new Date(),
): FatigueDiagnostic {
  const count = recentExposures.filter(
    (entry) =>
      entry.selected_tool_key === family
      && withinDays(entry.shown_at, now, tuning.frequencyWindowDays),
  ).length;
  const repeatedRecently = recentExposures.some(
    (entry) =>
      entry.selected_tool_key === family
      && withinDays(entry.shown_at, now, tuning.diversityWindowDays),
  );
  const capped = count >= tuning.frequencyCap;
  const rawPenalty = count * tuning.repeatPenalty + (repeatedRecently ? tuning.repeatPenalty : 0);

  return {
    count,
    repeatedRecently,
    capped,
    penalty: Math.min(0.45, Math.max(0, rawPenalty)),
  };
}

export function rankWithCollectiveEvidence(input: {
  candidates: LearningCandidate[];
  baseOrder: string[];
  priors: Map<string, FamilyEvidence>;
  recentExposures: RecentExposure[];
  tuning: LearningTuning;
  urgencyBand?: FounderUrgencyBand | null;
  now?: Date;
}): RankedLearningResult {
  const { candidates, baseOrder, priors, recentExposures, tuning, urgencyBand } = input;
  const now = input.now ?? new Date();
  const diagnostics: Record<string, unknown> = {};
  const fatigue = new Map(
    candidates.map((candidate) => [
      candidate.toolKey,
      fatigueForFamily(candidate.toolKey, recentExposures, tuning, now),
    ]),
  );
  const hasUncappedAlternative = candidates.some(
    (candidate) => !fatigue.get(candidate.toolKey)?.capped,
  );

  const scored = candidates.map((candidate) => {
    const baseIndex = Math.max(0, baseOrder.indexOf(candidate.key));
    const baseScore = 1 - baseIndex / Math.max(1, candidates.length);
    const evidence = priors.get(candidate.toolKey);
    const fatigueState = fatigue.get(candidate.toolKey) ?? {
      count: 0,
      repeatedRecently: false,
      capped: false,
      penalty: 0,
    };
    const capPenalty = fatigueState.capped && hasUncappedAlternative ? 0.35 : 0;
    const collectiveScore = evidence?.score ?? 0.5;
    const evidenceWeight = evidence
      ? Math.min(0.65, 0.65 * evidence.uniqueUsers / (evidence.uniqueUsers + 12))
      : 0;
    // urgencyAdjustment is denominated in base-rank steps, so scale it by the
    // distance between adjacent ranks in this particular candidate list.
    const baseStep = 1 / Math.max(1, candidates.length);
    const urgencyBias = urgencyAdjustment(candidate.toolKey, urgencyBand) * baseStep;
    const score = baseScore * (1 - evidenceWeight)
      + collectiveScore * evidenceWeight
      - fatigueState.penalty
      - capPenalty
      + urgencyBias;

    diagnostics[candidate.key] = {
      score: Number(score.toFixed(6)),
      baseScore: Number(baseScore.toFixed(6)),
      urgencyBand: urgencyBand ?? null,
      urgencyBias: Number(urgencyBias.toFixed(6)),
      bayesianMean: evidence?.mean ?? null,
      conservativeScore: evidence?.score ?? null,
      uncertainty: evidence?.uncertainty ?? null,
      samples: evidence?.samples ?? 0,
      uniqueUsers: evidence?.uniqueUsers ?? 0,
      segment: evidence?.segment ?? null,
      negativeRate: evidence?.negativeRate ?? null,
      fatigue: fatigueState,
    };

    return { key: candidate.key, score };
  });

  return {
    orderedCandidateKeys: scored
      .sort((left, right) => right.score - left.score || baseOrder.indexOf(left.key) - baseOrder.indexOf(right.key))
      .map((entry) => entry.key),
    diagnostics,
  };
}

export function selectSafeExploration(input: {
  orderedCandidateKeys: string[];
  candidates: LearningCandidate[];
  priors: Map<string, FamilyEvidence>;
  health: Map<string, FamilyHealth>;
  recentExposures: RecentExposure[];
  tuning: LearningTuning;
  seed: string;
  now?: Date;
}) {
  const { orderedCandidateKeys, candidates, priors, health, recentExposures, tuning, seed } = input;
  const now = input.now ?? new Date();
  const safeAlternatives = orderedCandidateKeys
    .slice(1, 4)
    .flatMap((key) => {
      const candidate = candidates.find((item) => item.key === key);
      if (!candidate) return [];
      const evidence = priors.get(candidate.toolKey);
      const familyHealth = health.get(candidate.toolKey);
      const fatigue = fatigueForFamily(candidate.toolKey, recentExposures, tuning, now);
      const negativeRate = familyHealth?.current_negative_rate ?? evidence?.negativeRate ?? 0;
      const isUnsafe = familyHealth?.status === "critical"
        || negativeRate > tuning.maxExplorationNegativeRate
        || fatigue.capped;
      if (isUnsafe) return [];

      const samples = evidence?.samples ?? 0;
      const uncertainty = evidence?.uncertainty ?? 0.25;
      const underSampledBonus = samples < tuning.explorationMinSamples
        ? 0.5
        : 1 / Math.sqrt(samples + 1);
      return [{
        key,
        value: uncertainty + underSampledBonus - fatigue.penalty,
      }];
    })
    .sort((left, right) => right.value - left.value);

  if (safeAlternatives.length === 0) return null;
  const topValue = safeAlternatives[0].value;
  const tied = safeAlternatives.filter((entry) => Math.abs(entry.value - topValue) < 0.000001);
  return tied[stableHash(seed) % tied.length]?.key ?? safeAlternatives[0].key;
}
