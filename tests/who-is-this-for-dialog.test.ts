import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/WhoIsThisForDialog.tsx', import.meta.url), 'utf8');
const overrides = readFileSync(new URL('../src/styles/responsive-overrides.css', import.meta.url), 'utf8');

test('the profile funnel stays horizontal on phones', () => {
  // responsive-overrides.css collapses grid-cols-4 to one column below 768px
  // unless the element declares a responsive column class. Without the opt-out
  // the Idea -> Conversation -> Evidence -> Build decision flow stands on end
  // and its absolutely-positioned arrows strand beside it.
  assert.match(overrides, /\.grid\[class~="grid-cols-4"\]:not\(\[class\*="sm:grid-cols"\]\)/);

  const illustration = source.slice(
    source.indexOf('const ProfileBannerIllustration'),
    source.indexOf('const WhoIsThisForDialog'),
  );
  assert.match(illustration, /grid grid-cols-4[^"]*sm:grid-cols-4/);
});

test('both funnels still describe four steps', () => {
  // The grid is a fixed 4 columns; adding a step without changing it would
  // silently drop the extra one onto a second row.
  for (const path of ['PRE_BUILD_PATH', 'POST_LAUNCH_PATH']) {
    const block = source.slice(source.indexOf(`${path} =`), source.indexOf('];', source.indexOf(`${path} =`)));
    assert.equal((block.match(/label:/g) ?? []).length, 4, `${path} must have 4 steps`);
  }
});
