import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/community/NotificationBell.tsx', import.meta.url), 'utf8');

test('Charlotte Joseph podcast notifications use her mentor profile thumbnail', () => {
  assert.match(source, /charlotteJosephProfile from '@\/assets\/charlotte-joseph\.webp'/);
  assert.match(source, /podcastTitle\.includes\('charlotte'\) && podcastTitle\.includes\('joseph'\)/);
  assert.match(source, /return charlotteJosephProfile/);
  assert.equal(existsSync(new URL('../src/assets/charlotte-joseph.webp', import.meta.url)), true);
});
