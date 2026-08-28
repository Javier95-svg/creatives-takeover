import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/Navigation.tsx', import.meta.url), 'utf8');

test('authenticated navbar groups content and resources in the intended order', () => {
  const navItems = source.slice(source.indexOf('const navItems = ['), source.indexOf('// Check if a nav item is active'));

  const orderedLabels = ['BizMap', 'Network', 'Insighta', 'Content', 'Resources', 'Pricing'];
  let previousIndex = -1;
  for (const label of orderedLabels) {
    const currentIndex = navItems.indexOf(`name: "${label}"`);
    assert.ok(currentIndex > previousIndex, `${label} must appear in the requested navbar order`);
    previousIndex = currentIndex;
  }

  assert.doesNotMatch(navItems, /name: "Podcast"/);
  assert.doesNotMatch(navItems, /name: "Newspaper"/);
  assert.doesNotMatch(navItems, /name: "BizMap AI"/);
  assert.doesNotMatch(navItems, /name: "Home"/);
  assert.match(source, /to="\/"[\s\S]*?aria-label="Creatives Takeover home"/);
});

test('authenticated navbar distributes the remaining sections evenly', () => {
  const responsiveSource = readFileSync(new URL('../src/styles/responsive-overrides.css', import.meta.url), 'utf8');

  assert.match(source, /signed-in-desktop-nav[^"]*justify-evenly/);
  assert.match(source, /signed-in-tablet-nav-links[^"]*w-full[^"]*justify-evenly/);
  assert.match(responsiveSource, /\.signed-in-desktop-nav \{[\s\S]*?justify-content: space-evenly !important/);
});

test('authenticated Content and Resources menus expose the requested destinations', () => {
  assert.match(source, /const contentSubmenu = \[[\s\S]*?name: "Newspaper", href: "\/newspaper"[\s\S]*?name: "Podcast", href: "\/podcast"/);
  assert.match(source, /const resourcesSubmenu = \[[\s\S]*?name: "Accelerator Hunt", href: "\/accelerator-hunt"[\s\S]*?name: "Tech Stack Builder", href: "\/tech-stack"/);
  assert.match(source, /"Content": Clapperboard/);
  assert.match(source, /"Resources": BookOpen/);
  assert.match(source, /Content: contentSubmenu/);
  assert.match(source, /Resources: resourcesSubmenu/);
  assert.match(source, /Some Gifts 🎁/);
});
