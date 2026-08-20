import type { PmfDecision, PmfEvidenceGrade } from '@/lib/pmfConfidence';

export interface PmfDecisionActionInput {
  analysisId: string;
  decision: PmfDecision;
  evidenceGrade: PmfEvidenceGrade;
  nextExperiment?: string | null;
  validationContextId?: string | null;
  icpAnalysisId?: string | null;
  pathwayEnabled?: boolean;
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
  const contextQuery = input.validationContextId ? `&context=${encodeURIComponent(input.validationContextId)}` : '';

  if (!input.pathwayEnabled) {
    if (verifiedBuild) {
      return {
        title: 'Review your evidence-backed MVP brief',
        description: 'Decision-grade customer evidence supports Build. Keep the first scope tied to the verified pain, objections, and buying signals.',
        route: '/mvp-builder?source=pmf-decision',
        ctaLabel: 'Open MVP brief',
        destination: 'mvp_builder',
      };
    }
    return {
      title: input.decision === 'build' ? 'Collect more evidence before building' : `Test the ${input.decision} decision with real prospects`,
      description: input.nextExperiment || 'Talk to the next qualified prospect and record what strengthens or contradicts the current decision.',
      route: '/pmf-lab',
      ctaLabel: 'Find the next customer',
      destination: 'pmf_discovery',
    };
  }

  if (verifiedBuild) {
    return {
      title: 'Review your evidence-backed MVP brief',
      description: 'Decision-grade customer evidence supports Build. Keep the first scope tied to the verified pain, objections, and buying signals.',
      route: `/mvp-builder?source=pmf-decision&pmf=${encodeURIComponent(input.analysisId)}${contextQuery}`,
      ctaLabel: 'Open MVP brief',
      destination: 'mvp_builder',
    };
  }

  if (input.decision === 'build') {
    return {
      title: 'Build a provisional MVP scope',
      description: 'Your current evidence supports a provisional Build direction. You can build manually, but it stays Draft until a verified Build decision supports the automatic handoff.',
      route: `/mvp-builder?source=provisional-pmf&pmf=${encodeURIComponent(input.analysisId)}${contextQuery}`,
      ctaLabel: 'Open manual MVP scope',
      destination: 'mvp_builder',
    };
  }

  const experiment = input.nextExperiment
    ? clampText(input.nextExperiment, 180)
    : 'Talk to the next qualified prospect and record what strengthens or contradicts the current decision.';

  const titleByDecision: Record<PmfDecision, string> = {
    build: 'Build a provisional MVP scope',
    narrow: 'Test the narrower offer with real prospects',
    pivot: 'Test the pivot hypothesis before rebuilding',
    stop: 'Document the invalidated assumption and test a new direction',
  };

  if (input.decision === 'stop') {
    return {
      title: titleByDecision.stop,
      description: experiment,
      route: `/pmf-lab?outcome=${encodeURIComponent(input.analysisId)}${input.validationContextId ? `&context=${encodeURIComponent(input.validationContextId)}` : ''}`,
      ctaLabel: 'Review recorded decision',
      destination: 'pmf_discovery',
    };
  }

  const exactIcpRoute = input.icpAnalysisId
    ? `/icp/draft/${encodeURIComponent(input.icpAnalysisId)}?decision=${input.decision}${contextQuery}`
    : `/icp-builder?decision=${input.decision}${contextQuery}`;
  return {
    title: titleByDecision[input.decision],
    description: experiment,
    route: exactIcpRoute,
    ctaLabel: input.decision === 'narrow' ? 'Narrow this ICP' : 'Edit this ICP for the pivot',
    destination: 'pmf_discovery',
  };
}
