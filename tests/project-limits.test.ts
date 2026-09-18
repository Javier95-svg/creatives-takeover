import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projectLimitForPlan, isProjectLimitError } from '../src/lib/projectLimits.ts';

test('plan limits match the rule', () => {
  assert.equal(projectLimitForPlan('rookie'), 1);
  assert.equal(projectLimitForPlan('starter'), 1);
  assert.equal(projectLimitForPlan('rising'), 3);
  assert.equal(projectLimitForPlan('pro'), 5);
});

test('an unknown plan gets the most restrictive limit', () => {
  // Matches the database, where the CASE falls through to 1. A plan we cannot
  // identify must never hand out more projects than the cheapest tier.
  for (const plan of [null, undefined, '', 'enterprise', 'legacy_tier']) {
    assert.equal(projectLimitForPlan(plan), 1, String(plan));
  }
  assert.equal(projectLimitForPlan(' PRO '), 5, 'plan names are normalised');
});

test('the client mirror agrees with project_limit_for_plan in the migration', () => {
  // Two copies of the same rule drift. The database is the authority, so assert
  // the numbers written there are the numbers shipped to the UI.
  const sql = readFileSync('supabase/migrations/20260917160000_one_outcome_per_project.sql', 'utf8');
  const limits = sql.slice(sql.indexOf('project_limit_for_plan'), sql.indexOf('enforce_project_limit'));
  assert.match(limits, /WHEN 'rising' THEN 3/);
  assert.match(limits, /WHEN 'pro' THEN 5/);
  assert.match(limits, /ELSE 1/);
});

test('the limit error is recognised so the founder sees guidance, not SQL', () => {
  assert.equal(isProjectLimitError(new Error('PROJECT_LIMIT_REACHED: this plan allows 1 active project(s).')), true);
  assert.equal(isProjectLimitError({ message: 'PROJECT_LIMIT_REACHED: ...' }), true);
  assert.equal(isProjectLimitError(new Error('network error')), false);
});
