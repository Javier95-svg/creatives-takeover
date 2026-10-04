import type { PMFInterviewLog } from '@/hooks/usePMFLab';
import type { PMFInterviewLeadSeed } from '@/components/pmf/PMFDiscoveryPipeline';

// Shared interview helpers for PMF Lab. These were private to the old five-step
// evidence form; the conversation list, the add sheet and the verdict step now
// all use the same definitions.

export const TEST_TYPES = [
  'Landing page',
  'Cold DM outreach',
  'Email outreach',
  'Concept pitch',
  'Problem interview',
  'Survey',
  'Prototype demo',
  'Offer / pricing page',
  'Other',
];

export const BUYING_INTENT_OPTIONS: Array<{ value: PMFInterviewLog['buyingIntent']; label: string }> = [
  { value: 'low', label: 'Not interested' },
  { value: 'medium', label: 'Some interest' },
  { value: 'high', label: 'Keen to try it' },
  { value: 'ready_to_pay', label: 'Ready to pay' },
];

/** What happened during the conversation, shown as one group of checkboxes. */
export const CONVERSATION_SIGNALS: Array<{ key: keyof Pick<PMFInterviewLog,
  'landingPageShown' | 'solutionPitched' | 'askedAboutPricing' | 'joinedWaitlist' | 'referredSomeone' | 'offeredToPay'>; label: string }> = [
  { key: 'solutionPitched', label: 'I described the solution' },
  { key: 'landingPageShown', label: 'They saw the page or demo' },
  { key: 'askedAboutPricing', label: 'They asked about price' },
  { key: 'joinedWaitlist', label: 'They joined the waitlist' },
  { key: 'referredSomeone', label: 'They referred someone' },
  { key: 'offeredToPay', label: 'They offered to pay' },
];

export const newInterviewId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createEmptyInterview = (): PMFInterviewLog => ({
  id: newInterviewId(),
  intervieweeName: '',
  basicProfile: '',
  segment: '',
  mainFeedback: '',
  objections: '',
  missingFeatures: '',
  interestLevel: 3,
  buyingIntent: 'medium',
  landingPageShown: false,
  solutionPitched: false,
  askedAboutPricing: false,
  joinedWaitlist: false,
  referredSomeone: false,
  offeredToPay: false,
});

/** Prefills a conversation from a lead found in customer discovery. */
export function interviewFromLead(lead: PMFInterviewLeadSeed): PMFInterviewLog {
  const source = lead.source || 'reddit';
  const descriptor = source === 'reddit'
    ? `Public Reddit participant${lead.subreddit ? ` from r/${lead.subreddit}` : ''}`
    : source === 'platform'
      ? 'Founder from the Creatives Takeover validation network'
      : 'Customer discovery lead';
  return {
    ...createEmptyInterview(),
    sourceLeadId: lead.sourceLeadId,
    intervieweeName: source === 'reddit' ? `u/${lead.username}` : lead.username,
    basicProfile: `${descriptor}${lead.permalink ? `. Source: ${lead.permalink}` : ''}`,
    segment: lead.subreddit
      ? `Reddit community: r/${lead.subreddit}`
      : source === 'platform'
        ? 'Platform validation network'
        : 'Customer discovery lead',
  };
}

/**
 * A conversation is worth saving once we know who it was with and what they said.
 * When the ICP has testable assumptions, the founder also records which one this
 * conversation confirmed or rejected.
 */
export function isInterviewComplete(interview: PMFInterviewLog, needsAssumption: boolean): boolean {
  return (
    interview.intervieweeName.trim().length > 0 &&
    interview.basicProfile.trim().length > 0 &&
    interview.mainFeedback.trim().length > 0 &&
    (!needsAssumption || Boolean(interview.assumptionFingerprint && interview.assumptionStatus))
  );
}
