export const PMF_SIGNAL_THRESHOLDS = {
  directional: 5,
  emerging: 10,
  decisionGrade: 25,
} as const;

export type PmfEvidenceGrade = "insufficient" | "directional" | "emerging" | "decision_grade";
export type PmfDecision = "build" | "narrow" | "pivot" | "stop";

export interface PmfConfidenceResult {
  grade: PmfEvidenceGrade;
  label: string;
  description: string;
  signalCount: number;
  nextThreshold: number | null;
  signalsToNext: number;
  progressToDecisionGrade: number;
}

export function getPmfConfidence(signalCount: number): PmfConfidenceResult {
  const count = Math.max(0, Math.floor(Number.isFinite(signalCount) ? signalCount : 0));

  if (count >= PMF_SIGNAL_THRESHOLDS.decisionGrade) {
    return {
      grade: "decision_grade",
      label: "Decision grade",
      description: "Enough independent evidence exists to make a defensible Build, Narrow, Pivot, or Stop decision.",
      signalCount: count,
      nextThreshold: null,
      signalsToNext: 0,
      progressToDecisionGrade: 100,
    };
  }

  if (count >= PMF_SIGNAL_THRESHOLDS.emerging) {
    return {
      grade: "emerging",
      label: "Emerging patterns",
      description: "Patterns are becoming visible, but the recommendation remains provisional until 25 weighted signals.",
      signalCount: count,
      nextThreshold: PMF_SIGNAL_THRESHOLDS.decisionGrade,
      signalsToNext: PMF_SIGNAL_THRESHOLDS.decisionGrade - count,
      progressToDecisionGrade: Math.round((count / PMF_SIGNAL_THRESHOLDS.decisionGrade) * 100),
    };
  }

  if (count >= PMF_SIGNAL_THRESHOLDS.directional) {
    return {
      grade: "directional",
      label: "Directional evidence",
      description: "The evidence can guide the next test, but it is too early for a build commitment.",
      signalCount: count,
      nextThreshold: PMF_SIGNAL_THRESHOLDS.emerging,
      signalsToNext: PMF_SIGNAL_THRESHOLDS.emerging - count,
      progressToDecisionGrade: Math.round((count / PMF_SIGNAL_THRESHOLDS.decisionGrade) * 100),
    };
  }

  return {
    grade: "insufficient",
    label: "Signal gathering",
    description: "Collect five independent signals before treating the result as directional evidence.",
    signalCount: count,
    nextThreshold: PMF_SIGNAL_THRESHOLDS.directional,
    signalsToNext: PMF_SIGNAL_THRESHOLDS.directional - count,
    progressToDecisionGrade: Math.round((count / PMF_SIGNAL_THRESHOLDS.decisionGrade) * 100),
  };
}

export function getPmfDecision(score: number): PmfDecision {
  const normalizedScore = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  if (normalizedScore >= 75) return "build";
  if (normalizedScore >= 60) return "narrow";
  if (normalizedScore >= 40) return "pivot";
  return "stop";
}

export function formatPmfDecision(decision: PmfDecision) {
  return decision.charAt(0).toUpperCase() + decision.slice(1);
}
