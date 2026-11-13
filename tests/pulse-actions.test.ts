import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTaskSuggestions } from '../src/lib/pulseActions.ts';

test('proposed tasks are validated: sane titles, real dates, no duplicates, at most two', () => {
  const tasks = parseTaskSuggestions({ tasks: [
    { title: '  "Interview five dental clinic owners." ', dueOn: '2026-11-20' },
    { title: 'interview five dental clinic owners', dueOn: null },
    { title: 'Draft the pricing page', dueOn: 'next week' },
    { title: 'Ship the scheduling flow', dueOn: null },
  ] });
  assert.deepEqual(tasks, [
    { title: 'Interview five dental clinic owners', dueOn: '2026-11-20' },
    { title: 'Draft the pricing page', dueOn: null },
  ]);
  assert.deepEqual(parseTaskSuggestions({ tasks: [{ title: 'ok' }, { title: 42 }, 'x', null] }), []);
  assert.deepEqual(parseTaskSuggestions([{ title: 'From a saved array', dueOn: '2026-01-01' }]), [{ title: 'From a saved array', dueOn: '2026-01-01' }]);
  assert.deepEqual(parseTaskSuggestions(undefined), []);
});
