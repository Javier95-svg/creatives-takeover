export const PMF_SIGNAL_THRESHOLDS = { directional: 5, emerging: 10, decisionGrade: 25 } as const;
export type PmfEvidenceGrade = 'insufficient' | 'directional' | 'emerging' | 'decision_grade';

export interface PmfInterviewEvidence {
  id?: string;
  sourceLeadId?: string;
  intervieweeName?: string;
  segment?: string;
  basicProfile?: string;
  mainFeedback?: string;
  objections?: string;
  missingFeatures?: string;
}

export interface PmfEvidenceAssessment<T extends PmfInterviewEvidence = PmfInterviewEvidence> {
  uniqueInterviews: T[];
  interviewFingerprints: string[];
  interviewWeights: number[];
  independentInterviewCount: number;
  duplicateEvidenceCount: number;
  directWeightedSignals: number;
  weightedSignals: number;
  grade: PmfEvidenceGrade;
}

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const hash = (value: string) => {
  let state = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    state ^= value.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return `pmf-${(state >>> 0).toString(16).padStart(8, '0')}`;
};

export function fingerprintPmfInterview(interview: PmfInterviewEvidence) {
  const stableIdentity = normalize(interview.sourceLeadId)
    || [normalize(interview.intervieweeName), normalize(interview.segment), normalize(interview.basicProfile)].join('|');
  const contentIdentity = [normalize(interview.mainFeedback), normalize(interview.objections), normalize(interview.missingFeatures)].join('|');
  return hash(stableIdentity || contentIdentity);
}

export function gradePmfInterview(interview: PmfInterviewEvidence) {
  const substantiveFields = [interview.mainFeedback, interview.objections, interview.missingFeatures]
    .filter((value) => normalize(value).length >= 20).length;
  const hasIdentity = Boolean(normalize(interview.sourceLeadId) || normalize(interview.intervieweeName));
  if (hasIdentity && substantiveFields >= 2) return 1;
  if (substantiveFields >= 1) return 0.5;
  return 0.25;
}

export function resolvePmfEvidenceGrade(signalCount: number, directSignalCount: number): PmfEvidenceGrade {
  if (signalCount >= PMF_SIGNAL_THRESHOLDS.decisionGrade && directSignalCount >= PMF_SIGNAL_THRESHOLDS.decisionGrade) return 'decision_grade';
  if (signalCount >= PMF_SIGNAL_THRESHOLDS.emerging && directSignalCount >= PMF_SIGNAL_THRESHOLDS.emerging) return 'emerging';
  if (signalCount >= PMF_SIGNAL_THRESHOLDS.directional && directSignalCount >= PMF_SIGNAL_THRESHOLDS.directional) return 'directional';
  return 'insufficient';
}

export function assessPmfEvidence<T extends PmfInterviewEvidence>(input: {
  interviews: T[];
  surveyResponses: number;
  verifiedDemoBehaviors: number;
  researchSources: number;
}): PmfEvidenceAssessment<T> {
  const byFingerprint = new Map<string, T>();
  input.interviews.forEach((interview) => {
    const fingerprint = fingerprintPmfInterview(interview);
    const existing = byFingerprint.get(fingerprint);
    if (!existing || gradePmfInterview(interview) > gradePmfInterview(existing)) byFingerprint.set(fingerprint, interview);
  });
  const uniqueInterviews = Array.from(byFingerprint.values());
  const interviewFingerprints = uniqueInterviews.map(fingerprintPmfInterview);
  const interviewWeights = uniqueInterviews.map(gradePmfInterview);
  const interviewSignals = interviewWeights.reduce((sum, weight) => sum + weight, 0);
  const surveySignals = Math.max(0, input.surveyResponses) * 0.75;
  const demoSignals = Math.min(10, Math.max(0, input.verifiedDemoBehaviors)) * 0.75;
  const researchSignals = Math.min(5, Math.max(0, input.researchSources)) * 0.25;
  const directWeightedSignals = Math.floor(interviewSignals + surveySignals + demoSignals);
  const weightedSignals = Math.floor(directWeightedSignals + researchSignals);
  return {
    uniqueInterviews,
    interviewFingerprints,
    interviewWeights,
    independentInterviewCount: uniqueInterviews.length,
    duplicateEvidenceCount: Math.max(0, input.interviews.length - uniqueInterviews.length),
    directWeightedSignals,
    weightedSignals,
    grade: resolvePmfEvidenceGrade(weightedSignals, directWeightedSignals),
  };
}
