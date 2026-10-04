import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { getDemoReadiness, isValidDemoDestination, resolveGotoTarget } from '../src/lib/demoStudio/readiness.ts';
import { createSaveQueue } from '../src/lib/demoStudio/saveQueue.ts';
import { getDemoProjectNextStep } from '../src/lib/demoStudio/nextStep.ts';
import type { DemoStepWithHotspots, DemoStudioHotspot } from '../src/lib/demoStudio/types.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const hotspot = (overrides: Partial<DemoStudioHotspot> = {}): DemoStudioHotspot => ({
  id: 'h1', step_id: 's1', x: 0.1, y: 0.1, w: 0.2, h: 0.1, type: 'hotspot', label: 'Create project',
  action: 'next', action_target: null, created_at: '', ...overrides,
});

const screen = (id: string, overrides: Partial<DemoStepWithHotspots> = {}): DemoStepWithHotspots => ({
  id, demo_id: 'd1', position: 0, asset_url: `https://cdn.example.com/${id}.png`, asset_width: 1280, asset_height: 800,
  title: null, caption: 'What the viewer sees here.', speaker_notes: null, created_at: '', hotspots: [], ...overrides,
});

const ready = { endCtaLabel: 'Join the waitlist', endCtaHref: '/p/acme' };

test('one captioned screen with a working end button can publish', () => {
  const result = getDemoReadiness([screen('s1')], ready);
  assert.equal(result.ready, true);
  assert.deepEqual(result.blockers, []);
  // Speaker notes and more screens are suggestions, not blockers.
  assert.match(result.suggestions.join(' '), /3 to 5 screens/);
  assert.match(result.suggestions.join(' '), /speaker notes/);
});

test('blockers name the screen and what is missing', () => {
  const result = getDemoReadiness([
    screen('s1', { asset_url: null as unknown as string }),
    screen('s2', { caption: '  ' }),
    screen('s3', { hotspots: [hotspot({ step_id: 's3', action: 'url', action_target: 'not a url' })] }),
  ], ready);
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, [
    'Screen 1: add a screenshot.',
    'Screen 2: write a caption.',
    'Screen 3: fix the click target "Create project", its link is not a valid web address.',
  ]);
  assert.equal(result.steps.find((step) => !step.ready)?.stepId, 's1');
  assert.deepEqual(getDemoReadiness([], ready).blockers, ['Add at least one screen.']);
});

test('click targets are optional, but the ones that exist must work', () => {
  const steps = [screen('s1'), screen('s2'), screen('s3')];
  // No click targets: viewers use Next and Back, so it publishes.
  assert.equal(getDemoReadiness(steps, ready).ready, true);
  // "Next" on the last screen ends the demo, which is fine.
  assert.equal(getDemoReadiness([screen('s1', { hotspots: [hotspot()] })], ready).ready, true);
  const jumpTo = (target: string | null) => getDemoReadiness([
    screen('s1', { hotspots: [hotspot({ action: 'goto', action_target: target })] }), screen('s2'),
  ], ready);
  assert.equal(jumpTo('s2').ready, true);
  // Older targets stored a zero-based screen number; they still work.
  assert.equal(jumpTo('1').ready, true);
  assert.match(jumpTo('s1').blockers.join(' '), /jumps to the screen it is on/);
  assert.match(jumpTo('gone').blockers.join(' '), /screen it jumps to is gone/);
  const offScreen = getDemoReadiness([screen('s1', { hotspots: [hotspot({ x: 0.95, w: 0.2 })] })], ready);
  assert.match(offScreen.blockers.join(' '), /off the screen/);
});

test('the end button is optional, but a half-set or broken one blocks', () => {
  assert.equal(getDemoReadiness([screen('s1')], {}).ready, true);
  assert.match(getDemoReadiness([screen('s1')], {}).suggestions.join(' '), /end button/);
  assert.deepEqual(getDemoReadiness([screen('s1')], { endCtaLabel: 'Join' }).blockers, ['Add where the end button goes, or clear its label.']);
  assert.match(getDemoReadiness([screen('s1')], { endCtaHref: 'javascript:alert(1)' }).blockers[0], /Fix where the end button goes/);
  assert.equal(isValidDemoDestination('/p/acme'), true);
  assert.equal(isValidDemoDestination('https://acme.com/signup'), true);
  assert.equal(isValidDemoDestination('//evil.com'), false);
  assert.equal(isValidDemoDestination('acme.com'), false);
  assert.equal(resolveGotoTarget('s2', ['s1', 's2']), 1);
  assert.equal(resolveGotoTarget('5', ['s1', 's2']), null);
});

