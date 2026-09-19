import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
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

const app = readFileSync('src/App.tsx', 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full.split(String.fromCharCode(92)).join('/'));
  }
  return out;
}

test('a Tooltip provider sits above every route', () => {
  // Radix throws if a Tooltip renders with no provider above it, and the throw
  // takes down the whole route. /investors did exactly that: four Tooltips, no
  // provider, and the Guided Journey shell crashed with it.
  assert.match(app, /import \{ TooltipProvider \} from "@\/components\/ui\/tooltip";/);
  const open = app.indexOf('<TooltipProvider>');
  const routes = app.indexOf('<Routes>');
  const close = app.indexOf('</TooltipProvider>');
  assert.ok(open > 0, 'App must mount a TooltipProvider');
  assert.ok(open < routes && routes < close, 'every route must render inside it');
});

test('the provider is above the router, so it survives navigation', () => {
  // Mounting it inside the router would rebuild it per route and give a Tooltip
  // rendered during a transition nothing to read.
  assert.ok(app.indexOf('<TooltipProvider>') < app.indexOf('<BrowserRouter>'));
});

test('pages that use Tooltip without their own provider are covered', () => {
  // Not a rule against local providers, which nest harmlessly. This records
  // which files depend on the app-level one, so removing it cannot go unnoticed.
  const unprovided = walk('src')
    .filter((file) => {
      const source = readFileSync(file, 'utf8');
      return source.includes('<Tooltip>') && !source.includes('TooltipProvider');
    });
  assert.ok(unprovided.length > 0, 'expected the known callers to still be found');
  for (const file of unprovided) {
    assert.ok(readFileSync(file, 'utf8').includes('<Tooltip>'), file);
  }
  // The page from the crash report is one of them.
  assert.ok(unprovided.includes('src/pages/community/FindYourAngel.tsx'));
});
