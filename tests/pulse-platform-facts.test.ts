import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPulsePlatformFacts, describeUserPlan } from '../src/lib/pulsePlatformFacts.ts';

test('platform facts carry the live prices and name pages in words, never as paths', () => {
  const facts = buildPulsePlatformFacts();
  assert.match(facts, /Rising \(\$29\/month or \$239\/year, 250 credits\/month\)/);
  assert.match(facts, /Projects at once: Rookie 1, Starter 1, Rising 3, Pro 5/);
  assert.doesNotMatch(facts, /\s\/[a-z-]+\b/);
});

test("a known plan is described as the user's own situation; an unknown one is never guessed", () => {
  const starter = describeUserPlan('starter');
  assert.match(starter, /^USER'S PLAN \(verified from their account\): Starter \(\$9\/month\), 100 credits a month\./);
  assert.match(starter, /projects at once 1;/);
  assert.match(starter, /Find Your Angel locked \(Pro unlocks it\)/);
  assert.match(starter, /First Customer Proof preview only/);
  assert.match(describeUserPlan('pro'), /Find Your Angel full/);
  assert.match(describeUserPlan('rookie'), /Rookie \(free\), 50 credits a month/);
  assert.match(describeUserPlan(null), /unknown/);
  assert.doesNotMatch(describeUserPlan(null), /Rookie|Starter|Rising|\bPro\b/);
});
