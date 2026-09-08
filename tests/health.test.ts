import test from 'node:test';
import assert from 'node:assert/strict';

import health from '../api/health.ts';

test('health endpoint returns an uncached success response', async () => {
  const response = health();
  const body = await response.json() as { status: string; timestamp: string };

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(body.status, 'ok');
  assert.ok(Number.isFinite(Date.parse(body.timestamp)));
});
