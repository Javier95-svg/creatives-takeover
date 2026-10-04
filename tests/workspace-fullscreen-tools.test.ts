import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { isFullScreenToolPath, isWorkspaceRoute } from '../src/lib/workspacePolicy.ts';

test('only MVP Builder drops the workspace top bar', () => {
  assert.equal(isFullScreenToolPath('/mvp-builder'), true);
  assert.equal(isFullScreenToolPath('/mvp-builder/anything'), true);
  for (const path of ['/', '/pmf-lab', '/demo-studio/projects', '/go-to-market', '/traction-engine', '/mvp-builder-guide', '/mvp-scope']) {
    assert.equal(isFullScreenToolPath(path), false, path);
  }
  // It is still a workspace route, so the sidebar stays.
  assert.equal(isWorkspaceRoute('/mvp-builder'), true);
});

test('the layout skips the header for full-screen tools and keeps the sidebar', () => {
  const layout = readFileSync(new URL('../src/components/workspace/WorkspaceLayout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /const hideTopBar = isFullScreenToolPath\(location\.pathname\)/);
  assert.match(layout, /\{hideTopBar \? null : <header/);
  assert.match(layout, /\{!mobile && sidebar\}/);
});
