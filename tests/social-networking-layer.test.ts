import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('public explore route is wired into the Vite router', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const heroSource = readFileSync(new URL('../src/components/Hero.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /const Explore = lazy\(\(\) => import\("\.\/pages\/Explore"\)\)/);
  assert.match(appSource, /<Route path="\/explore" element=\{<Explore \/>\} \/>/);
  assert.match(heroSource, /to="\/explore"/);
  assert.match(heroSource, />\s*Explore\s*</);
});

test('explore page uses read-only community preview with a soft gate', () => {
  const exploreSource = readFileSync(new URL('../src/pages/Explore.tsx', import.meta.url), 'utf8');
  const softGateSource = readFileSync(new URL('../src/components/explore/SoftGate.tsx', import.meta.url), 'utf8');
  const postCardSource = readFileSync(new URL('../src/components/community/PostCard.tsx', import.meta.url), 'utf8');

  assert.match(exploreSource, /const PREVIEW_LIMIT = 4/);
  assert.match(exploreSource, /\.from\("community_posts"\)/);
  assert.match(exploreSource, /<PostCard key=\{post\.id\} post=\{post\} readOnly \/>/);
  assert.match(exploreSource, /<SoftGate>/);
  assert.match(softGateSource, /explore_signup_clicked/);
  assert.match(postCardSource, /readOnly\?: boolean/);
  assert.match(postCardSource, /!\s*readOnly && showComments/);
});

test('authenticated dashboard includes the community feed below the command center', () => {
  const dashboardSource = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8');

  assert.match(dashboardSource, /import CommunityFeed from '@\/components\/community\/CommunityFeed'/);
  assert.match(dashboardSource, /<StartupHomeCommandCenter \/>[\s\S]*<CommunityFeed \/>/);
});

test('community posting captures post type and post_created analytics', () => {
  const composerSource = readFileSync(new URL('../src/components/community/PostComposer.tsx', import.meta.url), 'utf8');
  const feedSource = readFileSync(new URL('../src/components/community/CommunityFeed.tsx', import.meta.url), 'utf8');
  const filtersSource = readFileSync(new URL('../src/components/community/AdvancedFilters.tsx', import.meta.url), 'utf8');

  assert.match(composerSource, /const POST_TYPES = \[/);
  assert.match(composerSource, /Build in Public 🚀/);
  assert.match(composerSource, /Growth & Marketing 📣/);
  assert.match(composerSource, /Choose a room/);
  assert.match(composerSource, /postType\?: string/);
  assert.match(composerSource, /<select/);
  assert.match(feedSource, /content_type: payload\.postType \|\| null/);
  assert.match(feedSource, /const COMMUNITY_ROOMS = \[/);
  assert.match(feedSource, /p\.tags\.includes\(postType\)/);
  assert.match(feedSource, /captureEvent\('post_created'/);
  assert.match(filtersSource, /<h4 className="text-sm font-semibold mb-3">Room<\/h4>/);
});

test('founder search route uses public profile projection', () => {
  const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const searchSource = readFileSync(new URL('../src/pages/Search.tsx', import.meta.url), 'utf8');

  assert.match(appSource, /const Search = lazy\(\(\) => import\("\.\/pages\/Search"\)\)/);
  assert.match(appSource, /<Route path="\/search" element=\{<Search \/>\} \/>/);
  assert.match(searchSource, /\.from\("public_profiles"\)/);
  assert.match(searchSource, /username\.ilike/);
  assert.match(searchSource, /startup_stage/);
});

test('social networking migration is additive and preserves existing tables', () => {
  const migrationSource = readFileSync(new URL('../supabase/migrations/20260515130000_social_networking_layer_alignment.sql', import.meta.url), 'utf8');

  assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS post_type/);
  assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS is_public/);
  assert.match(migrationSource, /'build_in_public'/);
  assert.match(migrationSource, /'fundraising_revenue'/);
  assert.match(migrationSource, /'product_validation'/);
  assert.match(migrationSource, /CREATE OR REPLACE VIEW public\.public_profiles/);
  assert.doesNotMatch(migrationSource, /CREATE TABLE profiles/);
  assert.doesNotMatch(migrationSource, /DROP TABLE/);
});
