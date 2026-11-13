import assert from 'node:assert/strict';
import test from 'node:test';
import { describePulseToolState, publishPulseToolState, readPulseToolState, validatePulseToolState } from '../src/lib/pulseToolState.ts';
import { demoStudioPulseState } from '../src/lib/demoStudio/pulseState.ts';
import type { DemoReadiness } from '../src/lib/demoStudio/readiness.ts';

const readiness = (ready: boolean[]): DemoReadiness => ({
  score: 0, ready: ready.every(Boolean), blockers: ready.every(Boolean) ? [] : ['Screen 2 needs a caption'], suggestions: [], missing: [],
  steps: ready.map((ok, index) => ({ stepId: `s${index}`, label: `Screen ${index + 1}`, ready: ok, missing: ok ? [] : ['caption'] })),
});

test('the demo editor publishes counts, blockers and status, and Pulse reads them back', () => {
  const state = demoStudioPulseState({ status: 'draft', readiness: readiness([true, false, true]), saveStatus: 'saved' });
  assert.equal(state.tool, 'demo_studio');
  assert.deepEqual(state.summary.screens, 3);
  assert.deepEqual(state.summary.screensNotReady, 1);
  assert.deepEqual(state.summary.screensNeedingWork, ['Screen 2: caption']);
  assert.equal(state.summary.published, false);
  publishPulseToolState(state);
  assert.equal(readPulseToolState(), state);
  publishPulseToolState(null);
  assert.equal(readPulseToolState(), null);
});

test('client-supplied state is bounded and typed before it reaches the model', () => {
  const valid = validatePulseToolState({ tool: 'demo_studio', summary: { screens: 3, blockers: ['a', 'b'], published: false, note: 'x'.repeat(500) }, asOf: '2026-11-13T10:00:00Z' });
  assert.ok(valid);
  assert.equal((valid!.summary.note as string).length, 200);
  assert.equal(valid!.asOf, '2026-11-13T10:00:00Z');
  assert.equal(validatePulseToolState({ tool: 'Demo Studio', summary: { screens: 3 } }), null, 'tool ids are capability ids');
  assert.equal(validatePulseToolState({ tool: 'demo_studio', summary: { nested: { deep: true } } }), null, 'nothing usable survives');
  assert.equal(validatePulseToolState({ tool: 'demo_studio', summary: { blob: 'y'.repeat(200), ...Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, 'z'.repeat(200)])) } }), null, 'over the size budget');
  assert.equal(validatePulseToolState('demo_studio'), null);
  const keys = validatePulseToolState({ tool: 'demo_studio', summary: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`k${i}`, i])) });
  assert.equal(Object.keys(keys!.summary).length, 12);
});

test('the greeting speaks to the state of the demo', () => {
  const at = (summary: Record<string, string | number | boolean | string[]>) => describePulseToolState({ tool: 'demo_studio', summary, asOf: '' });
  assert.match(at({ screens: 0 })!, /no screens yet/);
  assert.match(at({ screens: 5, screensNotReady: 2 })!, /2 of your 5 screens are not ready/);
  assert.match(at({ screens: 5, screensNotReady: 1 })!, /1 of your 5 screens is not ready/);
  assert.match(at({ screens: 4, screensNotReady: 0, published: false, readyToPublish: true })!, /still a draft/);
  assert.match(at({ screens: 4, screensNotReady: 0, published: true })!, /live/);
  assert.equal(describePulseToolState({ tool: 'pmf_lab', summary: { step: 2 }, asOf: '' }), null);
  assert.equal(describePulseToolState(null), null);
});
