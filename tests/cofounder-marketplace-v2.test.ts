import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createEmptyCofounderListing, validateCofounderListing } from '../src/types/cofounderMarketplace.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const sql = read('../supabase/migrations/20260712120000_cofounder_marketplace_v2.sql');
const targetedNotificationSql = read('../supabase/migrations/20260713120000_target_cofounder_post_notifications.sql');

test('listing validation requires an actionable compatibility profile', () => {
  const empty = createEmptyCofounderListing('America/Bogota');
  assert.ok(validateCofounderListing(empty).length >= 5);
  const valid = {
    ...empty,
    headline: 'Technical founder seeking a commercial partner',
    summary: 'I have built the first product and interviewed early users. I am looking for a thoughtful commercial co-founder who can own sales and customer discovery.',
    skillsOffered: ['Engineering'],
    skillsSought: ['Sales'],
    commitment: 'Full-time',
  };
  assert.deepEqual(validateCofounderListing(valid), []);
});

test('marketplace schema keeps one active listing and expires listings after 30 days', () => {
  assert.match(sql, /cofounder_posts_one_active_per_user_idx[\s\S]*WHERE status = 'active'/);
  assert.match(sql, /now\(\) \+ interval '30 days'/);
  assert.match(sql, /status IN \('draft', 'active', 'paused', 'expired', 'closed', 'archived'\)/);
});

test('publish and renewal use authenticated idempotent five-credit deductions', () => {
  assert.match(sql, /publish_cofounder_listing_v2/);
  assert.match(sql, /renew_cofounder_listing_v2/);
  assert.match(sql, /v_user uuid := auth\.uid\(\)/);
  assert.match(sql, /deduct_credits_atomic\(v_user, 5, 'COFOUNDER_POST'/);
  assert.match(sql, /'idempotencyKey', p_idempotency_key/);
  assert.match(sql, /app\.cofounder_marketplace_rpc/);
});

test('trust, interest rate limiting, blocking and contextual acceptance are server enforced', () => {
  assert.match(sql, /email_confirmed_at/);
  assert.match(sql, /COALESCE\(v_completion, 0\) < 60/);
  assert.match(sql, />=10 THEN RAISE EXCEPTION 'Daily interest limit reached'/);
  assert.match(sql, /FROM public\.user_blocks/);
  assert.match(sql, /create_or_get_direct_conversation/);
  assert.match(sql, /'kind','cofounder_interest'/);
});

test('anonymous browse masks identity and deterministic matching uses the agreed weights', () => {
  assert.match(sql, /cofounder_listing_json\(p, v_user IS NULL\)/);
  assert.match(sql, /CASE WHEN p_mask_identity THEN NULL ELSE p\.user_id END/);
  assert.match(sql, /THEN 30 ELSE 0 END/);
  assert.match(sql, /THEN 20 ELSE 8 END/);
  assert.match(sql, /THEN 15 ELSE 5 END/);
  assert.match(sql, /THEN 10 ELSE 0 END/);
  assert.doesNotMatch(sql, /gemini|openai|anthropic/i);
});

test('the low-supply community feed and simple post editor are the default routes', () => {
  const route = read('../src/pages/community/CofounderMarketplaceRoute.tsx');
  const editorRoute = read('../src/pages/community/CofounderListingEditorRoute.tsx');
  const communityPage = read('../src/pages/community/FindCoFounder.tsx');
  assert.match(route, /return <FindCoFounder/);
  assert.match(editorRoute, /postId \? <EditCoFounderPost \/> : <CreateCoFounderPost/);
  assert.doesNotMatch(route, /CofounderMarketplacePage|useFeatureFlagEnabled/);
  assert.doesNotMatch(editorRoute, /CofounderListingEditorPage|useFeatureFlagEnabled/);
  assert.match(communityPage, /const POSTS_PER_PAGE = 10/);
  assert.match(communityPage, /filteredPosts\.slice\(pageStart, pageStart \+ POSTS_PER_PAGE\)/);
  assert.match(communityPage, /aria-label="Co-founder post pages"/);
  assert.doesNotMatch(communityPage, /1\. Publish clearly|2\. Review founders|3\. Start a conversation/);
});

test('new co-founder posts notify only onboarding users who are actively looking', () => {
  assert.match(targetedNotificationSql, /user_preferences->>'cofounderSituation' = 'actively_looking'/);
  assert.match(targetedNotificationSql, /recipient\.id <> NEW\.user_id/);
  assert.match(targetedNotificationSql, /'cofounder_post_created'/);
  assert.match(targetedNotificationSql, /'route', '\/co-founder'/);
  assert.match(targetedNotificationSql, /existing\.metadata->>'cofounder_post_id' = NEW\.id::text/);
  assert.match(targetedNotificationSql, /DROP TRIGGER IF EXISTS on_new_cofounder_post_notify_all_users/);
  assert.match(targetedNotificationSql, /DROP TRIGGER IF EXISTS sync_cofounder_marketplace_dashboard_task_v1/);
});