test('publishing uses the same rules as the editor', () => {
  const api = read('src/lib/demoStudio/api.ts');
  const publish = api.slice(api.indexOf('export async function publishDemo'), api.indexOf('// Free-tier cap'));
  assert.match(publish, /getDemoReadiness\(/);
  assert.match(publish, /readiness\.blockers\[0\]/);
  assert.doesNotMatch(publish, /steps\.length < 2/);
  assert.match(read('src/components/demo-studio/player/DemoPlayer.tsx'), /resolveGotoTarget\(hotspot\.action_target/);
});

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('the save queue writes one at a time and merges waiting edits', async () => {
  const writes: Array<Record<string, unknown>> = [];
  const gate = deferred();
  const queue = createSaveQueue();
  queue.enqueue('step:1', { caption: 'a' }, async (patch) => { writes.push(patch); await gate.promise; });
  queue.enqueue('step:2', { caption: 'x' }, async (patch) => { writes.push(patch); });
  queue.enqueue('step:2', { title: 'y' }, async (patch) => { writes.push(patch); });
  await tick();
  // The first write is in flight; the second has not started.
  assert.deepEqual(writes, [{ caption: 'a' }]);
  assert.equal(queue.getState().status, 'saving');
  gate.resolve();
  assert.equal(await queue.flush(), true);
  assert.deepEqual(writes, [{ caption: 'a' }, { caption: 'x', title: 'y' }]);
  assert.equal(queue.getState().status, 'saved');
});

test('a failed save is kept, newer edits layer on top, and retry sends both', async () => {
  let fail = true;
  const writes: Array<Record<string, unknown>> = [];
  const states: string[] = [];
  const queue = createSaveQueue((state) => states.push(state.status));
  const write = async (patch: Record<string, unknown>) => {
    if (fail) throw new Error('offline');
    writes.push(patch);
  };
  queue.enqueue('demo', { title: 'First' }, write);
  assert.equal(await queue.flush(), false);
  assert.equal(queue.getState().status, 'error');
  assert.equal(queue.getState().error, 'offline');
  fail = false;
  // Typing again retries with the failed edit plus the new one.
  queue.enqueue('demo', { theme: { primaryColor: '#000' } }, write);
  assert.equal(await queue.flush(), true);
  assert.deepEqual(writes, [{ title: 'First', theme: { primaryColor: '#000' } }]);
  assert.ok(states.includes('error'));
  assert.equal(queue.getState().status, 'saved');
});

test('edits that arrive during a save are written after it, and deleted things are dropped', async () => {
  const writes: string[] = [];
  const gate = deferred();
  const queue = createSaveQueue();
  queue.enqueue('step:1', { caption: 'one' }, async () => { writes.push('one'); await gate.promise; });
  await tick();
  queue.enqueue('step:1', { caption: 'two' }, async () => { writes.push('two'); });
  queue.enqueue('hotspot:9', { label: 'gone' }, async () => { writes.push('gone'); });
  queue.discard('hotspot:9');
  gate.resolve();
  assert.equal(await queue.flush(), true);
  assert.deepEqual(writes, ['one', 'two']);
});

test('the editor saves through the queue and publishes only saved work', () => {
  const editor = read('src/pages/demo-studio/DemoEditorPage.tsx');
  assert.match(editor, /createSaveQueue\(setSaveState\)/);
  assert.match(editor, /saveQueue\.enqueue\(`step:\$\{id\}`/);
  assert.match(editor, /await saveQueue\.flush\(\)/);
  assert.match(editor, /beforeunload/);
  assert.doesNotMatch(editor, /hotspotPersistTimers|toast\.error\('Could not save (step details|hotspot|theme)/);
  assert.doesNotMatch(editor, /â€/);
  assert.match(read('src/components/demo-studio/editor/HotspotInspector.tsx'), /onChange\(\{ action_target: id \}\)/);
});

test('the project page asks for one thing at a time, starting with screens', () => {
  const base = { demoCount: 0, hasPublishedDemo: false, hasViews: false, launchPublished: false };
  assert.equal(getDemoProjectNextStep(base)?.action, 'start_demo');
  assert.equal(getDemoProjectNextStep({ ...base, demoCount: 1 })?.action, 'finish_demo');
  assert.equal(getDemoProjectNextStep({ ...base, demoCount: 1, hasPublishedDemo: true })?.action, 'share_demo');
  assert.equal(getDemoProjectNextStep({ ...base, demoCount: 1, hasPublishedDemo: true, hasViews: true })?.action, 'add_launch_page');
  assert.equal(getDemoProjectNextStep({ demoCount: 1, hasPublishedDemo: true, hasViews: true, launchPublished: true }), null);
  // The brief is optional: a new project goes straight to the editor.
  const dashboard = read('src/pages/demo-studio/ProjectsDashboardPage.tsx');
  assert.match(dashboard, /createDemo\(project\.id, user\.id/);
  assert.match(dashboard, /\/demos\/\$\{demo\.id\}\/edit/);
});

test('Demo Studio pages use their own colour, storyboard wallpaper and one next step', () => {
  const css = read('src/index.css');
  assert.match(css, /\.tool-theme-demo \{[\s\S]*--primary: var\(--tool-demo\)/);
  for (const page of ['src/pages/demo-studio/ProjectsDashboardPage.tsx', 'src/pages/demo-studio/ProjectOverviewPage.tsx']) {
    const source = read(page);
    assert.match(source, /theme="demo"/);
    assert.match(source, /wallpaper=\{<DemoStoryboardWallpaper \/>\}/);
    assert.ok((source.match(/<NextStepCard\b/g)?.length ?? 0) <= 2, `${page} renders one next step at a time`);
    assert.doesNotMatch(source, /DemoStudioWallpaper|GettingStartedChecklist/);
  }
  assert.match(read('src/pages/demo-studio/DemoEditorPage.tsx'), /tool-theme-demo/);
});
