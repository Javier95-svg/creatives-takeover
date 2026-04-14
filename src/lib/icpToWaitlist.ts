import type { StoredIcpArtifact } from '@/lib/icpBuilderSession';
import type { WaitlistContent } from '@/lib/waitlist';
import { getDefaultWaitlistContent } from '@/lib/waitlist';

function truncate(text: string, max: number): string {
  const trimmed = (text || '').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (value && value.trim().length > 0) return value.trim();
  }
  return '';
}

function inferProductName(artifact: StoredIcpArtifact, explicit?: string): string {
  const fromInput = explicit?.trim();
  if (fromInput) return fromInput;

  const valueProp = artifact.draftDocument.build.valueProposition?.trim() || '';
  if (valueProp) {
    const firstClause = valueProp.split(/[.,—–-]/)[0]?.trim();
    if (firstClause && firstClause.length <= 36) return firstClause;
  }
  return 'Your product';
}

function deriveBenefits(artifact: StoredIcpArtifact): string[] {
  const doc = artifact.draftDocument;
  const pool: string[] = [];

  doc.build.coreFeatures?.forEach((feature) => {
    const benefit = firstNonEmpty(feature.description, feature.title);
    if (benefit) pool.push(truncate(benefit, 120));
  });

  if (doc.build.outcome) pool.push(truncate(doc.build.outcome, 120));
  doc.build.replaces?.forEach((item) => {
    if (item) pool.push(truncate(`Replaces ${item}`, 120));
  });

  const deduped = Array.from(new Set(pool.map((item) => item.trim()).filter(Boolean)));
  return deduped.slice(0, 3);
}

function deriveTrustItems(artifact: StoredIcpArtifact): string[] {
  const items: string[] = [];
  const moat = artifact.draftDocument.moat;

  if (moat.moatType) items.push(truncate(moat.moatType, 24));
  if (moat.edgeSource) items.push(truncate(moat.edgeSource, 24));
  if (moat.edge) items.push(truncate(moat.edge, 24));

  return items.filter(Boolean).slice(0, 3);
}

function deriveHeadline(artifact: StoredIcpArtifact, productName: string): string {
  const outcome = artifact.draftDocument.build.outcome?.trim();
  if (outcome) return truncate(outcome, 90);

  const valueProp = artifact.draftDocument.build.valueProposition?.trim();
  if (valueProp) return truncate(valueProp, 90);

  return `Get early access to ${productName}`;
}

function deriveSubheadline(artifact: StoredIcpArtifact): string {
  const roleLine = artifact.draftDocument.customer.roleLine?.trim();
  const summary = artifact.draftDocument.customer.summary?.trim();
  return truncate(firstNonEmpty(roleLine, summary) || 'Built for founders who want to validate demand before building.', 180);
}

function deriveProblemStatement(artifact: StoredIcpArtifact): string {
  const pain = artifact.draftDocument.pain;
  return truncate(firstNonEmpty(pain.whyItHurts, pain.quote, pain.rootCause), 220);
}

function deriveSolutionSummary(artifact: StoredIcpArtifact): string {
  const build = artifact.draftDocument.build;
  return truncate(firstNonEmpty(build.valueProposition, build.outcome), 220);
}

export interface IcpToWaitlistResult {
  productName: string;
  content: Partial<WaitlistContent>;
  /** Used by the "Refine with AI" button to call the generator. */
  refinementSeed: {
    pitch: string;
    audience: string;
  };
}

export function icpArtifactToWaitlistContent(
  artifact: StoredIcpArtifact,
  explicitProductName?: string,
): IcpToWaitlistResult {
  const productName = inferProductName(artifact, explicitProductName);
  const defaults = getDefaultWaitlistContent(productName);

  const headline = deriveHeadline(artifact, productName);
  const subheadline = deriveSubheadline(artifact);
  const problemStatement = deriveProblemStatement(artifact) || defaults.problemStatement;
  const solutionSummary = deriveSolutionSummary(artifact) || defaults.solutionSummary;
  const benefits = deriveBenefits(artifact);
  const trustItems = deriveTrustItems(artifact);

  const pitch = firstNonEmpty(
    artifact.draftDocument.build.valueProposition,
    artifact.draftDocument.build.outcome,
    headline,
  );
  const audience = firstNonEmpty(
    artifact.draftDocument.customer.roleLine,
    artifact.draftDocument.customer.summary,
    'startup founders',
  );

  return {
    productName,
    content: {
      headline,
      subheadline,
      problemStatement,
      solutionSummary,
      benefits: benefits.length >= 3 ? benefits : defaults.benefits,
      trustItems: trustItems.length >= 2 ? trustItems : defaults.trustItems,
      ctaText: 'Get early access',
    },
    refinementSeed: {
      pitch,
      audience,
    },
  };
}
