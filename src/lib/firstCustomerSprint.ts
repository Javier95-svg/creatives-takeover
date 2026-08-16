import type {
  FirstCustomerSprintApplicationInput,
  FirstCustomerDecision,
  FirstCustomerEvidenceCounts,
  FirstCustomerMentorBrief,
  FirstCustomerMessageVariant,
  FirstCustomerMessageVariantKey,
  FirstCustomerSprint,
  FirstCustomerSprintContact,
  FirstCustomerSprintSnapshot,
} from '@/types/firstCustomerSprint';

export const FIRST_CUSTOMER_TARGETS = { prospects: 20, outreach: 10, conversations: 3, mentorCheckpoints: 1 } as const;

export function qualifyFirstCustomerSprintApplication(
  input: Pick<FirstCustomerSprintApplicationInput,
    'founderOwnsSales' | 'customerCount' | 'weeklyCapacityHours' | 'productStage' | 'targetOutcome'>,
): { qualified: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.founderOwnsSales) reasons.push('The participating founder must personally own sales.');
  if (input.customerCount < 0 || input.customerCount > 3) reasons.push('The pilot is for founders with 0–3 customers.');
  if (input.weeklyCapacityHours < 2) reasons.push('At least two weekly hours are required.');
  if (!['idea', 'concept_demo', 'working_product'].includes(input.productStage)) reasons.push('Select a valid product stage.');
  if (!['qualified_conversations', 'commitment', 'payment'].includes(input.targetOutcome)) reasons.push('Select a valid target outcome.');
  return { qualified: reasons.length === 0, reasons };
}

export function sprintEndDate(start: Date): Date {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 30);
  return end;
}

export function validateFirstCustomerIntake(input: {
  offer: string; targetSegment: string; problemHypothesis: string; proofUrl?: string;
  proofDescription?: string; estimatedCustomerValueUsd: number; weeklyCapacityHours: number;
}): string[] {
  const errors: string[] = [];
  if (input.offer.trim().length < 3) errors.push('Define the offer you want to test.');
  if (input.targetSegment.trim().length < 3) errors.push('Define a specific target buyer.');
  if (input.problemHypothesis.trim().length < 3) errors.push('State the customer problem hypothesis.');
  if (input.estimatedCustomerValueUsd < 0) errors.push('Estimated customer value cannot be negative.');
  if (!(input.weeklyCapacityHours >= 2)) errors.push('Reserve at least two hours each week.');
  return errors;
}

export function deterministicMessageVariants(input: {
  offer: string; targetSegment: string; problemHypothesis: string;
}): FirstCustomerMessageVariant[] {
  return [
    { key: 'discovery', label: 'Discovery-led', body: `Hi {{first_name}}, I am researching how ${input.targetSegment} handle ${input.problemHypothesis}. Would you be open to a 20-minute conversation? I am looking to learn, not pitch.` },
    { key: 'problem', label: 'Problem-led', body: `Hi {{first_name}}, I help ${input.targetSegment} address ${input.problemHypothesis}. Is this a priority for you right now? I would value 20 minutes to compare notes.` },
    { key: 'offer', label: 'Offer-led', body: `Hi {{first_name}}, I am testing ${input.offer} for ${input.targetSegment}. Would a short conversation be useful to see whether it fits how you work today?` },
  ];
}

export function personalizeSprintMessage(body: string, contact: Pick<FirstCustomerSprintContact, 'display_name' | 'company' | 'role'>): string {
  return body
    .replaceAll('{{first_name}}', contact.display_name.trim().split(/\s+/)[0] || 'there')
    .replaceAll('{{name}}', contact.display_name || 'there')
    .replaceAll('{{company}}', contact.company ?? 'your company')
    .replaceAll('{{role}}', contact.role ?? 'your role');
}

