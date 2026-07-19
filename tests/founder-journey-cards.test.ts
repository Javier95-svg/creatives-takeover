import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/components/EntrepreneurProblems.tsx', import.meta.url),
  'utf8',
);

const actionBlock = source.match(/const journeyActions: JourneyAction\[\] = \[([\s\S]*?)\n\];/)?.[1] ?? '';

test('the task prioritization row promotes Dashboard with a coherent outcome', () => {
  assert.match(
    actionBlock,
    /to: "\/dashboard",[\s\S]*?title: "Open Your Dashboard",[\s\S]*?outcome: "Weekly focus",[\s\S]*?Prioritize tasks, track weekly progress, and stay accountable in one workspace\./,
  );
});

test('all founder journey cards expose complete, concise outcome copy', () => {
  const descriptions = [...actionBlock.matchAll(/description: "([^"]+)"/g)].map((match) => match[1]);
  const outcomes = [...actionBlock.matchAll(/outcome: "([^"]+)"/g)].map((match) => match[1]);

  assert.equal(descriptions.length, 7);
  assert.equal(outcomes.length, 7);
  descriptions.forEach((description) => {
    assert.ok(description.length <= 90, `Description is too long: ${description}`);
    assert.doesNotMatch(description, /\.\.\./);
  });
  assert.doesNotMatch(source, /line-clamp-3/);
  assert.doesNotMatch(source, /aspectRatio:\s*256\s*\/\s*135/);
});
