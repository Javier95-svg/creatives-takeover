import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

// pulseRoutes.ts imports through the @/ alias, so the route list is checked in
// source. MVP Builder has its own chat; the Pulse bubble covered its preview.
test('the Pulse chatbot is not shown in MVP Builder', () => {
  const routes = readFileSync(new URL('../src/config/pulseRoutes.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(routes, /founderToolContext\('mvp_builder'/);
  assert.doesNotMatch(routes, /pathPrefix: ["']\/mvp-builder["']/);
  // The other core tools keep it.
  for (const key of ['icp_builder', 'pmf_lab', 'demo_studio', 'gtm_strategist', 'traction_engine']) {
    assert.match(routes, new RegExp(`founderToolContext\\('${key}'`));
  }
});
