import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('journey upgrade prompts cover the founder journey triggers', () => {
  const source = readFileSync(new URL('../src/hooks/useJourneyUpgradePrompt.ts', import.meta.url), 'utf8');
  const icpSource = readFileSync(new URL('../src/components/icp/ICPBuilder.tsx', import.meta.url), 'utf8');
  const waitlistSource = readFileSync(new URL('../src/components/waitlist/WaitlistEditor.tsx', import.meta.url), 'utf8');
  const pmfSource = readFileSync(new URL('../src/hooks/usePMFLab.ts', import.meta.url), 'utf8');

  assert.match(source, /rookie_icp_complete/);
  assert.match(source, /rookie_waitlist_published/);
  assert.match(source, /starter_pmf_complete/);
  assert.match(source, /rising_pitch_deck_heavy/);
  assert.match(icpSource, /fireJourneyUpgradePrompt\("rookie_icp_complete"\)/);
  assert.match(waitlistSource, /fireJourneyUpgradePrompt\('rookie_waitlist_published'\)/);
  assert.match(pmfSource, /fireJourneyUpgradePrompt\('starter_pmf_complete'\)/);
});

test('credit action quote and receipt helpers are exposed from useCreditActions', () => {
  const source = readFileSync(new URL('../src/hooks/useCreditActions.ts', import.meta.url), 'utf8');
  const analyticsSource = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');

  assert.match(source, /getCreditActionQuote/);
  assert.match(source, /showCreditReceipt/);
  assert.match(source, /status: CreditActionQuoteStatus/);
  assert.match(source, /trackCreditActionCompleted/);
  assert.match(analyticsSource, /journey_upgrade_prompt_shown/);
  assert.match(analyticsSource, /credit_cost_disclosed/);
  assert.match(analyticsSource, /credit_action_completed/);
  assert.match(analyticsSource, /credit_activity_viewed/);
});

test('metered tools disclose credit costs before action', () => {
  const costNoticeSource = readFileSync(new URL('../src/components/CreditCostNotice.tsx', import.meta.url), 'utf8');
  const waitlistSource = readFileSync(new URL('../src/components/waitlist/WaitlistEditor.tsx', import.meta.url), 'utf8');
  const gtmSource = readFileSync(new URL('../src/components/gtm/GTMIntakeForm.tsx', import.meta.url), 'utf8');
  const mvpSource = readFileSync(new URL('../src/components/mvp-builder/MVPBuilderChat.tsx', import.meta.url), 'utf8');
  const pitchSource = readFileSync(new URL('../src/components/pitch-deck-analyzer/PitchDeckUploader.tsx', import.meta.url), 'utf8');
  const promptSource = readFileSync(new URL('../src/pages/PromptLibrary.tsx', import.meta.url), 'utf8');

  assert.match(costNoticeSource, /Costs \$\{quote\.requiredCredits\} credits/);
  assert.match(waitlistSource, /feature="WAITLIST_GENERATION"/);
  assert.match(gtmSource, /feature="GTM_ANALYSIS"/);
  assert.match(mvpSource, /feature=\{isEmpty \? "APP_BUILDER_GENERATE" : "APP_BUILDER_REFINE"\}/);
  assert.match(pitchSource, /feature="PITCH_DECK_ANALYZER"/);
  assert.match(promptSource, /feature="PROMPT_GENERATION"/);
});

test('rookie pmf preview is no-charge and distinct from full analysis', () => {
  const source = readFileSync(new URL('../src/components/pmf/ProductMarketFitLab.tsx', import.meta.url), 'utf8');

  assert.match(source, /interface RookiePMFPreview/);
  assert.match(source, /This Rookie preview does not run the full AI analysis or spend credits/);
  assert.match(source, /Unlock full PMF Lab with Starter/);
  assert.match(source, /const requiredCredits = ensureCredits\('PMF_ANALYSIS'/);
});

test('account exposes credit activity from the existing credit history path', () => {
  const accountSource = readFileSync(new URL('../src/pages/Account.tsx', import.meta.url), 'utf8');
  const activitySource = readFileSync(new URL('../src/components/CreditActivityCard.tsx', import.meta.url), 'utf8');
  const displaySource = readFileSync(new URL('../src/components/CreditDisplay.tsx', import.meta.url), 'utf8');

  assert.match(accountSource, /<CreditActivityCard \/>/);
  assert.match(accountSource, /id="credit-activity"/);
  assert.match(activitySource, /fetchTransactionHistory\(25\)/);
  assert.match(activitySource, /balance_after/);
  assert.match(displaySource, /View credit activity/);
});
