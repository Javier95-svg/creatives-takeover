import test from 'node:test';
import assert from 'node:assert/strict';

import {
  redactSensitiveUrlParams,
  sanitizeAnalyticsValue,
} from '../src/lib/analyticsSanitization.ts';

test('resume and guest secrets are removed from direct and nested analytics URLs', () => {
  assert.equal(redactSensitiveUrlParams('/?resume=secret-token'), '/');
  assert.equal(
    redactSensitiveUrlParams('/icp-builder?unlock=1&guest=secret-token'),
    '/icp-builder?unlock=1',
  );
  assert.equal(
    redactSensitiveUrlParams('/login?source=hero&return=%2Ficp-builder%3Funlock%3D1%26guest%3Dsecret-token'),
    '/login?source=hero&return=%2Ficp-builder%3Funlock%3D1',
  );
});

test('nested capture properties drop raw secret and prompt keys', () => {
  const result = sanitizeAnalyticsValue({
    $current_url: 'https://creatives-takeover.com/?resume=secret-token',
    return_path: '/demo-studio/try?hydrate=1&guest=other-secret',
    meta: { resumeToken: 'secret-token', prompt: 'raw founder prompt', safe: true },
  }) as Record<string, unknown>;

  assert.equal(result.$current_url, 'https://creatives-takeover.com/');
  assert.equal(result.return_path, '/demo-studio/try?hydrate=1');
  assert.deepEqual(result.meta, { safe: true });
});
