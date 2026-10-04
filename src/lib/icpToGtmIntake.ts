import type { StoredIcpArtifact } from './icpBuilderSession';
import type { GTMIntakeV2 } from './gtmV2';

// Pre-fills GTM Strategist from the project's ICP draft (and PMF verdict when
// there is one), so a founder who has done the ICP confirms the plan inputs
// instead of typing the customer, pain and alternatives a second time. Only the
// things the ICP actually knows are filled; business model, geography, budget
// and time stay with the founder. Mirrors icpToDemoBrief.ts.

const clip = (text: string, max: number) => {
  const trimmed = (text || '').trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trim()}…`;
};

/** Ends the text with a full stop unless it already ends a sentence. */
const sentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

const first = (...values: Array<string | null | undefined>) =>
  values.map((value) => (value ?? '').trim()).find((value) => value.length > 0) ?? '';

export interface PmfVerdictSummary {
  verdict: string | null;
  score: number | null;
}

export interface IcpToGtmInput {
  artifact: StoredIcpArtifact;
  projectTitle?: string | null;
  pmf?: PmfVerdictSummary | null;
}

function productNameFrom(artifact: StoredIcpArtifact, projectTitle?: string | null): string {
  if (projectTitle && projectTitle.trim() && !/^(my project|untitled project)$/i.test(projectTitle.trim())) {
    return clip(projectTitle, 80);
  }
  const valueProp = artifact.draftDocument.build.valueProposition?.trim() || '';
  const firstClause = valueProp.split(/[.,:;]/)[0]?.trim() ?? '';
  return firstClause.length > 0 && firstClause.length <= 40 ? firstClause : '';
}

export function icpArtifactToGtmIntake({ artifact, projectTitle, pmf }: IcpToGtmInput): Partial<GTMIntakeV2> {
  const doc = artifact.draftDocument;
  const brief = doc.decisionBrief;
  const topPain = brief?.rankedPains?.slice().sort((a, b) => a.rank - b.rank)[0]?.pain;
  const alternative = brief?.currentAlternative?.trim();

  const competitors = [
    ...(doc.competition?.directCompetitors ?? []).map((competitor) => competitor.name?.trim()).filter(Boolean) as string[],
    ...(alternative ? [alternative] : []),
  ];

  const problem = first(topPain, doc.pain.whyItHurts, doc.pain.rootCause, doc.gatePreview.painLine);
  const solution = [doc.build.valueProposition, doc.build.outcome].map((part) => (part ?? '').trim()).filter(Boolean).join(' ');

  const prefill: Partial<GTMIntakeV2> = {
    productName: productNameFrom(artifact, projectTitle),
    targetSegment: clip(first(brief?.primarySegment, doc.customer.roleLine, doc.customer.summary), 400),
    problem: clip(alternative && problem ? `${sentence(problem)} Today they work around it with ${alternative.replace(/[.!?]+$/, '')}.` : problem, 600),
    solution: clip(solution, 600),
    buyerRole: clip(first(doc.customer.roleLine, doc.gatePreview.roleLine), 160),
    buyingTrigger: clip(first(brief?.buyingTrigger, doc.customer.actionTrigger, doc.pain.triggerMoment), 300),
    knownCompetitors: Array.from(new Set(competitors)).slice(0, 8),
  };

  if (pmf?.verdict) {
    const score = typeof pmf.score === 'number' && Number.isFinite(pmf.score) ? `, score ${Math.round(pmf.score)}` : '';
    prefill.currentTraction = `PMF Lab verdict: ${pmf.verdict}${score}.`;
  }

  // Drop empty strings so the intake treats them as missing, not answered.
  return Object.fromEntries(
    Object.entries(prefill).filter(([, value]) => (Array.isArray(value) ? value.length > 0 : Boolean(value))),
  ) as Partial<GTMIntakeV2>;
}

/** The customer, pain and solution are known, so the market step is mostly confirmation. */
export function icpCoversGtmMarket(prefill: { targetSegment?: string; problem?: string; solution?: string; buyingTrigger?: string }): boolean {
  return [prefill.targetSegment, prefill.problem, prefill.solution, prefill.buyingTrigger]
    .every((value) => typeof value === 'string' && value.trim().length > 10);
}
