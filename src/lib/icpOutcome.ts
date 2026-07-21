import type { StoredIcpArtifact } from '@/lib/icpBuilderSession';
import { evaluateOutcomeContract } from '@/lib/outcomeContracts';

const PLACEHOLDER_HOSTS = new Set(['example.com', 'example.org', 'localhost']);

export function isAuthenticIcpCitation(url: string | null | undefined) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && !PLACEHOLDER_HOSTS.has(parsed.hostname.toLowerCase())
      && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

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

  const qualityChecks = {
    primary_segment: Boolean(brief?.primarySegment.trim()),
    non_fit_segment: Boolean(brief?.nonFitSegment.trim()),
    three_ranked_pains: (brief?.rankedPains.filter((pain) => pain.pain.trim()).length ?? 0) >= 3,
    buying_trigger: Boolean(brief?.buyingTrigger.trim()),
    current_alternative: Boolean(brief?.currentAlternative.trim()),
    reachable_channels: (brief?.reachableChannels.filter((channel) => channel.trim()).length ?? 0) > 0,
    authentic_citation: (artifact.draftDocument.sources ?? []).some((source) => isAuthenticIcpCitation(source.url)),
    confidence_level: Boolean(artifact.draftDocument.confidence.level),
    assumptions_registered: assumptions.length > 0,
    five_interview_plan: (brief?.interviewValidationPlan.filter((item) => item.question.trim() && item.successSignal.trim()).length ?? 0) === 5,
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
