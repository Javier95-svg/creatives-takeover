import type { StoredIcpArtifact } from '@/lib/icpBuilderSession';
import { evaluateOutcomeContract } from '@/lib/outcomeContracts';
import { fieldIsReal, rankedPainIsReal } from '@/lib/icpFieldProvenance';
import { isAuthenticIcpCitation } from '@/lib/icpViabilityScore';

// Re-exported from its new home so existing importers keep working. The scorer
// and the outcome contract must agree on what counts as a real citation, so it
// lives in one place now.
export { isAuthenticIcpCitation };

export function evaluateIcpArtifact(
  artifact: StoredIcpArtifact,
  interviewSignals: Array<{ participantFingerprint: string; assumptionStatus: 'confirmed' | 'rejected' | 'untested' }> = [],
) {
  const brief = artifact.draftDocument.decisionBrief;
  const independentInterviews = new Set(interviewSignals.map((signal) => signal.participantFingerprint).filter(Boolean));
  const resolvedInterviews = interviewSignals.filter((signal) => signal.assumptionStatus !== 'untested');
  const assumptions = [
    ...artifact.draftDocument.confidence.missingSignals,
    artifact.draftDocument.customer.evidence.missingSignalPrompt,
    artifact.draftDocument.pain.evidence.missingSignalPrompt,
    artifact.draftDocument.build.evidence.missingSignalPrompt,
  ].filter((value): value is string => Boolean(value?.trim()));

  /*
   * These check whether a field was actually answered, not whether a string is
   * present. The generator backfills every gap with prose, and every padded
   * list to a fixed length, so the `.trim()` and `.length >= 3` versions of
   * these checks could never fail. The contract was passing its document
   * checks vacuously on drafts that had answered almost nothing.
   */
  const draft = artifact.draftDocument;
  const qualityChecks = {
    primary_segment: fieldIsReal(draft, 'decisionBrief.primarySegment'),
    non_fit_segment: fieldIsReal(draft, 'decisionBrief.nonFitSegment'),
    three_ranked_pains: [0, 1, 2].every((index) => rankedPainIsReal(draft, index)),
    buying_trigger: fieldIsReal(draft, 'decisionBrief.buyingTrigger'),
    current_alternative: fieldIsReal(draft, 'decisionBrief.currentAlternative'),
    reachable_channels: (brief?.reachableChannels.filter((channel) => channel.trim()).length ?? 0) > 0,
    authentic_citation: (draft.sources ?? []).some((source) => isAuthenticIcpCitation(source.url)),
    confidence_level: Boolean(draft.confidence.level),
    assumptions_registered: assumptions.length > 0,
    five_interview_plan: [0, 1, 2, 3, 4].every((index) =>
      fieldIsReal(draft, `decisionBrief.interviewValidationPlan.${index}`),
    ),
    five_interview_signals: independentInterviews.size >= 5,
    assumptions_resolved: independentInterviews.size >= 5 && resolvedInterviews.length >= 5,
  };

  return {
    qualityChecks,
    evaluation: evaluateOutcomeContract({
      tool: 'icp_builder',
      qualityChecks,
      verificationMode: independentInterviews.size >= 5 ? 'corroborated' : 'unverified',
    }),
    assumptions,
  };
}
