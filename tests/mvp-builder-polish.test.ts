import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { getMvpNextStep, type MvpBuilderState } from '../src/lib/mvp-builder/nextStep.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const state = (overrides: Partial<MvpBuilderState> = {}): MvpBuilderState => ({
  hasFiles: true,
  isGenerating: false,
  previewErrorCount: 0,
  isPublished: false,
  changedSincePublish: false,
  ...overrides,
});

test('the builder names one next step, in order', () => {
  assert.equal(getMvpNextStep(state({ hasFiles: false })).action, 'describe');
  assert.equal(getMvpNextStep(state({ hasFiles: false, isGenerating: true })).action, 'building');
  assert.equal(getMvpNextStep(state({ previewErrorCount: 2 })).action, 'fix_preview');
  assert.equal(getMvpNextStep(state()).action, 'publish');
  assert.equal(getMvpNextStep(state({ isPublished: true, changedSincePublish: true })).action, 'republish');
  assert.equal(getMvpNextStep(state({ isPublished: true })).action, 'share');
});

test('a failed save is shown with a retry, saves come quickly, and leaving warns', () => {
  const hook = read('src/hooks/useMVPBuilder.ts');
  const header = read('src/components/mvp-builder/MVPBuilderHeader.tsx');
  assert.match(hook, /setSaveError\(error instanceof Error/);
  assert.match(hook, /saveError \? 30000 : 5000/);
  assert.match(hook, /beforeunload/);
  assert.match(hook, /retrySave: \(\) => saveProject\(\{ silent: false \}\)/);
  assert.match(header, /Not saved/);
  assert.match(header, /onClick=\{onRetrySave\}/);
  // The reverted upgrade saved through an RPC that was never deployed.
  assert.doesNotMatch(hook, /rpc\('save_mvp_project'/);
});

test('the builder uses its own colour, a blueprint start screen and labelled tools', () => {
  const css = read('src/index.css');
  const builder = read('src/components/mvp-builder/MVPBuilder.tsx');
  const chat = read('src/components/mvp-builder/MVPBuilderChat.tsx');
  const header = read('src/components/mvp-builder/MVPBuilderHeader.tsx');
  assert.match(css, /\.tool-theme-mvp \{[\s\S]*--primary: var\(--tool-mvp\)/);
  assert.match(builder, /tool-theme-mvp/);
  assert.match(builder, /getMvpNextStep\(/);
  assert.match(chat, /What do you want to build\?/);
  assert.match(chat, /<MVPBlueprintWallpaper \/>/);
  for (const label of ['Choose the AI model', 'GitHub', 'Version history', 'Point to a part of the app']) {
    assert.match(chat, new RegExp(`aria-label="${label}"`));
  }
  assert.doesNotMatch(header, /blur-3xl|radial-gradient|bg-clip-text/);
});
