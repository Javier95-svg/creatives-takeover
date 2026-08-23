import type { GTMKillRule, GTMPlanV2, GTMPlay } from '@/lib/gtmV2';

export const CT_VERIFICATION_POLICY_VERSION = 'ct_acquisition_v1' as const;

export type FounderExecutionLoop = 'PROVE' | 'SELL' | 'GROW' | 'RAISE';
export type MarketExperimentStatus = 'draft' | 'preregistered' | 'running' | 'evaluated' | 'archived';
export type MarketExperimentDecision = 'double_down' | 'iterate' | 'narrow' | 'pivot' | 'kill';
export type ExperimentResult = 'passed' | 'failed' | 'inconclusive';
export type EvidenceLevel = 'founder_reported' | 'corroborated' | 'ct_verified';
export type ObservationVerificationMode = 'founder_reported' | 'corroborated' | 'platform_verified' | 'reviewer_verified';
export type ChangedExperimentVariable = 'audience' | 'problem' | 'offer' | 'message' | 'channel' | 'asset' | 'cta' | 'target';

export const STARTUP_STAGE_EXECUTION_LOOPS = {
  IDENTITY: 'PROVE',
  PROTOTYPE: 'PROVE',
  VALIDATING: 'PROVE',
  BUILDING: 'SELL',
  LAUNCH: 'SELL',
  TRACTION: 'GROW',
  FUNDRAISING: 'RAISE',
} as const satisfies Record<string, FounderExecutionLoop>;

export const B2B_ACQUISITION_FUNNEL = [
  'prospects',
  'sent',
  'delivered',
  'replies',
  'positive_replies',
  'meetings',
  'attended',
  'offers',
  'commitments',
  'payments',
] as const;

export const DEMO_ACQUISITION_FUNNEL = [
  'qualified_views',
  'demo_starts',
  'demo_completions',
  'cta_clicks',
  'signups',
  'activations',
  'd7_retained',
  'd30_retained',
] as const;

export interface GTMActionPacket {
  prospectCriteria: string;
  listBuildingInstruction: string;
  approvedMessage: string;
  followUps: string[];
  cta: string;
  dailyQuota: number;
  weeklyQuota: number;
  expectedFunnel: Array<{ metric: string; target: number }>;
  targetMetric: string;
  targetValue: number;
  minimumSampleSize: number;
  observationWindowDays: number;
  killRule?: GTMKillRule;
  demo?: { id: string; url: string; title: string } | null;
}

export interface MarketExperiment {
  id: string;
  userId: string;
  parentExperimentId?: string | null;
  version: number;
  executionLoop: Exclude<FounderExecutionLoop, 'RAISE'>;
  status: MarketExperimentStatus;
  hypothesis: string;
  audience: string;
  problem?: string | null;
  buyingTrigger?: string | null;
  offer: string;
  message: string;
  channel: string;
  assetType?: string | null;
  assetId?: string | null;
  sourceDemoId?: string | null;
  cta?: string | null;
  targetMetric: string;
  targetOperator: 'gt' | 'gte' | 'lt' | 'lte';
  targetValue: number;
  minimumSampleSize: number;
  observationWindowDays: number;
  killRule?: GTMKillRule;
  actionPacket: GTMActionPacket;
  sourceOutcomeVersions: Record<string, string>;
  sourceGtmPlanId?: string | null;
  sourceGtmPlayId?: string | null;
  sourceTractionSprintId?: string | null;
  sourceFirstCustomerSprintId?: string | null;
  preregisteredAt?: string | null;
  createdAt: string;
}

export interface ExperimentObservation {
  id?: string;
  experimentId: string;
  metric: string;
  value: number;
  denominator?: number | null;
  sourceType: string;
  sourceId?: string | null;
  sourceEventIds?: string[];
  verificationMode: ObservationVerificationMode;
  provenance?: Record<string, unknown>;
  capturedAt?: string;
}

