import assert from 'node:assert/strict';
import test from 'node:test';

import { appLink } from '../supabase/functions/_shared/retention-cta-url.ts';

const appUrl = 'https://creatives-takeover.com';

test('retention CTA links stay on the application origin', () => {
  assert.equal(appLink('/dashboard/tasks', appUrl), `${appUrl}/dashboard/tasks`);
  assert.equal(appLink(`${appUrl}/dashboard/tasks`, appUrl), `${appUrl}/dashboard/tasks`);
  assert.equal(appLink('https://www.creativestakeover.com/dashboard/tasks', appUrl), undefined);
  assert.equal(appLink('https://creatives-takeover.com.evil.example/dashboard/tasks', appUrl), undefined);
  assert.equal(appLink('http://creatives-takeover.com/dashboard/tasks', appUrl), undefined);
  assert.equal(appLink('javascript:alert(1)', appUrl), undefined);
});
