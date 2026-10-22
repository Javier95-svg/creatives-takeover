import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { FOUNDER_ID_ITEMS, founderIdCompletion, usableProjectName } from '../src/lib/founderIdCompletion.ts';
import { founderIdBaseHandle, nextFreeHandle } from '../src/lib/founderIdHandle.ts';
import { FOUNDER_ID_FAQS } from '../src/data/founderIdPage.ts';
import { INDEXABLE_ROUTES } from '../scripts/seo-route-config.mjs';

test('the try-it link follows the signup rule: first and last name, no accents', () => {
  assert.equal(founderIdBaseHandle('Sofía Marín'), 'sofiamarin');
  assert.equal(founderIdBaseHandle('  Daniel   Kwame Mensah '), 'danielmensah');
  assert.equal(founderIdBaseHandle('Priya'), 'priya');
  assert.equal(founderIdBaseHandle("O'Brien-Smith Jr."), 'obriensmithjr');
  assert.equal(founderIdBaseHandle('   '), null);
  assert.equal(founderIdBaseHandle('!!!'), null);
});

test('a taken link gets the next free number, as signup assigns it', () => {
  assert.equal(nextFreeHandle('danielmensah', []), 'danielmensah');
  assert.equal(nextFreeHandle('danielmensah', ['DanielMensah']), 'danielmensah1');
  assert.equal(nextFreeHandle('danielmensah', ['danielmensah', 'danielmensah1', 'danielmensah3']), 'danielmensah2');
});

test('the FAQ the page shows is the FAQ search engines read', () => {
  const route = INDEXABLE_ROUTES.find((entry: { path: string }) => entry.path === '/founder-id');
  assert.deepEqual(route.faqs, FOUNDER_ID_FAQS);
  assert.ok(FOUNDER_ID_FAQS.length >= 5);
});

// Founder ID growth (2026-10-22): the owner's completion checklist, share
// prompts at the right moments, the cohort showcase and its measurement.

const emptyFields = {
  startup_name: null,
  startup_tagline: null,
  startup_description: null,
  startup_links: null,
  website_url: null,
};

test('an empty Founder ID has every item left to do', () => {
  const result = founderIdCompletion(emptyFields, { hasSupportLink: false, hasUpdate: false });
  assert.equal(result.total, FOUNDER_ID_ITEMS.length);
  assert.equal(result.done, 0);
  assert.equal(result.remaining, 6);
});

test('blank strings do not count, and any project link counts', () => {
  const result = founderIdCompletion(
    { ...emptyFields, startup_name: '   ', startup_links: { demo: '', pitchDeck: 'https://deck.example' } },
    { hasSupportLink: true, hasUpdate: false },
  );
  assert.equal(result.items.name, false);
  assert.equal(result.items.links, true);
  assert.equal(result.items.support, true);
  assert.equal(result.done, 2);
});

test('placeholder project names are never offered as a fill', () => {
  for (const placeholder of ['My project', 'untitled', 'Untitled project', 'New project', '  ', null, undefined]) {
    assert.equal(usableProjectName(placeholder), null, String(placeholder));
  }
  assert.equal(usableProjectName('  Artemis '), 'Artemis');
});

test('nothing goes public without the owner clicking', () => {
  // The checklist only writes inside its click handler; there is no effect or
  // load path that updates the profile.
  const source = readFileSync('src/components/profile/FounderIdChecklist.tsx', 'utf8');
  const updates = [...source.matchAll(/from\('profiles'\)\.update/g)];
  assert.equal(updates.length, 1);
  assert.match(source, /const fill = async/);
});

test('the showcase needs staff to switch it on and each founder to opt in', () => {
  const sql = readFileSync('supabase/migrations/20261022032451_cohort_showcase.sql', 'utf8');
  assert.match(sql, /showcase_public boolean NOT NULL DEFAULT false/);
  assert.match(sql, /showcase_opt_in boolean NOT NULL DEFAULT false/);
  // The public read requires both keys and only lists Founder IDs, from the public projection.
  assert.match(sql, /WHERE showcase_slug = p_slug AND showcase_public/);
  assert.match(sql, /AND m\.showcase_opt_in/);
  assert.match(sql, /JOIN public\.public_profiles pp/);
  // Only the public read is open to signed-out visitors.
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.public_cohort_showcase_v1\(text\) TO anon, authenticated;/);
  for (const fn of ['set_cohort_showcase_v1', 'cohort_showcase_settings_v1', 'cohort_showcase_membership_v1', 'set_cohort_showcase_opt_in_v1']) {
    assert.match(sql, new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon;`), fn);
  }
  // A showcase address never reuses an invite code.
  assert.doesNotMatch(sql, /showcase_slug\s*:?=\s*v_cohort\.(join_code|staff_code)/);
});

test('short links are tagged so their visits can be measured', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const shortLinks = vercel.redirects.filter((rule: { source: string }) => rule.source === '/@:username' || rule.source === '/%40:username');
  assert.equal(shortLinks.length, 2);
  for (const rule of shortLinks) assert.equal(rule.destination, '/profile/:username?via=short');
  assert.match(readFileSync('src/pages/Profile.tsx', 'utf8'), /via_short_link:/);
});