export interface ExperimentDecision {
  experimentId: string;
  decision: MarketExperimentDecision;
  result: ExperimentResult;
  changedVariable?: ChangedExperimentVariable | null;
  rationale: string;
  nextExperimentId?: string | null;
  decidedAt?: string;
}

export interface VerificationClaim {
  id: string;
  experimentId?: string | null;
  sourceTool?: string | null;
  claimType: string;
  claim: string;
  evidenceLevel: EvidenceLevel;
  result: ExperimentResult;
  status: 'pending' | 'verified' | 'rejected' | 'expired' | 'legacy';
  policyVersion: string;
  missingEvidence: string[];
  nextAction?: string | null;
  unlockedBenefit?: 'mentor_checkpoint' | null;
  evaluation: Record<string, unknown>;
  decidedAt?: string | null;
  verifiedAt?: string | null;
  updatedAt: string;
}

export interface DecisionReadiness {
  sampleReached: boolean;
  result: ExperimentResult;
  evidenceLevel: EvidenceLevel;
  ctVerified: boolean;
  observedValue: number;
  sampleSize: number;
  missingEvidence: string[];
  recommendedDecision: MarketExperimentDecision;
}

export interface PublishedDemoReference {
  id: string;
  publicId: string;
  title: string;
  url: string;
}

const positiveInt = (value: number, fallback: number) => (
  Number.isFinite(value) && value > 0 ? Math.ceil(value) : fallback
);

export function normalizeAcquisitionMetric(metric: string): string {
  const value = metric.trim().toLowerCase();
  if ([...B2B_ACQUISITION_FUNNEL, ...DEMO_ACQUISITION_FUNNEL].includes(value as never)) return value;
  if (/payment|paid customer|purchase|revenue/.test(value)) return 'payments';
  if (/commitment|contract|pilot/.test(value)) return 'commitments';
  if (/attend|show rate/.test(value)) return 'attended';
  if (/complete/.test(value)) return 'demo_completions';
  if (/meeting|book.*demo|conversation|call/.test(value)) return 'meetings';
  if (/positive.*repl|qualified.*repl/.test(value)) return 'positive_replies';
  if (/repl|dm/.test(value)) return 'replies';
  if (/offer|proposal/.test(value)) return 'offers';
  if (/activation/.test(value)) return 'activations';
  if (/signup|waitlist/.test(value)) return 'signups';
  if (/click|cta/.test(value)) return 'cta_clicks';
  if (/view|visit|impression/.test(value)) return 'qualified_views';
  return 'replies';
}

export function buildGTMActionPacket(
  plan: GTMPlanV2,
  play: GTMPlay,
  demo: PublishedDemoReference | null = null,
): GTMActionPacket {
  const targetMetric = normalizeAcquisitionMetric(play.metric);
  const minimumSampleSize = positiveInt(
    play.structuredKillRule?.minSampleSize ?? Math.max(play.target * 2, 10),
    10,
  );
  const observationWindowDays = positiveInt((play.structuredKillRule?.observationWindowWeeks ?? 1) * 7, 7);
  const weeklyQuota = minimumSampleSize;
  const dailyQuota = Math.max(1, Math.ceil(weeklyQuota / 5));
  const followUps = play.actions.filter((action) => action.trim()).slice(0, 3);
  const listBuildingInstruction = followUps[0]
    ?? `Build a named list of ${weeklyQuota} prospects matching the buyer and trigger before sending.`;

  return {
    prospectCriteria: [play.audience, play.buyingTrigger && `Trigger: ${play.buyingTrigger}`].filter(Boolean).join(' — '),
    listBuildingInstruction,
    approvedMessage: play.message,
    followUps: followUps.slice(1).length > 0
      ? followUps.slice(1)
      : ['Follow up once with the same hypothesis before changing the message.'],
    cta: plan.messaging.ctaCopy,
    dailyQuota,
    weeklyQuota,
    expectedFunnel: [
      { metric: 'prospects', target: weeklyQuota },
      { metric: 'sent', target: weeklyQuota },
      { metric: targetMetric, target: play.target },
    ],
    targetMetric,
    targetValue: play.target,
    minimumSampleSize,
    observationWindowDays,
    killRule: play.structuredKillRule,
    demo: demo ? { id: demo.id, url: demo.url, title: demo.title } : null,
  };
}

