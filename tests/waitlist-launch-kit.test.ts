import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  formatWaitlistLaunchKitPlainText,
  validateWaitlistLaunchKitInputs,
  validateWaitlistLaunchKitOutput,
  type WaitlistLaunchKitOutput,
} from '../src/lib/waitlistLaunchKit.ts';

const validKit: WaitlistLaunchKitOutput = {
  headlines: [
    {
      variant: 'A',
      headline: 'File Taxes Before Coffee',
      subheadline: 'Fondo helps freelance designers and developers file taxes quickly without hiring an accountant.',
      rationale: 'This angle leads with the time-saving outcome.',
    },
    {
      variant: 'B',
      headline: 'Stop Dreading Tax Season',
      subheadline: 'Built for freelance designers and developers who want clearer tax prep without the usual anxiety.',
      rationale: 'This angle names the pain users already feel.',
    },
    {
      variant: 'C',
      headline: 'Freelancers Deserve Calmer Taxes',
      subheadline: 'For freelance designers and developers, Fondo turns income tracking into a clearer monthly routine.',
      rationale: 'This angle speaks directly to audience identity.',
    },
  ],
  value_props: [
    { bullet: 'Save hours each month by knowing what tax prep needs next.' },
    { bullet: 'Track income clearly so quarterly payments stop feeling like guesswork.' },
    { bullet: 'Feel prepared when tax season shows up on your calendar.' },
  ],
  cta: {
    primary: 'Join Fondo Early',
    alternative_soft: 'See Early Access',
    alternative_urgency: 'Claim Priority Access',
  },
  email_sequence: [
    {
      email_number: 1,
      trigger: 'Immediately on signup',
      subject_line: 'You are on the Fondo list',
      preview_text: 'A calmer tax season starts before launch.',
      body: 'Thanks for joining Fondo early.\n\nWe are building for freelancers who want tax prep to feel manageable.\n\nShare Fondo with one freelancer who needs this.',
      in_email_cta: 'Share Fondo',
    },
    {
      email_number: 2,
      trigger: '3-5 days before launch (or when manually triggered)',
      subject_line: 'A closer look at Fondo',
      preview_text: 'Here is what early members will see first.',
      body: 'Tax prep gets harder when income is scattered.\n\nFondo is built to show what changed and what to set aside.\n\nYour spot is saved. Invite a friend to move faster.',
      in_email_cta: 'Invite a Friend',
    },
    {
      email_number: 3,
      trigger: 'Launch day',
      subject_line: 'Fondo is live today',
      preview_text: 'Your early access is ready now.',
      body: 'Fondo is live today.\n\nYou joined because filing taxes should not require an accountant or a lost weekend.\n\nOpen your early access and start with your income.',
      in_email_cta: 'Open Fondo',
    },
  ],
  referral_hook: {
    headline: 'Move Up With Friends',
    copy: 'Share Fondo with another freelancer. For every friend who joins, you move closer to early access.',
    cta: 'Share Your Link',
  },
  positioning_statement:
    'For freelance designers and developers, Fondo is the consumer app that helps file taxes in under 30 minutes, unlike spreadsheets which leave quarterly prep scattered.',
};

test('launch kit input validation trims values and caps secondary benefits', () => {
  const result = validateWaitlistLaunchKitInputs({
    product_name: ' Fondo ',
    one_line_description: ' Fondo helps freelancers file taxes. ',
    target_audience: ' Freelancers ',
    primary_benefit: ' File faster ',
    secondary_benefits: [' First ', ' Second ', ' Third '],
    product_category: 'Consumer App',
    tone_preference: 'friendly',
  });

  assert.equal(result.ok, true);
  assert.equal(result.value?.product_name, 'Fondo');
  assert.deepEqual(result.value?.secondary_benefits, ['First', 'Second']);
});

test('launch kit input validation rejects missing and invalid enum values', () => {
  const result = validateWaitlistLaunchKitInputs({
    product_name: '',
    one_line_description: 'Short',
    target_audience: 'Freelancers',
    primary_benefit: 'File faster',
    product_category: 'Invalid',
    tone_preference: 'loud',
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /product_name is required/);
  assert.match(result.errors.join('\n'), /product_category is invalid/);
  assert.match(result.errors.join('\n'), /tone_preference is invalid/);
  assert.match(result.errors.join('\n'), /complete sentence/);
});

test('launch kit output validation accepts the expected schema', () => {
  const result = validateWaitlistLaunchKitOutput(validKit);

  assert.equal(result.ok, true);
});

test('launch kit output validation catches length and placeholder failures', () => {
  const invalid = structuredClone(validKit);
  invalid.headlines[0].headline = 'This Headline Has More Than Ten Words And Should Fail Validation';
  invalid.email_sequence[0].subject_line = 'This subject line is intentionally far longer than fifty characters';
  invalid.referral_hook.copy = 'Share with [YOUR FRIEND]';

  const result = validateWaitlistLaunchKitOutput(invalid);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /headline exceeds 10 words/);
  assert.match(result.errors.join('\n'), /subject_line exceeds 50 characters/);
  assert.match(result.errors.join('\n'), /placeholder/);
});

test('launch kit plain text export excludes positioning statement', () => {
  const text = formatWaitlistLaunchKitPlainText(validKit);

  assert.match(text, /WAITLIST LAUNCH KIT/);
  assert.doesNotMatch(text, /spreadsheets which leave quarterly prep scattered/);
});

test('waitlist generator keeps legacy page copy path beside launch kit mode', () => {
  const source = readFileSync(new URL('../supabase/functions/waitlist-generator/index.ts', import.meta.url), 'utf8');

  assert.match(source, /requestBody\.mode === "launch_kit"/);
  assert.match(source, /Write copy for a waitlist page/);
  assert.match(source, /productName and pitch are required/);
});
