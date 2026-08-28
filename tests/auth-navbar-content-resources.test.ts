import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/Navigation.tsx', import.meta.url), 'utf8');

test('authenticated navbar groups content and resources in the intended order', () => {
  const navItems = source.slice(source.indexOf('const navItems = ['), source.indexOf('// Check if a nav item is active'));

  const orderedLabels = ['Home', 'BizMap AI', 'Network', 'Insighta', 'Content', 'Resources', 'Pricing'];
  let previousIndex = -1;
  for (const label of orderedLabels) {
    const currentIndex = navItems.indexOf(`name: "${label}"`);
    assert.ok(currentIndex > previousIndex, `${label} must appear in the requested navbar order`);
    previousIndex = currentIndex;
  }

  assert.doesNotMatch(navItems, /name: "Podcast"/);
  assert.doesNotMatch(navItems, /name: "Newspaper"/);
});

test('authenticated Content and Resources menus expose the requested destinations', () => {
  assert.match(source, /const contentSubmenu = \[[\s\S]*?name: "Podcast", href: "\/podcast"[\s\S]*?name: "Newspaper", href: "\/newspaper"/);
  assert.match(source, /const resourcesSubmenu = \[[\s\S]*?name: "Accelerator Hunt", href: "\/accelerator-hunt"[\s\S]*?name: "Tech Stack Builder", href: "\/tech-stack"/);
  assert.match(source, /"Content": Clapperboard/);
  assert.match(source, /"Resources": BookOpen/);
  assert.match(source, /Content: contentSubmenu/);
  assert.match(source, /Resources: resourcesSubmenu/);
});
