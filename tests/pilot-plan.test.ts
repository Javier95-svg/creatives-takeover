import assert from 'node:assert/strict';
import test from 'node:test';

import { withPilotPlan } from '../src/config/planPermissions.ts';

test('a pilot plan raises the plan for the pilot and never lowers a paid one', () => {
  assert.equal(withPilotPlan('rookie', 'rising'), 'rising');
  assert.equal(withPilotPlan('starter', 'rising'), 'rising');
  assert.equal(withPilotPlan('pro', 'rising'), 'pro');
  assert.equal(withPilotPlan('rising', null), 'rising');
  assert.equal(withPilotPlan('rookie', undefined), 'rookie');
});
