import type { StoredIcpArtifact } from '@/lib/icpBuilderSession';
import type { DemoStudioBrief } from '@/lib/demoStudio/types';
import { DEFAULT_DEMO_STUDIO_CTA } from '@/lib/demoStudio/brief';

/**
 * Maps a saved ICP Draft onto a Demo Studio brief so the founder never re-types the
 * audience, pain, and promise their ICP already established. Mirrors the shape of
 * `icpToWaitlist.ts`, which does the same job for the legacy Waitlist Maker.
 */

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

function deriveAudience(artifact: StoredIcpArtifact): string {
  const doc = artifact.draftDocument;
  return truncate(
    firstNonEmpty(
      doc.decisionBrief?.primarySegment,
      doc.customer.roleLine,
      doc.customer.summary,
      doc.gatePreview.roleLine,
    ),
    240,
  );
}

function derivePainStatement(artifact: StoredIcpArtifact): string {
  const doc = artifact.draftDocument;
  const topRankedPain = doc.decisionBrief?.rankedPains
    ?.slice()
    .sort((a, b) => a.rank - b.rank)[0]?.pain;

  return truncate(
    firstNonEmpty(topRankedPain, doc.pain.whyItHurts, doc.pain.quote, doc.pain.rootCause, doc.gatePreview.painLine),
    240,
  );
}

function derivePromise(artifact: StoredIcpArtifact): string {
  const build = artifact.draftDocument.build;
  return truncate(firstNonEmpty(build.valueProposition, build.outcome), 240);
}

function deriveAhaMoment(artifact: StoredIcpArtifact): string {
  const doc = artifact.draftDocument;
  const outcome = firstNonEmpty(doc.build.outcome, doc.build.valueProposition);
  const firstFeature = doc.build.coreFeatures?.[0];
  const featureLine = firstNonEmpty(firstFeature?.description, firstFeature?.title);

  if (outcome && featureLine) {
    return truncate(`The viewer sees ${featureLine} and understands they can ${outcome.replace(/^\s*(they|you)\s+/i, '')}.`, 240);
  }
  return truncate(
    outcome || featureLine || 'The viewer understands exactly how this solves their problem and wants to try it.',
    240,
  );
}

/**
 * The current alternative is what the demo has to beat, so it belongs in the problem
 * framing rather than being dropped.
 */
function deriveProblem(artifact: StoredIcpArtifact): string {
  const pain = derivePainStatement(artifact);
  const alternative = artifact.draftDocument.decisionBrief?.currentAlternative?.trim();
  if (pain && alternative) {
    return truncate(`${pain} Today they work around it with ${alternative}.`, 240);
  }
  return pain;
}

export interface IcpToDemoBriefResult {
  /** Brief columns to patch onto `demo_studio_briefs`. */
  patch: Pick<DemoStudioBrief, 'audience' | 'problem' | 'product_promise' | 'aha_moment' | 'primary_cta_label'>;
  /** Suggested project name + tagline for the New Project dialog. */
  project: { name: string; tagline: string };
  /** Free-text seed for the anonymous /demo-studio/try description field. */
  tryDescription: string;
  personaName: string;
}

function inferProductName(artifact: StoredIcpArtifact): string {
  const valueProp = artifact.draftDocument.build.valueProposition?.trim() || '';
  if (valueProp) {
    const firstClause = valueProp.split(/[.,—–-]/)[0]?.trim();
    if (firstClause && firstClause.length <= 36) return firstClause;
  }
  return '';
}

export function icpArtifactToDemoBrief(artifact: StoredIcpArtifact): IcpToDemoBriefResult {
  const audience = deriveAudience(artifact);
  const problem = deriveProblem(artifact);
  const productPromise = derivePromise(artifact);
  const ahaMoment = deriveAhaMoment(artifact);
  const personaName = firstNonEmpty(
    artifact.draftDocument.customer.personaName,
    artifact.draftDocument.gatePreview.personaName,
  );

  const tryDescription = truncate(
    [productPromise, audience ? `Built for ${audience}` : '', problem]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' '),
    300,
  );

  return {
    patch: {
      audience,
      problem,
      product_promise: productPromise,
      aha_moment: ahaMoment,
      primary_cta_label: DEFAULT_DEMO_STUDIO_CTA,
    },
    project: {
      name: inferProductName(artifact),
      tagline: truncate(productPromise, 120),
    },
    tryDescription,
    personaName,
  };
}
