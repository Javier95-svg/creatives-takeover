import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('the shared theme toggle provides its own tooltip context', () => {
  const source = readFileSync(new URL('../src/components/ThemeToggle.tsx', import.meta.url), 'utf8');

  assert.match(source, /TooltipProvider/);
  assert.ok(
    source.indexOf('<TooltipProvider>') < source.indexOf('<Tooltip>'),
    'TooltipProvider must wrap Tooltip because VisitorNavbar has no provider',
  );
  assert.ok(
    source.indexOf('</Tooltip>') < source.indexOf('</TooltipProvider>'),
    'Tooltip must close before TooltipProvider',
  );
});