export function selectExecutableGTMPlays(plan: GTMPlanV2): GTMPlay[] {
  const primaryChannel = plan.channels.find((channel) => channel.role === 'primary');
  const fallbackChannel = plan.channels.find((channel) => channel.role === 'secondary');
  const selected = [primaryChannel, fallbackChannel]
    .map((channel) => plan.plays.find((play) => play.channelId === channel?.id))
    .filter((play): play is GTMPlay => Boolean(play));
  return selected.length > 0
    ? selected.filter((play, index, plays) => plays.findIndex((candidate) => candidate.id === play.id) === index)
    : plan.plays.slice(0, 2);
}

export function evaluateDecisionReadiness(input: {
  targetOperator?: 'gt' | 'gte' | 'lt' | 'lte';
  targetValue: number;
  observedValue: number;
  minimumSampleSize: number;
  sampleSize: number;
  verificationModes: ObservationVerificationMode[];
}): DecisionReadiness {
  const sampleReached = input.sampleSize >= input.minimumSampleSize;
  const operator = input.targetOperator ?? 'gte';
  const passed = operator === 'gt'
    ? input.observedValue > input.targetValue
    : operator === 'gte'
      ? input.observedValue >= input.targetValue
      : operator === 'lt'
        ? input.observedValue < input.targetValue
        : input.observedValue <= input.targetValue;
  const externallyVerified = input.verificationModes.some((mode) => (
    mode === 'platform_verified' || mode === 'reviewer_verified'
  ));
  const corroborated = externallyVerified || input.verificationModes.includes('corroborated');
  const evidenceLevel: EvidenceLevel = sampleReached && externallyVerified
    ? 'ct_verified'
    : corroborated ? 'corroborated' : 'founder_reported';
  const result: ExperimentResult = sampleReached ? (passed ? 'passed' : 'failed') : 'inconclusive';
  const missingEvidence = [
    ...(!sampleReached ? [`Reach the pre-registered sample of ${input.minimumSampleSize}`] : []),
    ...(!externallyVerified ? ['Add platform-recorded or reviewer-verified customer evidence'] : []),
  ];

  return {
    sampleReached,
    result,
    evidenceLevel,
    ctVerified: evidenceLevel === 'ct_verified',
    observedValue: input.observedValue,
    sampleSize: input.sampleSize,
    missingEvidence,
    recommendedDecision: !sampleReached ? 'iterate' : passed ? 'double_down' : 'kill',
  };
}

export function mapVerificationClaim(row: Record<string, unknown>): VerificationClaim {
  const evidenceLevel = row.evidence_level as EvidenceLevel;
  const result = row.result as ExperimentResult;
  const status = row.status as VerificationClaim['status'];
  return {
    id: String(row.id ?? ''),
    experimentId: typeof row.experiment_id === 'string' ? row.experiment_id : null,
    sourceTool: typeof row.source_tool === 'string' ? row.source_tool : null,
    claimType: String(row.claim_type ?? ''),
    claim: String(row.claim ?? ''),
    evidenceLevel,
    result,
    status,
    policyVersion: String(row.policy_version ?? CT_VERIFICATION_POLICY_VERSION),
    missingEvidence: Array.isArray(row.missing_evidence) ? row.missing_evidence.map(String) : [],
    nextAction: typeof row.next_action === 'string' ? row.next_action : null,
    unlockedBenefit: row.unlocked_benefit === 'mentor_checkpoint' ? 'mentor_checkpoint' : null,
    evaluation: row.evaluation && typeof row.evaluation === 'object' ? row.evaluation as Record<string, unknown> : {},
    decidedAt: typeof row.decided_at === 'string' ? row.decided_at : null,
    verifiedAt: typeof row.verified_at === 'string' ? row.verified_at : null,
    updatedAt: String(row.updated_at ?? row.created_at ?? ''),
  };
}
