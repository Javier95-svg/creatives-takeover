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
    /to: "\/dashboard",[\s\S]*?title: "A plan for this week",[\s\S]*?outcome: "Dashboard",[\s\S]*?Your next tasks, weekly progress and the evidence you’ve collected, in one place\./,
  );
});

test("journey cards use the approved outcome labels", () => {
  // 2026-11-06: the title is the result, the chip names the tool.
  assert.match(source, /title: "Know who it’s for",[\s\S]*?outcome: "ICP Builder"/);
  assert.match(source, /title: "A clear decision on what to do next",[\s\S]*?outcome: "PMF Lab"/);
  assert.match(source, /title: "A shortlist of investors who fit",[\s\S]*?outcome: "VC Search"/);
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
