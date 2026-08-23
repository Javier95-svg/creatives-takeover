import type { StoredIcpArtifact } from '@/lib/icpBuilderSession';
// Relative with an explicit extension, matching icpViabilityScore.ts: this module
// is loaded directly by node:test, which does not resolve the "@/" alias. The
// type-only import above is erased before resolution, so it stays.
import { fieldIsReal, rankedPainIsReal } from './icpFieldProvenance.ts';

/**
 * Maps a saved ICP Draft onto the First Customer Sprint intake, so a founder who
 * has already named a segment, a ranked pain and a pricing anchor does not retype
 * all three into a blank form. Mirrors the shape of `icpToDemoBrief.ts`, which does
 * the same job for Demo Studio.
 *
 * One rule separates this from that mapper: **nothing backfilled is ever seeded.**
 *
 * The generator fills every unanswered field with readable prose ("The buying
 * trigger still needs validation"), and that text reads perfectly well in an input
 * box. Seeding it would put a placeholder in front of a founder as though it were
 * their own finding, and they would then send outreach built on it. The sprint is
 * the surface where a fabricated segment costs real prospect contacts, so every
 * field here is gated through `fieldIsReal` / `rankedPainIsReal` and an unanswered
 * field is left empty for the founder to fill in themselves.
 */

function truncate(text: string, max: number): string {
  const trimmed = (text || '').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

/** The first answered candidate, by path. Unanswered candidates are skipped, not used. */
function firstRealField(
  artifact: StoredIcpArtifact,
  candidates: Array<[path: string, value: string | null | undefined]>,
): string {
  for (const [path, value] of candidates) {
    if (!value || !value.trim()) continue;
    if (!fieldIsReal(artifact.draftDocument, path)) continue;
    return value.trim();
  }
  return '';
}

function deriveTargetSegment(artifact: StoredIcpArtifact): string {
  const doc = artifact.draftDocument;
  return truncate(
    firstRealField(artifact, [
      ['decisionBrief.primarySegment', doc.decisionBrief?.primarySegment],
      ['customer.roleLine', doc.customer.roleLine],
      ['customer.summary', doc.customer.summary],
    ]),
    240,
  );
}

function deriveOffer(artifact: StoredIcpArtifact): string {
  const doc = artifact.draftDocument;
  return truncate(
    firstRealField(artifact, [
      ['build.valueProposition', doc.build.valueProposition],
      ['build.outcome', doc.build.outcome],
    ]),
    240,
  );
}

/**
 * The top ranked pain, plus what they do about it today.
 *
 * The alternative belongs in the hypothesis rather than being dropped: an
 * outreach message that names the workaround lands differently from one that
 * names only the pain, and this is the field the message variants are built from.
 */
function deriveProblemHypothesis(artifact: StoredIcpArtifact): string {
  const doc = artifact.draftDocument;

  const rankedPain = doc.decisionBrief?.rankedPains
    ?.map((entry, index) => ({ entry, index }))
    .sort((left, right) => left.entry.rank - right.entry.rank)
    .find(({ index }) => rankedPainIsReal(doc, index))?.entry.pain;

  const pain = truncate(
    (rankedPain?.trim() || firstRealField(artifact, [
      ['pain.whyItHurts', doc.pain.whyItHurts],
      ['pain.quote', doc.pain.quote],
      ['pain.rootCause', doc.pain.rootCause],
    ])),
    300,
  );
  if (!pain) return '';

  const alternative = firstRealField(artifact, [
    ['decisionBrief.currentAlternative', doc.decisionBrief?.currentAlternative],
  ]);

  return alternative
    ? truncate(`${pain} Today they work around it with ${alternative}.`, 400)
    : pain;
}

/**
 * The rank-1 risk, phrased as the question to put to a mentor.
 *
 * The sprint asks the founder what decision they want help with. The ICP already
 * ranked what would kill the idea and recorded what would settle it, which is a
 * better starting question than anything a founder writes into an empty box at
 * the moment they are most optimistic about their own plan.
 */
function deriveMentorDecisionQuestion(artifact: StoredIcpArtifact): string {
  const doc = artifact.draftDocument;
  const topRisk = doc.risks?.slice().sort((left, right) => left.rank - right.rank)[0];
  if (!topRisk) return '';

  const riskIndex = (doc.risks ?? []).indexOf(topRisk);
  if (riskIndex < 0 || !fieldIsReal(doc, `risks.${riskIndex}`)) return '';

  const risk = truncate(topRisk.risk, 240);
  const settledBy = topRisk.disprovedBy?.trim();
  return settledBy
    ? truncate(`${risk} What would convince you this is settled: ${settledBy}`, 400)
    : risk;
}

/**
 * A dollar figure from the pricing work, when one is actually stated.
 *
 * The sprint requires a positive number and uses it to weigh whether the pipeline
 * is worth the founder's hours, so a wrong guess is worse than an empty field.
 * Only a number the founder can see in their own pricing section is lifted; the
 * multiplier suffixes are handled because "$2k per seat" is how founders write it.
 */
function deriveEstimatedCustomerValueUsd(artifact: StoredIcpArtifact): number | null {
  const doc = artifact.draftDocument;
  const source = firstRealField(artifact, [
    ['pricing.anchor', doc.pricing?.anchor],
    ['pricing.hypothesis', doc.pricing?.hypothesis],
  ]);
  if (!source) return null;

  const match = source.match(/\$\s*([\d,]+(?:\.\d+)?)\s*([kKmM])?/);
  if (!match) return null;

  const base = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(base) || base <= 0) return null;

  const multiplier = match[2]?.toLowerCase() === 'k' ? 1_000 : match[2]?.toLowerCase() === 'm' ? 1_000_000 : 1;
  const value = Math.round(base * multiplier);
  return value > 0 ? value : null;
}

export interface IcpToFirstCustomerSprintResult {
  /** Intake fields, keyed as `FirstCustomerSprintPage` holds them. Empty string means "ask the founder". */
  intake: {
    offer: string;
    targetSegment: string;
    problemHypothesis: string;
    mentorDecisionQuestion: string;
    estimatedCustomerValueUsd: string;
  };
  /** How many intake fields the draft could actually fill, for the provenance line. */
  seededFieldCount: number;
  personaName: string;
}

export function icpArtifactToFirstCustomerSprint(
  artifact: StoredIcpArtifact,
): IcpToFirstCustomerSprintResult {
  const estimatedValue = deriveEstimatedCustomerValueUsd(artifact);
  const intake = {
    offer: deriveOffer(artifact),
    targetSegment: deriveTargetSegment(artifact),
    problemHypothesis: deriveProblemHypothesis(artifact),
    mentorDecisionQuestion: deriveMentorDecisionQuestion(artifact),
    estimatedCustomerValueUsd: estimatedValue === null ? '' : String(estimatedValue),
  };

  const personaName = firstRealField(artifact, [
    ['customer.personaName', artifact.draftDocument.customer.personaName],
  ]);

  return {
    intake,
    seededFieldCount: Object.values(intake).filter((value) => value.length > 0).length,
    personaName,
  };
}
