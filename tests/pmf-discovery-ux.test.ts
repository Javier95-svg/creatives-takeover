import assert from 'node:assert/strict';
import test from 'node:test';

import {
  firstRealName, followUpMessage, isPlaceholderCaseName, outreachMessage, stageQuestion, VALIDATION_STAGES,
} from '../src/lib/pmfDiscoveryOutreach.ts';
import {
  conversationProgress, followUpDate, followUpLabel, followUpState, groupConversations, nextAction, tabFor,
  type ConversationLead,
} from '../src/lib/pmfConversations.ts';
import { buildSequenceCopy } from '../supabase/functions/_shared/retention-sequence-copy.ts';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('stages are asked as plain questions, keeping the stored values', () => {
  assert.deepEqual(VALIDATION_STAGES.map((stage) => stage.value), ['problem_discovery', 'solution_validation', 'pricing']);
  assert.equal(stageQuestion('pricing'), 'Would they pay for it?');
  assert.equal(stageQuestion(null), 'Is the problem real?');
});

test('placeholder idea names never pre-fill the product', () => {
  for (const placeholder of ['Unscoped evidence case', 'Idea started 3 Oct', 'Idea started 3 Oct (3)', 'Untitled idea', 'My project', '', '   ', null]) {
    assert.equal(isPlaceholderCaseName(placeholder), true, String(placeholder));
  }
  assert.equal(isPlaceholderCaseName('Throughline'), false);
  assert.equal(firstRealName('Unscoped evidence case', 'Throughline'), 'Throughline');
  assert.equal(firstRealName(null, 'Untitled idea'), '');
});

test('the discovery page passes its idea to the search, which refuses to run without one', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const hook = read('src/hooks/useCustomerDiscovery.ts');
  assert.match(hook, /if \(!user \|\| !validationContextId\) \{/);
  // Called as useCustomerDiscovery() from 1 Aug 2026, every search stopped there.
  assert.match(read('src/components/pmf/PMFCustomerDiscovery.tsx'), /useCustomerDiscovery\(validationContextId, originatingHandoffId\)/);
  assert.match(read('src/pages/PMFLabPage.tsx'), /<PMFCustomerDiscovery\s+key=\{validationContextId\}\s+validationContextId=\{validationContextId\}\s+originatingHandoffId=\{originatingHandoffId\}/);
});

const now = new Date(2026, 9, 15, 12, 0, 0);
const lead = (id: string, status: ConversationLead['status'], extra: Partial<ConversationLead> = {}): ConversationLead =>
  ({ id, status, rank_score: 50, last_seen_at: '2026-10-10T00:00:00Z', follow_up_at: null, ...extra });

test('conversations group into four tabs, with due follow-ups first and not-a-fit kept apart', () => {
  assert.equal(tabFor('new'), 'to_contact');
  assert.equal(tabFor('saved'), 'to_contact');
  assert.equal(tabFor('interview_scheduled'), 'booked');
  assert.equal(tabFor('dismissed'), null);

  const { groups, dismissed } = groupConversations([
    lead('later', 'contacted', { follow_up_at: new Date(2026, 9, 20, 9).toISOString() }),
    lead('overdue', 'contacted', { follow_up_at: new Date(2026, 9, 13, 9).toISOString() }),
    lead('today', 'contacted', { follow_up_at: new Date(2026, 9, 15, 9).toISOString() }),
    lead('low', 'new', { rank_score: 10 }),
    lead('high', 'saved', { rank_score: 90 }),
    lead('gone', 'dismissed'),
  ], now);
  assert.deepEqual(groups.contacted.map((item) => item.id), ['overdue', 'today', 'later']);
  assert.deepEqual(groups.to_contact.map((item) => item.id), ['high', 'low']);
  assert.deepEqual(dismissed.map((item) => item.id), ['gone']);
});

