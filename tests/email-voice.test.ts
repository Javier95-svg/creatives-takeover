import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';

import { cleanCopy, cleanFact, findVoiceViolations, renderPlainEmail } from '../supabase/functions/_shared/email-voice.ts';
import { EMPTY_FACTS, factKeys, firstNameFrom, loadProjectFacts, pickRoutineHabit, type ProjectFacts } from '../supabase/functions/_shared/retention-project-facts.ts';
import { buildSequenceCopy, finalizeCopy, SEQUENCE_TYPES, taskFromHeadline, type ActivationIntent, type SequenceHints } from '../supabase/functions/_shared/retention-sequence-copy.ts';
import { aiCopyArm, anchorFacts, buildPersonalizerPrompt, parseAiCopyMode, shouldUseAi, validatePersonalizedCopy } from '../supabase/functions/_shared/retention-personalizer.ts';

const DASH = /[—―–−]|\s-+\s/;

const fullFacts: ProjectFacts = {
  firstName: 'Erik',
  projectTitle: 'Fleetpay',
  ideaSummary: 'Expense tracking for small delivery fleets',
  customer: 'owners of delivery fleets with 5 to 20 vans',
  gtmPlanTitle: 'Fleet owner outreach',
  routineGoal: 'validate your idea',
  routineHabit: 'Talk to 2 fleet owners',
  todayTask: 'Call the three fleet owners from Tuesday',
  daysAway: 9,
};

const hintsFor = (intent?: ActivationIntent): SequenceHints => ({
  intent,
  mentorName: 'Ana Ruiz',
  unreadMessageCount: 2,
  savedMentorCount: 3,
  headline: 'Start here: Call the three fleet owners from Tuesday',
  weeklyCommitment: 'Interview 5 fleet owners',
  weeklyOutcome: 'Completed',
  weeklyOutcomeState: 'completed',
  activeDaysLast14: 6,
  suggestedFocus: 'Turn the interviews into one pricing test.',
});

const INTENTS: Array<ActivationIntent | undefined> = [undefined, 'save_mentor', 'send_message', 'book_call', 'run_icp', 'build_demo'];

// Every email sender (any function that calls resend.emails.send) plus the shared
// email copy modules. Comments are stripped: only text that can reach a user counts.
function emailSourceFiles(): string[] {
  const root = new URL('../supabase/functions/', import.meta.url);
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const index = new URL(`${entry.name}/index.ts`, root);
    if (existsSync(index) && readFileSync(index, 'utf8').includes('emails.send')) files.push(`${entry.name}/index.ts`);
  }
  return [
    ...files,
    '_shared/email-voice.ts',
    '_shared/retention-sequence-copy.ts',
    '_shared/retention-personalizer.ts',
    '_shared/roadmap-retention.ts',
  ];
}

const withoutComments = (source: string) => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\s\/\/\s.*$/gm, '');

// Pending cleanup, left out of the retention release on purpose: editing a
// function redeploys it from main, and these are transactional or not deployed.
// Remove an entry when that function next ships.
const KNOWN_UNDEPLOYED = new Set([
  'process-icp-guest-drip/index.ts',
  'change-password/index.ts',
  'delete-account/index.ts',
  'send-article-notification-email/index.ts',
  'demo-studio-lead/index.ts',
]);

