import type { PmfDecision, PmfEvidenceGrade } from '@/lib/pmfConfidence';

export interface PmfDecisionActionInput {
  analysisId: string;
  decision: PmfDecision;
  evidenceGrade: PmfEvidenceGrade;
  nextExperiment?: string | null;
}

export interface PmfDecisionAction {
  title: string;
  description: string;
  route: string;
  ctaLabel: string;
  destination: 'mvp_builder' | 'pmf_discovery';
}

const clampText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

export function getPmfDecisionAction(input: PmfDecisionActionInput): PmfDecisionAction {
  const verifiedBuild = input.decision === 'build' && input.evidenceGrade === 'decision_grade';

  if (verifiedBuild) {
    return {
      title: 'Review your evidence-backed MVP brief',
      description: 'Decision-grade customer evidence supports Build. Keep the first scope tied to the verified pain, objections, and buying signals.',
      route: '/mvp-builder?source=pmf-decision',
      ctaLabel: 'Open MVP brief',
      destination: 'mvp_builder',
    };
  }

  const experiment = input.nextExperiment
    ? clampText(input.nextExperiment, 180)
    : 'Talk to the next qualified prospect and record what strengthens or contradicts the current decision.';

  const titleByDecision: Record<PmfDecision, string> = {
    build: 'Collect more evidence before building',
    narrow: 'Test the narrower offer with real prospects',
    pivot: 'Test the pivot hypothesis before rebuilding',
    stop: 'Document the invalidated assumption and test a new direction',
  };

  return {
    title: titleByDecision[input.decision],
    description: experiment,
    route: '/pmf-lab',
    ctaLabel: 'Find the next customer',
    destination: 'pmf_discovery',
  };
}
