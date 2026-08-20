export const FOUNDER_LOOPS = ['PROVE', 'SELL', 'GROW'] as const;
export type FounderLoop = (typeof FOUNDER_LOOPS)[number];
export type OptionalFounderTrack = 'RAISE';

export const FOUNDER_BUSINESS_MODELS = [
  'b2b_saas',
  'service',
  'b2c_product',
  'marketplace',
  'ecommerce',
  'media',
  'other',
] as const;
export type FounderBusinessModel = (typeof FOUNDER_BUSINESS_MODELS)[number];

export const CUSTOMER_CONTACT_STAGES = [
  'new',
  'qualified',
  'contacted',
  'replied',
  'interview',
  'offer',
  'commitment',
  'customer',
  'lost',
] as const;
export type CustomerContactStage = (typeof CUSTOMER_CONTACT_STAGES)[number];

export const CUSTOMER_EVIDENCE_EVENT_TYPES = [
  'prospect_added',
  'prospect_qualified',
  'outreach_prepared',
  'outreach_sent',
  'reply_received',
  'interview_scheduled',
  'interview_completed',
  'commitment_received',
  'offer_sent',
  'payment_received',
  'customer_lost',
  'retention_observed',
  'channel_reviewed',
] as const;
export type CustomerEvidenceEventType = (typeof CUSTOMER_EVIDENCE_EVENT_TYPES)[number];

export type EvidenceVerificationMode =
  | 'founder_reported'
  | 'customer_action'
  | 'transaction'
  | 'imported'
  | 'platform_verified';

export interface FounderCycleEvidenceCounts {
  prospects: number;
  qualifiedProspects: number;
  outreachSent: number;
  replies: number;
  interviews: number;
  commitments: number;
  payingCustomers: number;
  retentionSignals: number;
  channelReviews: number;
  thisWeek: number;
}

export interface FounderCycleAction {
  key: string;
  title: string;
  description: string;
  route: string;
  expectedEvidence: CustomerEvidenceEventType;
  reason: string;
  priority: number;
}

export interface FounderCycleSnapshot {
  version: 1;
  generatedAt: string;
  eligible: boolean;
  betaCohort: boolean;
  businessModel: FounderBusinessModel | null;
  customerCount: number;
  recommendedLoop: FounderLoop;
  selectedLoop: FounderLoop;
  assignmentReason: string;
  primaryGoal: string | null;
  raiseActive: boolean;
  strongestEvidence: string;
  missingEvidence: string[];
  evidence: FounderCycleEvidenceCounts;
  primaryAction: FounderCycleAction;
  secondaryActions: FounderCycleAction[];
}

export interface FounderCycleDerivationInput {
  legacyStage?: string | null;
  payingCustomers?: number | null;
  costlyCommitments?: number | null;
  hasExternalEvidence?: boolean;
}

export const FOUNDER_LOOP_DEFINITIONS: Record<FounderLoop, {
  label: string;
  objective: string;
  exit: string;
  tools: Array<{ name: string; route: string; support?: boolean }>;
}> = {
  PROVE: {
    label: 'Prove the problem',
    objective: 'Confirm that a specific customer has an urgent problem and will make a costly commitment.',
    exit: '3 qualified conversations plus 1 costly commitment, or 1 paid design partner/customer.',
    tools: [
      { name: 'ICP Builder', route: '/icp-builder' },
      { name: 'PMF Discovery', route: '/pmf-lab' },
      { name: 'Demo Studio', route: '/demo-studio' },
      { name: 'MVP Builder', route: '/mvp-builder', support: true },
    ],
  },
  SELL: {
    label: 'Win first customers',
    objective: 'Turn customer evidence into an offer, conversations, and the first three paying customers.',
    exit: '3 paying customers.',
    tools: [
      { name: 'GTM Strategist', route: '/go-to-market' },
      { name: 'PMF Discovery', route: '/pmf-lab' },
      { name: 'Demo Studio', route: '/demo-studio' },
      { name: 'Traction Engine', route: '/traction-engine' },
      { name: 'Tech Stack Builder', route: '/tech-stack', support: true },
    ],
  },
  GROW: {
    label: 'Find repeatable growth',
    objective: 'Improve a repeatable acquisition channel, activation, retention, and revenue.',
    exit: 'Continuous operating loop; there is no artificial completion state.',
    tools: [
      { name: 'Traction Engine', route: '/traction-engine' },
      { name: 'Core Metrics', route: '/core-metrics' },
      { name: 'GTM Strategist', route: '/go-to-market' },
    ],
  },
};

