import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  guestWebsiteLabel,
  normalizeGuestWebsite,
  normalizeInstagramUrl,
  normalizeLinkedInUrl,
  socialHandle,
} from '../src/lib/podcast.ts';

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
const socialsMigration = readFileSync(
  new URL('../supabase/migrations/20260906120000_podcast_episode_guest_socials.sql', import.meta.url),
  'utf8'
);

// ---------------------------------------------------------------- website ---

test('a schemeless guest website becomes a linkable https URL', () => {
  assert.equal(normalizeGuestWebsite('getmarketing.com'), 'https://getmarketing.com/');
  assert.equal(normalizeGuestWebsite('  www.getmarketing.com  '), 'https://www.getmarketing.com/');
  assert.equal(normalizeGuestWebsite('//getmarketing.com'), 'https://getmarketing.com/');
});

test('an explicit scheme and path survive normalization', () => {
  assert.equal(
    normalizeGuestWebsite('https://getmarketing.com/about'),
    'https://getmarketing.com/about'
  );
  assert.equal(normalizeGuestWebsite('http://getmarketing.com'), 'http://getmarketing.com/');
});

test('non-web and empty values normalize to null', () => {
  for (const value of ['', '   ', null, undefined, 'localhost', 'not a website']) {
    assert.equal(normalizeGuestWebsite(value), null);
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

// ---------------------------------------------------------------- socials ---

test('a LinkedIn vanity name or URL becomes an absolute profile link', () => {
  assert.equal(normalizeLinkedInUrl('darya-kablash'), 'https://www.linkedin.com/in/darya-kablash');
  assert.equal(normalizeLinkedInUrl('@darya-kablash'), 'https://www.linkedin.com/in/darya-kablash');
  assert.equal(
    normalizeLinkedInUrl('linkedin.com/in/darya-kablash'),
    'https://linkedin.com/in/darya-kablash'
  );
  assert.equal(
    normalizeLinkedInUrl('https://www.linkedin.com/company/getmarketing'),
    'https://www.linkedin.com/company/getmarketing'
  );
});

test('an Instagram handle or URL becomes an absolute profile link', () => {
  assert.equal(normalizeInstagramUrl('@daryakablash'), 'https://www.instagram.com/daryakablash');
  assert.equal(normalizeInstagramUrl('daryakablash'), 'https://www.instagram.com/daryakablash');
  assert.equal(
    normalizeInstagramUrl('instagram.com/daryakablash'),
    'https://instagram.com/daryakablash'
  );
});

test('a link on the wrong host never renders under a social label', () => {
  // A website pasted into the LinkedIn box would otherwise claim to be LinkedIn.
  assert.equal(normalizeLinkedInUrl('https://getmarketing.com/team'), null);
  assert.equal(normalizeInstagramUrl('https://getmarketing.com/team'), null);
  // A lookalike host must not pass the suffix check.
  assert.equal(normalizeLinkedInUrl('https://linkedin.com.evil.test/in/x'), null);
  assert.equal(normalizeInstagramUrl('javascript:alert(1)'), null);
});

test('empty socials stay empty', () => {
  for (const value of ['', '   ', null, undefined]) {
    assert.equal(normalizeLinkedInUrl(value), null);
    assert.equal(normalizeInstagramUrl(value), null);
  }
});

test('the social label shows the handle, not a bare route', () => {
  assert.equal(socialHandle('https://www.instagram.com/daryakablash'), '@daryakablash');
  assert.equal(socialHandle('https://www.linkedin.com/in/darya-kablash'), '@darya-kablash');
  // A company page has no personal handle — the caller falls back to the network name.
  assert.equal(socialHandle('https://www.linkedin.com/company'), '');
  assert.equal(socialHandle(null), '');
});

// ----------------------------------------------------------------- banner ---

test('the description clamps until the reader opts into the full text', () => {
  assert.match(banner, /\{isExpanded \? "View less" : "View more"\}/);
  // The toggle is measured, not assumed, so short descriptions do not grow one.
  assert.match(banner, /setIsOverflowing\(el\.scrollHeight > el\.clientHeight \+ 1\)/);
  assert.match(banner, /\{isOverflowing && \(/);
  // Screen readers need the button tied to the region it expands.
  assert.match(banner, /aria-expanded=\{isExpanded\}/);
  assert.match(banner, /aria-controls=\{descriptionId\}/);
});

test('the clamped description spends all three lines on text', () => {
  // Regression: whitespace-pre-line while clamped let a paragraph break eat one
  // of the three lines, leaving a stray ellipsis on its own row.
  assert.match(banner, /isExpanded \? "whitespace-pre-line" : "line-clamp-3"/);
  assert.doesNotMatch(banner, /"whitespace-pre-line text-sm/);
});

test('the banner credits the guest and links their project site', () => {
  assert.match(banner, /const guestName = episode\.guest_name\.trim\(\)/);
  assert.match(banner, /const guestWebsite = normalizeGuestWebsite\(episode\.guest_website\)/);
  assert.match(banner, /Visit:/);
  assert.match(banner, /guestWebsiteLabel\(guestWebsite\)/);
});

test('the banner renders both socials and drops the ones a guest lacks', () => {
  assert.match(banner, /const guestLinkedIn = normalizeLinkedInUrl\(episode\.guest_linkedin\)/);
  assert.match(banner, /const guestInstagram = normalizeInstagramUrl\(episode\.guest_instagram\)/);
  assert.match(banner, /Boolean\(link\.href\)/);
  // Falls back to the network name when there is no handle to show.
  assert.match(banner, /\{handle \|\| name\}/);
});

test('every outbound guest link opens safely in a new tab', () => {
  const targets = banner.match(/target="_blank"/g)?.length ?? 0;
  const rels = banner.match(/rel="noopener noreferrer nofollow"/g)?.length ?? 0;
  assert.ok(targets > 0, 'expected outbound guest links');
  assert.equal(rels, targets, 'every target="_blank" needs the safe rel');
});

// ------------------------------------------------------- hook / form / db ---

test('guest fields round-trip through the hook and the admin form', () => {
  for (const field of ['guest_name', 'guest_website', 'guest_linkedin', 'guest_instagram']) {
    assert.match(hook, new RegExp(`${field}: typeof row\\.${field} === 'string'`));
  }
  // Normalized on write (create + update), so stored values are always usable hrefs.
  assert.equal(
    hook.match(/guest_website: normalizeGuestWebsite\(input\.guest_website\)/g)?.length,
    2
  );
  assert.equal(
    hook.match(/guest_linkedin: normalizeLinkedInUrl\(input\.guest_linkedin\)/g)?.length,
    2
  );
  assert.equal(
    hook.match(/guest_instagram: normalizeInstagramUrl\(input\.guest_instagram\)/g)?.length,
    2
  );

  for (const id of ['guest-name', 'guest-website', 'guest-linkedin', 'guest-instagram']) {
    assert.match(form, new RegExp(`id="podcast-${id}"`));
  }
  // An unparseable value blocks save rather than being silently dropped.
  for (const guard of ['validGuestWebsite', 'validLinkedIn', 'validInstagram']) {
    assert.match(form, new RegExp(`${guard} &&`));
  }
});

test('the guest columns are added additively and stay nullable', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS guest_name\s+TEXT/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS guest_website TEXT/);
  assert.match(socialsMigration, /ADD COLUMN IF NOT EXISTS guest_linkedin\s+TEXT/);
  assert.match(socialsMigration, /ADD COLUMN IF NOT EXISTS guest_instagram TEXT/);
  for (const sql of [migration, socialsMigration]) {
    assert.doesNotMatch(sql, /NOT NULL/);
  }
});
