import assert from 'node:assert/strict';
import test from 'node:test';

import {
  firstRealName, followUpMessage, isPlaceholderCaseName, outreachMessage, stageQuestion, VALIDATION_STAGES,
} from '../src/lib/pmfDiscoveryOutreach.ts';

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
