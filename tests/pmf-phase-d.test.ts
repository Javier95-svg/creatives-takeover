import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { fixedFollowUp } from '../supabase/functions/_shared/pmf-follow-up.ts';
import { buildSurveyOutreach, PMF_TARGET_RESPONSES } from '../src/lib/pmfOutreach.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('every answer gets a follow-up that fits it', () => {
  assert.equal(fixedFollowUp('very', 'FleetReceipts'), 'What would you miss most about FleetReceipts?');
  assert.equal(fixedFollowUp('somewhat', 'FleetReceipts'), 'What would make FleetReceipts a must-have for you?');
  assert.equal(fixedFollowUp('not', 'FleetReceipts'), 'What is missing, or what would you use instead?');
  assert.equal(fixedFollowUp('very', '  '), 'What would you miss most about it?');
});

test('the follow-up is capped per survey and never blocks a response', () => {
  const fn = read('supabase/functions/pmf-survey-respond/index.ts');
  assert.match(fn, /body\.action === "follow_up"/);
  assert.match(fn, /claim_pmf_follow_up_slot/);
  assert.match(fn, /if \(claimed !== true\) return json\(\{ success: true, question: fixed, source: "fixed" \}\)/);
  // Before the migration runs, the response is still saved without the follow-up.
  assert.match(fn, /insertError\.code === "42703"/);
  const sql = read('supabase/migrations/20261005120000_pmf_survey_follow_up.sql');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS follow_up_question text/);
  assert.match(sql, /follow_up_questions_generated < p_cap/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.claim_pmf_follow_up_slot\(uuid, integer\) TO service_role/);
});

test('the survey asks the follow-up and the lab shows the answers', () => {
  const page = read('src/pages/pmf/PMFSurveyPage.tsx');
  assert.match(page, /action: 'follow_up', slug: survey\.slug, seanEllisAnswer: answer/);
  assert.match(page, /followUpQuestion && followUpAnswer\.trim\(\) \? \{ followUpQuestion, followUpAnswer \}/);
  const hook = read('src/hooks/usePMFSurvey.ts');
  assert.match(hook, /follow_up_question, follow_up_answer/);
  assert.match(hook, /if \(error\) \(\{ data, error \} = await query\(columns\)\)/);
  assert.match(read('src/components/pmf/PMFSurveyStep.tsx'), /item\.followUpAnswer \|\| item\.mainBenefit/);
});

test('founders get ready-to-send messages with the survey link', () => {
  const messages = buildSurveyOutreach({ productName: 'FleetReceipts', audience: 'small fleet owners.', link: 'https://x.test/pmf-survey/abc' });
  assert.deepEqual(messages.map((message) => message.channel), ['Direct message', 'Email', 'Community post']);
  for (const message of messages) assert.match(message.text, /https:\/\/x\.test\/pmf-survey\/abc/);
  assert.match(messages[1].text, /for small fleet owners\. Your honest answer/);
  assert.equal(PMF_TARGET_RESPONSES, 25);
});
