import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEMO_STUDIO_TRY_MIN_SCREENSHOTS,
  DEMO_STUDIO_TRY_MAX_SCREENSHOTS,
} from '../src/lib/demoStudio/tryPreview.ts';

const tryPage = readFileSync(new URL('../src/pages/demo-studio/TryPage.tsx', import.meta.url), 'utf8');
const heroRules = readFileSync(new URL('../src/lib/heroFunnelRules.ts', import.meta.url), 'utf8');

/**
 * These assertions are about what the code does, not what it says. Both files
 * explain in comments why the placeholder and auto-start paths were removed,
 * and naming a thing in order to say it is gone must not read as still using
 * it - otherwise the tests punish the documentation.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const tryPageCode = code(tryPage);
const heroRulesCode = code(heroRules);

/**
 * The try page used to accept a description alone. On the anonymous path that
 * description is the only real signal the generator gets - it becomes
 * brief.product_promise while audience, problem and aha_moment stay boilerplate
 * from getDefaultBrief() - and with no screenshots the run fell back to
 * generated placeholder frames. The result was AI captions over invented UI,
 * presented as a demo. All three inputs are required now.
 */
test('generation requires a description, a product URL, and screenshots', () => {
  const handler = tryPage.slice(tryPage.indexOf('const handleGenerate = async'));
  const body = handler.slice(0, handler.indexOf('const runId = ++runIdRef.current'));

  assert.match(body, /missing_description/);
  assert.match(body, /missing_url/);
  assert.match(body, /shots\.length < MIN_SCREENSHOTS/);
  assert.match(body, /missing_screenshots/);

  // The old guard only enforced a minimum when screenshots were already
  // present, so zero screenshots sailed through into the placeholder path.
  assert.doesNotMatch(body, /!isNoAssets && shots\.length < MIN_SCREENSHOTS/);
});

test('no generation path can fall back to placeholder frames', () => {
  // isNoAssets is what selected generated frames over the founder's own.
  assert.doesNotMatch(tryPageCode, /isNoAssets/);
  assert.doesNotMatch(tryPageCode, /createPlaceholderShots/);
  assert.doesNotMatch(tryPageCode, /buildPlaceholderShotFiles/);
});

/**
 * Drafts saved before this change carry assetMode "generated_placeholders".
 * They must still restore, or a founder's resume-email link breaks. Restoring
 * rebuilds shots from stored data URLs rather than regenerating frames, so the
 * two concerns are genuinely separate.
 */
test('restoring a placeholder-built draft still works', () => {
  assert.match(tryPage, /draft\.assetMode === 'generated_placeholders'/);
  assert.match(tryPage, /dataUrlToFile\(step\.dataUrl/);
  assert.match(tryPage, /setUsedPlaceholders\(restoredPlaceholders\)/);
});

test('a ?guest= link still restores now that auto-start is gone', () => {
  // This restore used to live inside the auto-start effect, so removing that
  // effect wholesale would have silently killed the guest-artifact link.
  assert.match(tryPageCode, /loadDemoGuestArtifact\(guestArtifactToken\)/);
  assert.doesNotMatch(tryPageCode, /shouldAutoStart/);
  assert.doesNotMatch(tryPageCode, /buildDemoAutoStartGuardKey/);
});

test('both required fields are marked required in the form', () => {
  const form = tryPage.slice(tryPage.indexOf('Describe your product'));
  assert.doesNotMatch(form.slice(0, 4000), /\(optional\)/);
});

test('the hero no longer ships an autostart flag', () => {
  assert.doesNotMatch(heroRulesCode, /autostart/i);
});

test('the screenshot bounds the copy quotes are the enforced ones', () => {
  assert.equal(DEMO_STUDIO_TRY_MIN_SCREENSHOTS, 2);
  assert.equal(DEMO_STUDIO_TRY_MAX_SCREENSHOTS, 3);
  assert.match(tryPage, /MIN_SCREENSHOTS\}–\{MAX_SCREENSHOTS\}/);
});
