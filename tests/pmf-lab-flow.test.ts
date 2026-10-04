import test from 'node:test';
import assert from 'node:assert/strict';

import { countPmfSignals } from '../src/lib/pmfConfidence.ts';
import { buildPmfAnswers, FIRST_READ_INTERVIEWS, getPmfNextStep, getPmfStepStatuses, type PmfProgressState } from '../src/lib/pmfNextStep.ts';
import type { PMFInterviewLog } from '../src/hooks/usePMFLab.ts';

const state = (overrides: Partial<PmfProgressState> = {}): PmfProgressState => ({
  interviewCount: 0,
  hasSurvey: false,
  surveyResponses: 0,
  hasResult: false,
  ...overrides,
});

const interview = (overrides: Partial<PMFInterviewLog> = {}): PMFInterviewLog => ({
  id: crypto.randomUUID(),
  intervieweeName: 'Ana',
  basicProfile: 'Runs a studio',
  segment: 'Studios',
  mainFeedback: 'Invoicing takes my whole Friday every week.',
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
  ...overrides,
});

test('a first-time founder is sent to customer conversations first', () => {
  const next = getPmfNextStep(state());
  assert.equal(next.step, 'talk');
  assert.equal(next.cta, 'Add a conversation');
});

test('the order is conversations, then the survey, then the verdict', () => {
  assert.equal(getPmfNextStep(state({ interviewCount: FIRST_READ_INTERVIEWS - 1 })).step, 'talk');
  assert.match(getPmfNextStep(state({ interviewCount: 3 })).title, /Log 2 more conversations/);
  assert.equal(getPmfNextStep(state({ interviewCount: FIRST_READ_INTERVIEWS })).step, 'ask');
  assert.equal(getPmfNextStep(state({ interviewCount: 5, hasSurvey: true })).cta, 'Copy the survey link');
  assert.equal(getPmfNextStep(state({ interviewCount: 5, hasSurvey: true, surveyResponses: 3 })).step, 'verdict');
  assert.equal(getPmfNextStep(state({ interviewCount: 5, hasSurvey: true, hasResult: true })).cta, 'Update my verdict');
});

test('every state produces exactly one next step and one current step', () => {
  for (const interviewCount of [0, 1, 4, 5, 12, 30]) {
    for (const hasSurvey of [false, true]) {
      for (const surveyResponses of hasSurvey ? [0, 2, 40] : [0]) {
        for (const hasResult of [false, true]) {
          const progress = state({ interviewCount, hasSurvey, surveyResponses, hasResult });
          const next = getPmfNextStep(progress);
          const statuses = getPmfStepStatuses(progress);
          const current = Object.entries(statuses).filter(([, status]) => status === 'current');
          assert.equal(current.length, 1, JSON.stringify(progress));
          assert.equal(current[0][0], next.step, JSON.stringify(progress));
          assert.ok(next.title && next.reason && next.cta);
        }
      }
    }
  }
});

test('one signal count, weighted like the scorer', () => {
  assert.equal(countPmfSignals({ interviews: 4, surveyResponses: 4 }), 7);
  assert.equal(countPmfSignals({ interviews: 0, surveyResponses: 0, demoBehaviors: 50 }), 7);
  assert.equal(countPmfSignals({ interviews: Number.NaN, surveyResponses: -3 }), 0);
});

test('the scorer payload is derived from the logged conversations', () => {
  const answers = buildPmfAnswers(
    [
      interview({ buyingIntent: 'ready_to_pay', askedAboutPricing: true }),
      interview({ interestLevel: 4, joinedWaitlist: true, referredSomeone: true }),
      interview({ buyingIntent: 'low', interestLevel: 2 }),
    ],
    {
      testTypes: ['Problem interview'],
      peopleReached: 0,
      mostPainfulQuote: '  Fridays are lost  ',
      whatWouldChangeMind: 'Nobody pays',
      confidenceLevel: 14,
    },
  );
  assert.equal(answers.conversationCount, 3);
  assert.equal(answers.peopleReached, 3);
  assert.equal(answers.strongInterestCount, 2);
  assert.equal(answers.askedAboutPricing, 1);
  assert.equal(answers.joinedWaitlist, 1);
  assert.equal(answers.sharedWithSomeone, 1);
  assert.equal(answers.offeredToPay, 0);
  assert.equal(answers.willingnessToPaySignal, 'yes');
  assert.equal(answers.mostPainfulQuote, 'Fridays are lost');
  assert.equal(answers.confidenceLevel, 10);
  assert.equal(buildPmfAnswers([], { testTypes: [], peopleReached: 0, mostPainfulQuote: '', whatWouldChangeMind: '', confidenceLevel: 5 }).willingnessToPaySignal, 'not_tested');
});