test('no email sender puts an em or en dash in user-facing text', () => {
  const offenders: string[] = [];
  for (const file of emailSourceFiles()) {
    if (KNOWN_UNDEPLOYED.has(file)) continue;
    const source = withoutComments(readFileSync(new URL(`../supabase/functions/${file}`, import.meta.url), 'utf8'));
    source.split('\n').forEach((line, index) => {
      if (/[—–]/.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test('cleanCopy turns dash punctuation into commas but keeps in-word hyphens', () => {
  assert.equal(cleanCopy('Your routine is set up — time to use it'), 'Your routine is set up, time to use it');
  assert.equal(cleanCopy('It takes a minute – and it starts the streak'), 'It takes a minute, and it starts the streak');
  assert.equal(cleanCopy('A follow-up call - booked'), 'A follow-up call, booked');
  assert.equal(cleanCopy('  spaced   out  '), 'spaced out');
  assert.equal(cleanFact('x'.repeat(10) + ' ' + 'y'.repeat(100), 40)?.endsWith('...'), true);
  assert.equal(cleanFact('   '), null);
});

test('voice check catches dashes, hype words, exclamations, arrows and emoji', () => {
  assert.deepEqual(findVoiceViolations('Your plan for today is ready.'), []);
  assert.ok(findVoiceViolations('Set up — now').includes('dash'));
  assert.ok(findVoiceViolations('Build momentum').includes('phrase:momentum'));
  assert.ok(findVoiceViolations('Your founder journey').includes('phrase:journey'));
  assert.ok(findVoiceViolations('Great job!').includes('exclamation'));
  assert.ok(findVoiceViolations('Open Dashboard →').includes('arrow'));
  assert.ok(findVoiceViolations('Nice work 🎉').includes('emoji'));
  assert.ok(findVoiceViolations('You created a real return trigger').includes('phrase:return trigger'));
});

test('every sequence and intent renders clean copy with and without project facts', () => {
  for (const sequence of SEQUENCE_TYPES) {
    for (const intent of INTENTS) {
      for (const facts of [fullFacts, { ...EMPTY_FACTS }]) {
        const hints = facts === fullFacts ? hintsFor(intent) : { intent };
        const copy = finalizeCopy(buildSequenceCopy(sequence, facts, hints));
        const label = `${sequence}/${intent ?? 'none'}/${facts === fullFacts ? 'facts' : 'empty'}`;
        assert.ok(copy.subject.length >= 8 && copy.subject.length <= 70, `${label} subject length: ${copy.subject}`);
        assert.ok(copy.opener.length > 10, `${label} opener`);
        for (const text of [copy.subject, copy.opener, ...copy.followUp, copy.defaultCtaLabel]) {
          assert.deepEqual(findVoiceViolations(text), [], `${label}: ${text}`);
          assert.doesNotMatch(text, /undefined|null|\$\{/, `${label}: ${text}`);
        }
      }
    }
  }
});

test('project facts make it into the emails that matter', () => {
  const routine = buildSequenceCopy('routine_reminder', fullFacts);
  assert.equal(routine.subject, 'Your routine for Fleetpay');
  assert.match(routine.opener, /validate your idea/);
  assert.match(routine.opener, /"Talk to 2 fleet owners"/);

  const digest = buildSequenceCopy('task_plan_digest', { ...fullFacts, todayTask: null }, { headline: 'Start here: Email two pilot customers' });
  assert.match(digest.opener, /"Email two pilot customers"/);
  assert.equal(taskFromHeadline("Start here: Open today's founder plan."), null);

  const icp = buildSequenceCopy('activation_day2', fullFacts, { intent: 'run_icp' });
  assert.match(icp.opener, /owners of delivery fleets/);
  assert.equal(icp.subject, 'Next step for Fleetpay');
});

test('caller headlines with internal language never reach the email body', () => {
  const copy = buildSequenceCopy('activation_day0', fullFacts, {
    intent: 'book_call',
    headline: 'Your mentor-message path is active - use it to unlock your next move',
  });
  const all = [copy.subject, copy.opener, ...copy.followUp].join(' ');
  assert.doesNotMatch(all, /unlock|mentor-message path/);
});

test('the plain layout escapes content, signs as Javier and has no arrows or team sign-off', () => {
  const email = renderPlainEmail({
    greeting: 'Hi Erik,',
    paragraphs: ['Your plan <b>for</b> today — is ready.'],
    ctaLabel: 'Open my plan',
    ctaUrl: 'https://creatives-takeover.com/dashboard?a=1&b=2',
    preferencesUrl: 'https://creatives-takeover.com/prefs',
    unsubscribeUrl: 'https://creatives-takeover.com/unsubscribe?t=1',
  });
  assert.match(email.html, /&lt;b&gt;for&lt;\/b&gt;/);
  assert.match(email.html, /a=1&amp;b=2/);
  assert.match(email.html, /Javier<br>Creatives Takeover/);
  assert.doesNotMatch(email.html + email.text, /[—–→]|The Creatives Takeover team/i);
  assert.match(email.text, /Open my plan: https:\/\/creatives-takeover.com\/dashboard\?a=1&b=2/);
  assert.match(email.text, /Unsubscribe: /);
});

test('first names and routine habits are read defensively', () => {
  assert.equal(firstNameFrom('javier alonso'), 'Javier');
  assert.equal(firstNameFrom(null, 'erik.k@example.com'), 'Erik.k');
  assert.equal(firstNameFrom('  ', null), 'there');
  const config = { tasks: [
    { title: 'Weekly review', days: [1], order: 2, active: true },
    { title: 'Talk to a customer', days: [0, 1, 2, 3, 4, 5, 6], order: 1, active: true },
    { title: 'Old habit', days: [3], order: 0, active: false },
  ] };
  assert.equal(pickRoutineHabit(config, new Date('2026-10-05T12:00:00Z')), 'Talk to a customer');
  assert.equal(pickRoutineHabit(null), null);
});

test('loadProjectFacts survives a missing table and reports only fact names', async () => {
  const rows: Record<string, unknown> = {
    profiles: { full_name: 'Erik Kuiper', routine_primary_goal: 'launch_product', routine_config: { tasks: [{ title: 'Ship one fix', days: [0, 1, 2, 3, 4, 5, 6], order: 0 }] }, last_seen_at: '2026-09-25T00:00:00Z' },
    projects: { title: 'Fleetpay — beta', idea_summary: 'Expense tracking for fleets' },
    icp_analysis_results: { target_audience: null, business_description: 'Small delivery fleet owners' },
  };
  const query = (table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'is', 'order', 'limit']) chain[method] = () => chain;
    chain.maybeSingle = async () => table === 'gtm_plans'
      ? { data: null, error: { message: 'relation "gtm_plans" does not exist' } }
      : { data: rows[table] ?? null, error: null };
    return chain;
  };
  const facts = await loadProjectFacts({ from: query }, 'user-1', undefined, Date.parse('2026-10-03T00:00:00Z'));
  assert.equal(facts.firstName, 'Erik');
  assert.equal(facts.projectTitle, 'Fleetpay, beta');
  assert.equal(facts.customer, 'Small delivery fleet owners');
  assert.equal(facts.gtmPlanTitle, null);
  assert.equal(facts.routineGoal, 'launch your product');
  assert.equal(facts.routineHabit, 'Ship one fix');
  assert.equal(facts.todayTask, null);
  assert.equal(facts.daysAway, 8);
  assert.deepEqual(factKeys(facts).sort(), ['customer', 'daysAway', 'ideaSummary', 'projectTitle', 'routineGoal', 'routineHabit']);
});

test('AI copy is off unless explicitly enabled, and split 50/50 in experiment mode', () => {
  assert.equal(parseAiCopyMode(undefined), 'off');
  assert.equal(parseAiCopyMode('yes'), 'off');
  assert.equal(parseAiCopyMode(' Experiment '), 'experiment');
  const input = { facts: fullFacts, hints: {} };
  assert.equal(shouldUseAi('off', 'u1', input), false);
  assert.equal(shouldUseAi('on', 'u1', input), true);
  assert.equal(shouldUseAi('on', 'u1', { facts: { ...EMPTY_FACTS }, hints: {} }), false, 'no facts means nothing to personalize');
  const arms = Array.from({ length: 400 }, (_, i) => aiCopyArm(`user-${i}`));
  const share = arms.filter((arm) => arm === 'ai').length / arms.length;
  assert.ok(share > 0.4 && share < 0.6, `ai share ${share}`);
  assert.equal(aiCopyArm('stable'), aiCopyArm('stable'));
});

test('the prompt carries only present facts, marked as data', () => {
  const template = finalizeCopy(buildSequenceCopy('routine_reminder', fullFacts));
  const prompt = buildPersonalizerPrompt({ sequence: 'routine_reminder', facts: { ...fullFacts, gtmPlanTitle: null }, hints: {}, template, ctaLabel: 'Open my routine' });
  assert.match(prompt, /<facts>[\s\S]*"project": "Fleetpay"[\s\S]*<\/facts>/);
  assert.doesNotMatch(prompt, /goToMarketPlan/);
  assert.deepEqual(anchorFacts({ facts: EMPTY_FACTS, hints: {} }), []);
});

test('the validator accepts grounded copy and rejects every kind of drift', () => {
  const input = { facts: fullFacts, hints: { mentorName: 'Ana Ruiz' } };
  const good = { subject: 'Your Fleetpay routine for today', paragraph: 'Your routine to validate your idea is ready. Today\'s habit is "Talk to 2 fleet owners", and one check-in is enough.' };
  const result = validatePersonalizedCopy(good, input);
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);

  const reject = (override: Partial<typeof good>, problem: RegExp) => {
    const outcome = validatePersonalizedCopy({ ...good, ...override }, input);
    assert.equal(outcome.ok, false);
    assert.ok(outcome.problems.some((p) => problem.test(p)), `${JSON.stringify(override)} -> ${outcome.problems}`);
  };
  reject({ paragraph: 'Your Fleetpay routine is ready — one check-in today is enough.' }, /^dash$/);
  reject({ paragraph: 'Keep the momentum going on Fleetpay with one check-in today.' }, /phrase:momentum/);
  reject({ paragraph: 'Fleetpay is close. Maria from Stripe said fleet owners love it.' }, /invented_name:(Maria|Stripe)/);
  reject({ paragraph: 'Fleetpay already has 40 fleet owners waiting for your check-in today.' }, /invented_number:40/);
  reject({ paragraph: 'Your routine is ready and one check-in today is enough to keep going.' }, /no_fact/);
  reject({ paragraph: 'Hi Erik, your Fleetpay routine is ready for one check-in.' }, /greeting/);
  reject({ paragraph: 'Fleetpay is ready. See https://example.com for the routine you set up.' }, /link/);
  reject({ subject: 'Hi' }, /subject_length/);
  reject({ paragraph: 'Fleetpay one. Two. Three. Four sentences is too many for this.' }, /too_many_sentences/);
  assert.deepEqual(validatePersonalizedCopy('not json', input).problems, ['shape']);
  assert.ok(!DASH.test(good.paragraph));
});
