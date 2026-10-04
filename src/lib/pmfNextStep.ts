import type { PMFEvidenceAnswers, PMFInterviewLog } from '../hooks/usePMFLab.ts';
import { PMF_SIGNAL_THRESHOLDS } from './pmfConfidence.ts';

// PMF Lab used to offer about fifteen actions on first load, with three different
// "start here" suggestions. Everything now follows one order, decided here:
// talk to customers, then ask product users, then get the verdict.

export type PmfStepId = 'talk' | 'ask' | 'verdict';
export type PmfStepStatus = 'done' | 'current' | 'upcoming';

export interface PmfProgressState {
  interviewCount: number;
  hasSurvey: boolean;
  surveyResponses: number;
  hasResult: boolean;
}

export interface PmfNextStep {
  step: PmfStepId;
  title: string;
  reason: string;
  cta: string;
}

/** Conversations needed before a first, directional read is worth asking for. */
export const FIRST_READ_INTERVIEWS = PMF_SIGNAL_THRESHOLDS.directional;

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function getPmfNextStep(state: PmfProgressState): PmfNextStep {
  const interviews = Math.max(0, Math.floor(state.interviewCount));
  const responses = Math.max(0, Math.floor(state.surveyResponses));

  if (interviews === 0) {
    return {
      step: 'talk',
      title: 'Log your first customer conversation',
      reason: 'What real people tell you is the strongest evidence PMF Lab uses. Start with one conversation.',
      cta: 'Add a conversation',
    };
  }
  if (interviews < FIRST_READ_INTERVIEWS) {
    const left = FIRST_READ_INTERVIEWS - interviews;
    return {
      step: 'talk',
      title: `Log ${plural(left, 'more conversation', 'more conversations')}`,
      reason: `You have ${plural(interviews, 'conversation', 'conversations')}. ${FIRST_READ_INTERVIEWS} are enough for a first read.`,
      cta: 'Add a conversation',
    };
  }
  if (!state.hasSurvey) {
    return {
      step: 'ask',
      title: 'Ask people who have used your product',
      reason: 'One question tells you how many would be very disappointed without it. Above 40% is a strong sign.',
      cta: 'Create the survey',
    };
  }
  if (responses === 0 && !state.hasResult) {
    return {
      step: 'ask',
      title: 'Share your survey link',
      reason: 'Send it to people who have used your product. You can get your verdict while answers come in.',
      cta: 'Copy the survey link',
    };
  }
  return {
    step: 'verdict',
    title: state.hasResult ? 'Update your verdict' : 'Get your verdict',
    reason: state.hasResult
      ? 'Re-score after new conversations or survey answers to see whether the verdict changed.'
      : 'PMF Lab reads your conversations and survey answers and tells you whether to build, narrow, pivot or stop.',
    cta: state.hasResult ? 'Update my verdict' : 'Get my verdict',
  };
}

export function getPmfStepStatuses(state: PmfProgressState): Record<PmfStepId, PmfStepStatus> {
  const current = getPmfNextStep(state).step;
  const surveyDone = state.surveyResponses > 0 || (state.hasSurvey && current === 'verdict');
  return {
    talk: state.interviewCount >= FIRST_READ_INTERVIEWS ? 'done' : current === 'talk' ? 'current' : 'upcoming',
    ask: surveyDone ? 'done' : current === 'ask' ? 'current' : 'upcoming',
    verdict: current === 'verdict' ? 'current' : state.hasResult ? 'done' : 'upcoming',
  };
}

/** What the founder adds on top of the interviews before scoring. */
export interface PmfFounderInput {
  testTypes: string[];
  peopleReached: number;
  mostPainfulQuote: string;
  willingnessToPayDetail?: string;
  urgencyProxy?: string;
  consistencyNote?: string;
  founderUncertainties?: string;
  whatWouldChangeMind: string;
  confidenceLevel: number;
}

/**
 * Builds the scorer payload. The interview counts are derived exactly as the old
 * five-step form derived them, so pmf-evidence-scorer receives the same shape.
 */
export function buildPmfAnswers(interviews: PMFInterviewLog[], founder: PmfFounderInput): PMFEvidenceAnswers {
  const offeredToPay = interviews.filter((item) => item.offeredToPay).length;
  return {
    testTypes: founder.testTypes,
    peopleReached: Math.max(founder.peopleReached, interviews.length),
    conversationCount: interviews.length,
    interviews,
    strongInterestCount: interviews.filter(
      (item) => item.interestLevel >= 4 || item.buyingIntent === 'high' || item.buyingIntent === 'ready_to_pay',
    ).length,
    willingnessToPaySignal:
      offeredToPay > 0 || interviews.some((item) => item.buyingIntent === 'ready_to_pay')
        ? 'yes'
        : interviews.length > 0
          ? 'no'
          : 'not_tested',
    willingnessToPayDetail: founder.willingnessToPayDetail?.trim() || undefined,
    mostPainfulQuote: founder.mostPainfulQuote.trim(),
    urgencyProxy: founder.urgencyProxy?.trim() ?? '',
    consistencyNote: founder.consistencyNote?.trim() ?? '',
    askedAboutPricing: interviews.filter((item) => item.askedAboutPricing).length,
    joinedWaitlist: interviews.filter((item) => item.joinedWaitlist).length,
    sharedWithSomeone: interviews.filter((item) => item.referredSomeone).length,
    offeredToPay,
    founderUncertainties: founder.founderUncertainties?.trim() ?? '',
    whatWouldChangeMind: founder.whatWouldChangeMind.trim(),
    confidenceLevel: Math.min(10, Math.max(1, Math.round(founder.confidenceLevel))),
  };
}