export function deriveFirstCustomerStep(input: {
  status: FirstCustomerSprint['status']; endsAt: string; selectedMessage: FirstCustomerMessageVariantKey | null;
  checkpointComplete: boolean; evidence: FirstCustomerEvidenceCounts; finalDecision?: FirstCustomerDecision | null; finalNotes?: string | null;
}, now = new Date()): NonNullable<FirstCustomerSprintSnapshot['derivedStep']> {
  if (input.status === 'completed') return 'completed';
  if (now.getTime() > new Date(input.endsAt).getTime()) return 'awaiting_final_review';
  if (input.evidence.attachedProspects < 10) return 'target_list';
  if (!input.selectedMessage) return 'message_preparation';
  if (!input.checkpointComplete) return 'mentor_checkpoint';
  if (input.evidence.contactedProspects < 10) return 'execution';
  return canCompleteFirstCustomerSprint(input.evidence, input.finalDecision, input.finalNotes) ? 'complete' : 'review';
}

export function canCompleteFirstCustomerSprint(
  evidence: FirstCustomerEvidenceCounts,
  decision?: FirstCustomerDecision | null,
  notes?: string | null,
): boolean {
  return evidence.conversations >= 3
    || evidence.commitments > 0
    || evidence.payments > 0
    || (evidence.contactedProspects >= 10
      && (decision === 'pivot' || decision === 'pause')
      && (notes?.trim().length ?? 0) >= 3);
}

export function buildFirstCustomerMentorBrief(
  sprint: FirstCustomerSprint,
  contacts: FirstCustomerSprintContact[],
  evidence: FirstCustomerEvidenceCounts,
  createdAt = new Date().toISOString(),
): FirstCustomerMentorBrief {
  return {
    version: 1,
    createdAt,
    sprintId: sprint.id,
    intake: {
      offer: sprint.offer ?? '', targetSegment: sprint.target_segment ?? '',
      problemHypothesis: sprint.problem_hypothesis ?? '',
      proof: sprint.proof_description ?? (sprint.proof_url ? 'Founder supplied a proof URL.' : ''),
      estimatedCustomerValueUsd: Number(sprint.estimated_customer_value_usd ?? 0),
      weeklyCapacityHours: Number(sprint.weekly_capacity_hours ?? 0),
    },
    evidence,
    contacts: contacts.map(({ role, stage }, index) => ({
      displayName: `Prospect ${index + 1}`,
      company: null,
      role,
      stage,
    })),
    messageVariants: sprint.message_variants,
    decisionQuestion: sprint.mentor_decision_question ?? 'What should I change before the next ten messages?',
  };
}

export function mentorBriefText(brief: FirstCustomerMentorBrief): string {
  const lines = [
    'FIRST CUSTOMER SPRINT — MENTOR CHECKPOINT',
    `Decision question: ${brief.decisionQuestion}`,
    '', `Offer: ${brief.intake.offer}`, `Target buyer: ${brief.intake.targetSegment}`,
    `Problem hypothesis: ${brief.intake.problemHypothesis}`, `Proof: ${brief.intake.proof}`,
    `Value: $${brief.intake.estimatedCustomerValueUsd} · Capacity: ${brief.intake.weeklyCapacityHours} hours/week`,
    '', `Evidence: ${brief.evidence.attachedProspects} prospects · ${brief.evidence.contactedProspects} sent · ${brief.evidence.replies} replies · ${brief.evidence.conversations} conversations · ${brief.evidence.commitments + brief.evidence.payments} commitments/payments`,
    '', 'Contact summary:',
    ...brief.contacts.map((contact) => `- ${contact.displayName}${contact.role ? `, ${contact.role}` : ''}${contact.company ? ` at ${contact.company}` : ''} — ${contact.stage}`),
    '', 'Message variants:',
    ...brief.messageVariants.flatMap((variant) => [`${variant.label}:`, variant.body, '']),
  ];
  return lines.join('\n');
}

export function isFirstCustomerSprintSnapshot(value: unknown): value is FirstCustomerSprintSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === 1 && typeof candidate.enrolled === 'boolean' && Array.isArray(candidate.contacts);
}
