import test from 'node:test';
import assert from 'node:assert/strict';
import { onboardingSupportNeeds } from '../src/lib/onboardingSupportNeeds.ts';

test('founder goal and blocker become mentor-directory support areas', () => {
  assert.deepEqual(onboardingSupportNeeds('raise', 'fundraising'), ['Fundraising']);
  assert.deepEqual(onboardingSupportNeeds('build_product', 'prospect_access'), ['Business Development', 'Product Development']);
  assert.deepEqual(onboardingSupportNeeds('validate_problem', ''), ['Strategy']);
});