test('each person has one next step, and follow-ups read in plain words', () => {
  assert.equal(nextAction('new').action, 'write_message');
  assert.equal(nextAction('contacted').label, 'They replied: book an interview');
  assert.equal(nextAction('interview_scheduled').action, 'log_interview');
  assert.equal(nextAction('interviewed').action, 'see_evidence');
  assert.equal(nextAction('dismissed').action, 'restore');

  const reminder = followUpDate(3, now);
  assert.equal(reminder.getDate(), 18);
  assert.equal(reminder.getHours(), 9);
  assert.equal(followUpState(lead('x', 'contacted', { follow_up_at: reminder.toISOString() }), now), 'upcoming');
  // A reminder only matters while waiting for a reply.
  assert.equal(followUpState(lead('x', 'interview_scheduled', { follow_up_at: reminder.toISOString() }), now), null);
  assert.equal(followUpLabel(new Date(2026, 9, 15, 9).toISOString(), now), 'Follow up today');
  assert.equal(followUpLabel(new Date(2026, 9, 16, 9).toISOString(), now), 'Follow up tomorrow');
  assert.equal(followUpLabel(new Date(2026, 9, 1, 9).toISOString(), now), 'Follow-up overdue');
});

test('progress counts conversations against the five a first read needs', () => {
  const progress = conversationProgress([
    lead('a', 'new'), lead('b', 'saved'),
    lead('c', 'contacted', { follow_up_at: new Date(2026, 9, 14, 9).toISOString() }),
    lead('d', 'contacted', { follow_up_at: new Date(2026, 9, 30, 9).toISOString() }),
  ], 2, now);
  assert.deepEqual(progress, { interviews: 2, target: 5, percent: 40, toContact: 2, followUpsDue: 1 });
  assert.equal(conversationProgress([], 9, now).percent, 100);
});

test('the follow-up email names the person and points to Customer Discovery', () => {
  const facts = { firstName: 'Maya', projectTitle: 'Invoice Nudge' } as Parameters<typeof buildSequenceCopy>[1];
  const discovery = buildSequenceCopy('follow_up_due', facts, { followUpName: 'u/ana_designs', followUpKind: 'discovery' });
  assert.equal(discovery.subject, 'Time to follow up with u/ana_designs');
  assert.match(discovery.opener, /reached out to u\/ana_designs on Invoice Nudge/);
  assert.match(discovery.followUp[0], /Customer Discovery/);
  const investor = buildSequenceCopy('follow_up_due', facts, { followUpKind: 'investor' });
  assert.equal(investor.subject, 'Your investor follow-up is due');
});