const LEGACY_STAGE_LOOP: Record<string, FounderLoop> = {
  IDENTITY: 'PROVE',
  PROTOTYPE: 'PROVE',
  VALIDATING: 'PROVE',
  BUILDING: 'SELL',
  LAUNCH: 'SELL',
  TRACTION: 'GROW',
  FUNDRAISING: 'SELL',
};

export function legacyStageToFounderLoop(stage?: string | null): FounderLoop {
  return stage ? LEGACY_STAGE_LOOP[stage] ?? 'PROVE' : 'PROVE';
}

export function deriveFounderLoop(input: FounderCycleDerivationInput): {
  loop: FounderLoop;
  reason: string;
} {
  const customers = Math.max(0, input.payingCustomers ?? 0);
  const commitments = Math.max(0, input.costlyCommitments ?? 0);

  if (customers >= 3) {
    return { loop: 'GROW', reason: 'Three or more paying customers are recorded.' };
  }
  if (customers > 0 || commitments > 0) {
    return { loop: 'SELL', reason: 'A costly customer commitment is recorded, but fewer than three customers are paying.' };
  }
  if (input.hasExternalEvidence === false || input.hasExternalEvidence === true) {
    return { loop: 'PROVE', reason: 'No costly customer commitment is recorded yet.' };
  }
  return {
    loop: legacyStageToFounderLoop(input.legacyStage),
    reason: 'External evidence is not available yet, so the legacy stage is used as a temporary fallback.',
  };
}

export function isFounderCycleEligible(
  businessModel: FounderBusinessModel | null | undefined,
  customerCount: number,
  betaCohort = false,
): boolean {
  return betaCohort
    || ((businessModel === 'b2b_saas' || businessModel === 'service')
      && customerCount >= 0
      && customerCount <= 3);
}

export function loopProgress(loop: FounderLoop, evidence: FounderCycleEvidenceCounts): number {
  if (loop === 'PROVE') {
    const conversations = Math.min(evidence.interviews, 3) / 3;
    const commitment = evidence.commitments > 0 || evidence.payingCustomers > 0 ? 1 : 0;
    return Math.round(((conversations * 0.6) + (commitment * 0.4)) * 100);
  }
  if (loop === 'SELL') {
    return Math.min(100, Math.round((Math.min(evidence.payingCustomers, 3) / 3) * 100));
  }
  const reviewed = evidence.channelReviews > 0 ? 0.5 : 0;
  const retained = evidence.retentionSignals > 0 ? 0.5 : 0;
  return Math.round((reviewed + retained) * 100);
}

export function evidenceEventForContactStage(stage: CustomerContactStage): CustomerEvidenceEventType | null {
  const map: Partial<Record<CustomerContactStage, CustomerEvidenceEventType>> = {
    new: 'prospect_added',
    qualified: 'prospect_qualified',
    contacted: 'outreach_sent',
    replied: 'reply_received',
    interview: 'interview_scheduled',
    offer: 'offer_sent',
    commitment: 'commitment_received',
    customer: 'payment_received',
    lost: 'customer_lost',
  };
  return map[stage] ?? null;
}

export interface ContactCsvRow {
  displayName: string;
  company: string;
  role: string;
  profileUrl: string;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === ',' && !quoted) {
      cells.push(value.trim());
      value = '';
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
}

export function parseContactCsv(csv: string, limit = 100): ContactCsvRow[] {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase().replaceAll(' ', '_'));
  const indexOf = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const nameIndex = indexOf('name', 'display_name', 'prospect', 'contact');
  if (nameIndex < 0) return [];
  const companyIndex = indexOf('company', 'business', 'account');
  const roleIndex = indexOf('role', 'title', 'job_title');
  const urlIndex = indexOf('profile_url', 'url', 'linkedin', 'source_url');

  return lines.slice(1, limit + 1).map(parseCsvLine).map((cells) => ({
    displayName: (cells[nameIndex] ?? '').trim().slice(0, 160),
    company: companyIndex >= 0 ? (cells[companyIndex] ?? '').trim().slice(0, 200) : '',
    role: roleIndex >= 0 ? (cells[roleIndex] ?? '').trim().slice(0, 160) : '',
    profileUrl: urlIndex >= 0 ? (cells[urlIndex] ?? '').trim().slice(0, 2000) : '',
  })).filter((row) => row.displayName);
}

export function isFounderCycleSnapshot(value: unknown): value is FounderCycleSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.version === 1
    && typeof snapshot.generatedAt === 'string'
    && FOUNDER_LOOPS.includes(snapshot.recommendedLoop as FounderLoop)
    && FOUNDER_LOOPS.includes(snapshot.selectedLoop as FounderLoop)
    && Boolean(snapshot.evidence && typeof snapshot.evidence === 'object')
    && Boolean(snapshot.primaryAction && typeof snapshot.primaryAction === 'object');
}
