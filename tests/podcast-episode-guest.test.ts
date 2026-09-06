import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guestWebsiteLabel, normalizeGuestWebsite } from '../src/lib/podcast.ts';

const banner = readFileSync(
  new URL('../src/components/podcast/PodcastEpisodeBanner.tsx', import.meta.url),
  'utf8'
);
const form = readFileSync(
  new URL('../src/components/podcast/PodcastEpisodeFormDialog.tsx', import.meta.url),
  'utf8'
);
const hook = readFileSync(
  new URL('../src/hooks/usePodcastEpisodes.ts', import.meta.url),
  'utf8'
);
const migration = readFileSync(
  new URL('../supabase/migrations/20260905120000_podcast_episode_guest.sql', import.meta.url),
  'utf8'
);

test('a schemeless guest website becomes a linkable https URL', () => {
  assert.equal(normalizeGuestWebsite('getmarketing.com'), 'https://getmarketing.com/');
  assert.equal(normalizeGuestWebsite('  www.getmarketing.com  '), 'https://www.getmarketing.com/');
  assert.equal(normalizeGuestWebsite('//getmarketing.com'), 'https://getmarketing.com/');
});

test('an explicit scheme and path survive normalization', () => {
  assert.equal(normalizeGuestWebsite('https://getmarketing.com/about'), 'https://getmarketing.com/about');
  assert.equal(normalizeGuestWebsite('http://getmarketing.com'), 'http://getmarketing.com/');
});

test('non-web and empty values normalize to null', () => {
  for (const value of ['', '   ', null, undefined, 'localhost', 'not a website']) {
    assert.equal(normalizeGuestWebsite(value), null, `expected null for ${JSON.stringify(value)}`);
  }
});

test('a script-bearing URL can never reach the anchor href', () => {
  assert.equal(normalizeGuestWebsite('javascript:alert(1)'), null);
  assert.equal(normalizeGuestWebsite('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(normalizeGuestWebsite('mailto:hi@getmarketing.com'), null);
});

test('the link label drops www. and the trailing slash', () => {
  assert.equal(guestWebsiteLabel('https://www.getmarketing.com/'), 'getmarketing.com');
  assert.equal(guestWebsiteLabel('getmarketing.com'), 'getmarketing.com');
  assert.equal(guestWebsiteLabel('https://getmarketing.com/about'), 'getmarketing.com/about');
});

test('the description clamps until the reader opts into the full text', () => {
  // The clamp is what makes the toggle necessary: it must stay applied while collapsed.
  assert.match(banner, /!isExpanded && "line-clamp-3"/);
  assert.match(banner, /\{isExpanded \? "View less" : "View more"\}/);
  // The toggle is measured, not assumed, so short descriptions do not grow one.
  assert.match(banner, /setIsOverflowing\(el\.scrollHeight > el\.clientHeight \+ 1\)/);
  assert.match(banner, /\{isOverflowing && \(/);
  // Screen readers need the button tied to the region it expands.
  assert.match(banner, /aria-expanded=\{isExpanded\}/);
  assert.match(banner, /aria-controls=\{descriptionId\}/);
});

test('the banner credits the guest and links their project site', () => {
  assert.match(banner, /const guestName = episode\.guest_name\.trim\(\)/);
  assert.match(banner, /const guestWebsite = normalizeGuestWebsite\(episode\.guest_website\)/);
  assert.match(banner, /rel="noopener noreferrer nofollow"/);
  assert.match(banner, /guestWebsiteLabel\(guestWebsite\)/);
});

test('guest fields round-trip through the hook and the admin form', () => {
  for (const field of ['guest_name', 'guest_website']) {
    assert.match(hook, new RegExp(`${field}: typeof row\.${field} === 'string'`));
  }
  // Persisted normalized, so the stored value is always a usable href.
  assert.equal(hook.match(/guest_website: normalizeGuestWebsite\(input\.guest_website\)/g)?.length, 2);
  assert.match(form, /id="podcast-guest-name"/);
  assert.match(form, /id="podcast-guest-website"/);
  // An unparseable website blocks save rather than being silently dropped.
  assert.match(form, /validGuestWebsite && !isSaving/);
});

test('the guest columns are added additively and stay nullable', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS guest_name\s+TEXT/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS guest_website TEXT/);
  assert.doesNotMatch(migration, /NOT NULL/);
});
