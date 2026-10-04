import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { createEditHistory, toRestorePayload } from '../src/lib/demoStudio/editHistory.ts';
import { captionsFromDraft, screensNeedingCaptions } from '../src/lib/demoStudio/captionDraft.ts';
import { getDemoReadiness } from '../src/lib/demoStudio/readiness.ts';
import type { DemoStepWithHotspots } from '../src/lib/demoStudio/types.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const screen = (id: string, overrides: Partial<DemoStepWithHotspots> = {}): DemoStepWithHotspots => ({
  id, demo_id: 'd1', position: 0, asset_type: 'image', asset_url: `https://cdn.example.com/${id}.png`, asset_width: 1280, asset_height: 800,
  title: null, caption: null, speaker_notes: null, created_at: '', hotspots: [], ...overrides,
} as DemoStepWithHotspots);

test('undo and redo walk back and forth through snapshots', () => {
  const history = createEditHistory<DemoStepWithHotspots>(3);
  const a = { title: 'A', theme: {}, steps: [screen('s1')] };
  const b = { title: 'B', theme: {}, steps: [screen('s1'), screen('s2')] };
  const c = { title: 'C', theme: {}, steps: [screen('s2')] };
  assert.equal(history.canUndo(), false);
  history.record(a);
  history.record(a); // the same state twice is one step
  history.record(b);
  assert.equal(history.undo(c)?.title, 'B');
  assert.equal(history.undo(b)?.title, 'A');
  assert.equal(history.undo(a), null);
  assert.equal(history.redo(a)?.title, 'B');
  assert.equal(history.redo(b)?.title, 'C');
  assert.equal(history.canRedo(), false);
  // A new change after undo clears redo.
  history.undo(c);
  history.record(b);
  assert.equal(history.canRedo(), false);
});

test('history keeps at most the limit and stores copies, not live objects', () => {
  const history = createEditHistory<DemoStepWithHotspots>(2);
  const live = { title: 'Live', theme: {}, steps: [screen('s1', { caption: 'before' })] };
  history.record(live);
  live.steps[0].caption = 'after';
  assert.equal(history.undo({ title: 'Now', theme: {}, steps: [] })?.steps[0].caption, 'before');
  for (const title of ['1', '2', '3']) history.record({ title, theme: {}, steps: [] });
  assert.equal(history.undo({ title: 'x', theme: {}, steps: [] })?.title, '3');
  assert.equal(history.undo({ title: 'x', theme: {}, steps: [] })?.title, '2');
  assert.equal(history.undo({ title: 'x', theme: {}, steps: [] }), null);
});

test('the restore payload keeps screen order and click targets', () => {
  const payload = toRestorePayload([
    screen('s2', { caption: 'Second', hotspots: [{ id: 'h1', step_id: 's2', x: 0.1, y: 0.1, w: 0.2, h: 0.1, type: 'hotspot', label: 'Go', action: 'goto', action_target: 's1', created_at: '' }] }),
    screen('s1'),
  ] as unknown as Array<Record<string, unknown>>);
  assert.equal(payload[0].id, 's2');
  assert.equal(payload[0].position, 0);
  assert.equal(payload[1].position, 1);
  assert.deepEqual((payload[0].hotspots as Array<Record<string, unknown>>)[0], { id: 'h1', x: 0.1, y: 0.1, w: 0.2, h: 0.1, type: 'hotspot', label: 'Go', action: 'goto', action_target: 's1' });
});

test('drafted captions only fill empty screens and follow the screenshot index', () => {
  const steps = [
    screen('s1', { caption: 'Mine' }),
    screen('s2'),
    screen('s3', { asset_url: 'https://cdn.example.com/placeholder.png' }),
    screen('s4', { asset_type: 'html' } as Partial<DemoStepWithHotspots>),
    screen('s5'),
  ];
  assert.deepEqual(screensNeedingCaptions(steps).map((step) => step.id), ['s2', 's5']);
  const batch = [{ id: 's2' }, { id: 's5' }];
  const draft = (caption: string, screenshot_index?: number) => ({ title: '', caption, speaker_notes: '', hotspot_label: '', suggested_action: 'next' as const, screenshot_index });
  assert.deepEqual(captionsFromDraft(batch, { steps: [draft('For s5', 1), draft('For s2', 0)], fallbackReason: null }), [
    { stepId: 's5', caption: 'For s5' },
    { stepId: 's2', caption: 'For s2' },
  ]);
  // Generic fallback text is never applied.
  assert.deepEqual(captionsFromDraft(batch, { steps: [draft('Generic', 0)], fallbackReason: 'model_unavailable' }), []);
});

test('viewers can leave their email at the end of a published demo', () => {
  const player = read('src/components/demo-studio/player/DemoPlayer.tsx');
  assert.match(player, /theme\?\.collectEmail === true/);
  assert.match(player, /createLaunchSignup\(projectId, leadEmail, \{\s*demoId,/);
  assert.match(player, /disabled=\{mode !== 'live'\}/);
  const lead = read('supabase/functions/demo-studio-lead/index.ts');
  assert.match(lead, /demoCollectsEmail = \(demo as \{ theme\?: \{ collectEmail\?: boolean \} \| null \}\)\.theme\?\.collectEmail === true/);
  assert.match(lead, /if \(project\.launch_published !== true && !demoCollectsEmail\)/);
  assert.match(read('src/pages/demo-studio/DemoEditorPage.tsx'), /Ask for email at the end/);
  assert.match(read('src/pages/demo-studio/DemoAnalyticsPage.tsx'), /<DemoLeadsPanel/);
  // With email capture on, the "add an end button" suggestion is not shown.
  const withEmail = getDemoReadiness([screen('s1', { caption: 'One' })], { collectEmail: true });
  assert.equal(withEmail.suggestions.some((item) => /end button/.test(item)), false);
});

test('the editor saves before undoing and has two tabs on the right', () => {
  const editor = read('src/pages/demo-studio/DemoEditorPage.tsx');
  const flush = editor.indexOf('if (!(await saveQueue.flush())) throw new Error');
  const restore = editor.indexOf("rpc('restore_demo_edit'");
  assert.ok(flush > 0 && restore > flush, 'flushes pending saves before restoring');
  assert.match(editor, /aria-label="Undo"/);
  assert.match(editor, /target\.closest\('input, textarea, \[contenteditable="true"\]'\)/);
  assert.match(editor, /\[\['screen', 'This screen'\], \['finish', 'Finish'\]\]/);
});
