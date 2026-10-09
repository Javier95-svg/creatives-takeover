import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { evidenceCaseLabels, LEGACY_UNSCOPED_LABEL } from '../src/lib/evidenceCaseLabels.ts';

test('PMF Lab never shows "Unscoped evidence case" and every idea has a distinct name', () => {
  // A founder's real list: four cases from one afternoon, all stored with the old label.
  const cases = [
    { id: 'a', label: LEGACY_UNSCOPED_LABEL, created_at: '2026-10-08T16:32:26Z' },
    { id: 'b', label: LEGACY_UNSCOPED_LABEL, created_at: '2026-10-08T16:35:12Z' },
    { id: 'c', label: null, created_at: '2026-10-08T16:35:20Z' },
    { id: 'd', label: 'Guia.Social', created_at: '2026-10-08T17:22:55Z' },
  ];
  const labels = evidenceCaseLabels(cases);
  assert.equal(labels.get('a'), 'Idea started 8 Oct');
  assert.equal(labels.get('b'), 'Idea started 8 Oct (2)');
  assert.equal(labels.get('c'), 'Idea started 8 Oct (3)');
  assert.equal(labels.get('d'), 'Guia.Social');
  assert.equal(new Set(labels.values()).size, cases.length);
  for (const name of labels.values()) assert.ok(!name.includes('Unscoped'));
});

test('new cases are named, and starting another idea is a confirmed step', () => {
  const store = readFileSync(new URL('../src/lib/prebuildContext.ts', import.meta.url), 'utf8');
  assert.ok(!store.includes("'Unscoped evidence case'"), 'new cases must not get the jargon label');
  const page = readFileSync(new URL('../src/pages/PMFLabPage.tsx', import.meta.url), 'utf8');
  // The picker's "new idea" option opens the naming dialog instead of creating a case.
  assert.match(page, /if \(event\.target\.value === '__new'\) \{\s*openNewIdea\(\);/);
  assert.match(page, /creatingCaseRef\.current/);
  assert.match(page, /startNewCase\(projectContext\.project\?\.title \?\? null\)/);
});
