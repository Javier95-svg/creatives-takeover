import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

const migration = read("supabase/migrations/20261025120000_founder_id_auto_indexing.sql");
const gate = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.profile_is_search_indexable"));

test("filled-in Founder IDs are indexable without a manual review", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS search_indexing_opt_out boolean NOT NULL DEFAULT false/);
  assert.match(gate, /NOT COALESCE\(p\.search_indexing_opt_out, false\)/);
  // The owner request and the admin approval are no longer required...
  assert.doesNotMatch(gate, /search_indexing_requested/);
  assert.doesNotMatch(gate, /= 'approved'/);
  // ...but an admin can still block a profile.
  assert.match(gate, /search_indexing_review_status, 'not_requested'\) <> 'rejected'/);
  // profile_completion_percentage was never written by the app (0 everywhere),
  // so it blocked every profile; it must not come back into the gate.
  assert.doesNotMatch(gate, /profile_completion_percentage/);
});

test("thin profiles stay out of search", () => {
  assert.match(gate, /char_length\(btrim\(COALESCE\(p\.bio, ''\)\)\) >= 120/);
  assert.match(gate, /char_length\(btrim\(COALESCE\(p\.positioning_line, ''\)\)\) >= 20/);
  assert.match(gate, /p\.username !~\* '\^user\[_-\]\?\[0-9a-f\]\{6,\}\$'/);
});

test("the profile editor offers an opt-out, on by default", () => {
  const modal = read("src/components/profile/EditProfileModal.tsx");
  assert.match(modal, /Show my Founder ID in search engines/);
  assert.match(modal, /checked=\{!formData\.search_indexing_opt_out\}/);
  assert.match(modal, /search_indexing_opt_out: formData\.search_indexing_opt_out/);
  assert.doesNotMatch(modal, /Request search engine visibility/);
});

test("the author is named consistently as Javier Alonso", () => {
  for (const file of ["index.html", "src/components/SEO.tsx", "src/pages/StartupPediaEntry.tsx", "scripts/generate-prerendered-pages.mjs"]) {
    const source = read(file);
    assert.doesNotMatch(source, /Javier Pe[ñn]a/, file);
    assert.match(source, /Javier Alonso/, file);
  }
});
