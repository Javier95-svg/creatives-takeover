import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const exists = (path: string) => existsSync(new URL(path, import.meta.url));

test('the mobile bottom nav and its Free Tools menu are gone', () => {
  assert.equal(exists('../src/components/mobile/MobileBottomNav.tsx'), false);
  assert.equal(exists('../src/config/freeTools.ts'), false);

  const app = read('../src/App.tsx');
  assert.doesNotMatch(app, /MobileBottomNav/);
});

test('the free tool routes still exist — only the menu was removed', () => {
  const app = read('../src/App.tsx');
  for (const route of ['/pitch-deck-analyzer', '/insighta-test', '/tech-stack']) {
    assert.ok(app.includes(route), `route ${route} must remain reachable`);
  }
});

test('the bottom nav padding compensation is removed', () => {
  const css = read('../src/index.css');
  // A bare `main` selector inside the mobile media block; leaving it strands 64px
  // above the footer on every page now that there is no bar to clear.
  assert.doesNotMatch(css, /padding-bottom: calc\(4rem \+ env\(safe-area-inset-bottom/);
});

test('the scroll-triggered sticky mobile CTA is gone', () => {
  assert.equal(exists('../src/components/StickyMobileCTA.tsx'), false);
  assert.doesNotMatch(read('../src/pages/Index.tsx'), /StickyMobileCTA/);
});

test('bottom-anchored overlays are re-based with nothing beneath them', () => {
  // Nothing is anchored to the bottom of the mobile homepage any more, so the
  // compact Pulse stack sits at the same 1.5rem as its default, plus safe area.
  assert.match(read('../src/components/pulse/PulsePanel.tsx'), /bottom-\[calc\(1\.5rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
  // bubble (1.5rem) + bubble height (h-12 = 3rem) + 0.5rem gap
  assert.match(read('../src/components/pulse/PulseProactiveMessage.tsx'), /bottom-\[calc\(5rem\+env\(safe-area-inset-bottom,0px\)\)\]/);

  const banner = read('../src/components/activation/ActivationResumeBanner.tsx');
  assert.match(banner, /bottom-4/);
  assert.doesNotMatch(banner, /bottom-20/);
});

test('the Pulse bubble keeps its ICP-surface offset', () => {
  const bubble = read('../src/components/pulse/PulseBubble.tsx');

  assert.match(bubble, /bottom-\[calc\(1\.5rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
  // 5.5rem clears the sticky bars on /icp-builder and /demo-studio/try, NOT the
  // removed bottom nav. Re-basing it would push the bubble onto those bars.
  assert.match(bubble, /bottom-\[calc\(5\.5rem\+env\(safe-area-inset-bottom,0px\)\)\]/);
});
