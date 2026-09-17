import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('route loading is caught below the persistent workspace header and sidebar', () => {
  const layout = readFileSync('src/components/workspace/WorkspaceLayout.tsx', 'utf8');
  const boundary = layout.indexOf('<Suspense fallback=');
  assert.ok(boundary > layout.indexOf('</header>'));
  assert.ok(boundary > layout.indexOf('{!mobile && sidebar}'));
  assert.ok(layout.indexOf('{home ? children', boundary) > boundary);
  assert.match(layout, /Loading page/);
});

test('legacy viewport wallpapers are contained inside the route region', () => {
  const css = readFileSync('src/components/workspace-route-frame.css', 'utf8');
  assert.match(css, /\.workspace-route-content\s*\{[^}]*position: relative;[^}]*isolation: isolate;[\s\S]*?contain: layout paint;/);
  assert.match(css, /\.workspace-shell > aside\s*\{ z-index: 30;/);
});