test('reminders are scheduled with the person, and reach the founder', () => {
  const leadsLib = source('src/lib/pmfDiscoveryLeads.ts');
  assert.match(leadsLib, /reasonKey: 'discovery_follow_up_due'/);
  assert.match(leadsLib, /ctaUrl: `\/pmf-lab\?mode=discover&lead=\$\{encodeURIComponent\(lead\.id\)\}`/);
  assert.match(leadsLib, /metadata: \{ name: leadDisplayHandle\(lead\), kind: 'discovery' \}/);
  // Booking, logging or dismissing someone clears their reminder.
  assert.match(source('src/hooks/useDiscoveryLeads.ts'), /if \(lead && status !== 'contacted'\) \{\s*await clearLeadFollowUp/);

  const cues = source('supabase/functions/process-return-cues/index.ts');
  assert.match(cues, /if \(!isServiceRoleToken\(authorization, serviceKey\) && \(!cronSecret \|\| suppliedCron !== cronSecret\)\)/);
  assert.match(cues, /sequence: 'follow_up_due'/);
  assert.doesNotMatch(cues, /sequence: 'progress_nudge'/);
  // The role claim is only trusted behind the gateway's signature check.
  assert.match(source('supabase/config.toml'), /\[functions\.process-return-cues\][^[]*verify_jwt = true/);

  const migration = source('supabase/migrations/20261016120000_discovery_follow_ups.sql');
  assert.match(migration, /ADD COLUMN IF NOT EXISTS follow_up_at timestamptz/);
  assert.match(migration, /WHEN 'discovery_follow_up_due' THEN left\('Time to follow up with '/);
  assert.match(migration, /'Authorization', 'Bearer ' \|\| \(SELECT value FROM private\.service_config WHERE key = 'supabase_service_key'\)/);
  assert.doesNotMatch(migration, /return_cue_cron_secret/);
});

test('a Rooms question is drafted for the stage, in the matching room', async () => {
  const { askRoom, draftCommunityQuestion, PMF_DISCOVERY_ORIGIN } = await import('../src/lib/pmfCommunityAsk.ts');
  assert.deepEqual([askRoom('problem_discovery').room, askRoom('solution_validation').room, askRoom('pricing').room], ['customers', 'product', 'pricing']);
  const draft = draftCommunityQuestion({ stage: 'problem_discovery', audience: 'freelance designers', problem: 'Clients pay invoices weeks late.' });
  assert.equal(draft.title, 'Freelance designers: does this happen to you?');
  assert.match(draft.body, /freelance designers have:\n\nClients pay invoices weeks late\.\n\n/);
  assert.match(draft.body, /No pitch/);
  assert.equal(draft.kind, 'discussion');
  assert.equal(draftCommunityQuestion({ stage: 'pricing', audience: '', problem: 'x' }).title, 'Founders: what does this cost you today?');
  assert.equal(PMF_DISCOVERY_ORIGIN, 'pmf_discovery');

  // The rooms used must exist.
  const topics = source('src/lib/launchpadTopics.ts');
  for (const room of ['customers', 'product', 'pricing']) assert.match(topics, new RegExp(`slug: '${room}'`));
});

test('asking in Rooms keeps the founder on PMF Lab, links the post to the idea and turns replies into people', () => {
  const composer = source('src/components/launchpad/PostComposerDialog.tsx');
  assert.match(composer, /if \(onPublished\) onPublished\(id\);\s*else navigate\(postPath\(id\)\);/);
  assert.match(composer, /setTitle\(initialTitle \?\? ''\);\s*setContent\(initialBody \?\? ''\);/);
  // source_type only allows legacy values, so the origin lives in source_data.
  const launchpad = source('src/lib/launchpad.ts');
  assert.match(launchpad, /source_type: 'manual',\s*source_data: input\.source \? \{ origin: input\.source\.origin, \.\.\.\(input\.source\.data \?\? \{\}\) \} : null/);
  assert.match(launchpad, /\.contains\('source_data', source\)/);

  const ask = source('src/components/pmf/PMFAskCommunity.tsx');
  assert.match(ask, /const source = \{ origin: PMF_DISCOVERY_ORIGIN, validationContextId \};/);
  assert.match(ask, /filter\(\(comment\) => comment\.user_id !== user\?\.id\)/);
  assert.match(ask, /upsertPlatformLead\(user\.id, \{\s*platformUserId: comment\.user_id/);
  const discovery = source('src/components/pmf/PMFCustomerDiscovery.tsx');
  // The free way comes before the paid one.
  assert.ok(discovery.indexOf('<PMFAskCommunity') < discovery.indexOf('Search Reddit, Hacker News and the web'));
  assert.match(source('src/lib/pmfDiscoveryLeads.ts'), /platform: 'Rooms'/);
});

test('outreach messages fill the name, community and demo link', () => {
  const problem = outreachMessage({ stage: 'problem_discovery', name: 'u/ana', community: 'r/freelance' });
  assert.match(problem, /^Hi u\/ana, I saw your post in r\/freelance/);
  assert.match(problem, /No pitch/);

  const solution = outreachMessage({ stage: 'solution_validation', name: 'ana', community: '', demoUrl: 'https://demo.test' });
  assert.match(solution, /your community/);
  assert.match(solution, /Here it is: https:\/\/demo\.test$/);
  // A demo link only belongs in the solution message.
  assert.doesNotMatch(outreachMessage({ stage: 'pricing', name: 'ana', demoUrl: 'https://demo.test' }), /demo\.test/);

  const custom = outreachMessage({ stage: 'problem_discovery', name: 'ana', community: 'r/x', template: 'Hey {{ name }} from {{subreddit}}!' });
  assert.equal(custom, 'Hey ana from r/x!');
  assert.match(followUpMessage('ana'), /^Hi ana, just following up/);
});
