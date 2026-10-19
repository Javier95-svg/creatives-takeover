import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { daysSince, lastUpdateLabel, normalizeProfileSupport, supportLinkProvider } from '../src/lib/supportLinks.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = read('../supabase/migrations/20261020110000_profile_support.sql');

test('only founder-owned pages on allowlisted providers are accepted', () => {
  const allowed: Record<string, string> = {
    'https://ko-fi.com/quillstack': 'Ko-fi',
    'https://www.buymeacoffee.com/maya': 'Buy Me a Coffee',
    'https://patreon.com/maya': 'Patreon',
    'https://buy.stripe.com/abc123': 'Stripe',
    'https://donate.stripe.com/abc123': 'Stripe',
    'https://paypal.me/maya': 'PayPal',
    'https://github.com/sponsors/maya': 'GitHub Sponsors',
    'https://opencollective.com/maya': 'Open Collective',
  };
  for (const [url, provider] of Object.entries(allowed)) assert.equal(supportLinkProvider(url), provider, url);
  for (const url of [
    'http://ko-fi.com/maya', 'https://ko-fi.com/', 'https://ko-fi.com.evil.io/x', 'https://ko-fi.com@evil.io/x',
    'https://evil.io/?https://ko-fi.com/x', 'https://ko-fi.com/a b', 'https://github.com/maya', 'javascript:alert(1)', '', null,
    `https://ko-fi.com/${'a'.repeat(300)}`,
  ]) assert.equal(supportLinkProvider(url), null, String(url));
});

test('the browser and database allowlists name the same providers', () => {
  for (const domain of ['buymeacoffee\\.com', 'ko-fi\\.com', 'patreon\\.com', '(buy|donate)\\.stripe\\.com', 'paypal\\.me', 'github\\.com/sponsors', 'opencollective\\.com']) {
    assert.ok(migration.includes(domain), `migration allows ${domain}`);
    assert.ok(read('../src/lib/supportLinks.ts').includes(domain.replace('/', '\\/')), `client allows ${domain}`);
  }
  assert.match(migration, /support_url IS NULL OR public\.support_link_provider\(support_url\) IS NOT NULL/);
});

test('a link the browser would not allow is never shown, whatever the server sends', () => {
  const support = normalizeProfileSupport({
    asks: ['feedback', 'donate', 'share', 'share'],
    link_status: 'live',
    support_url: 'https://evil.io/pay',
    note: '  Intros help most.  ',
  })!;
  assert.deepEqual(support.asks, ['feedback', 'share']);
  assert.equal(support.supportUrl, null);
  assert.equal(support.linkStatus, 'none');
  assert.equal(support.note, 'Intros help most.');
  assert.equal(normalizeProfileSupport(null), null);
  assert.equal(normalizeProfileSupport({ link_status: 'whatever', support_url: 'https://ko-fi.com/maya' })!.linkStatus, 'none');
});

test('the last update reads in days', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  assert.equal(lastUpdateLabel(null, now), 'No updates yet');
  assert.equal(lastUpdateLabel('2026-10-18T08:00:00Z', now), 'Last update today');
  assert.equal(lastUpdateLabel('2026-10-17T08:00:00Z', now), 'Last update yesterday');
  assert.equal(lastUpdateLabel('2026-09-14T12:00:00Z', now), 'Last update 34 days ago');
  assert.equal(daysSince('not a date', now), null);
});

test('the support link only shows while the founder keeps posting', () => {
  assert.match(migration, /v_last_update < now\(\) - interval '30 days' THEN 'stale'/);
  assert.match(migration, /pr\.archived_at IS NULL/);
  assert.match(migration, /v_reports >= 3 THEN 'reported'/);
  assert.match(migration, /'support_url', CASE WHEN v_is_owner OR v_status = 'live' THEN v_support\.support_url END/);
  assert.match(migration, /COALESCE\(v_profile\.user_type, 'founder'\) NOT IN \('founder', 'builder'\)/);
});

test('settings are owner-only and read publicly through the function', () => {
  assert.match(migration, /ALTER TABLE public\.profile_support ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.profile_support FROM PUBLIC, anon/);
  for (const policy of ['owner_read', 'owner_insert', 'owner_update', 'owner_delete']) {
    assert.match(migration, new RegExp(`profile_support_${policy}`));
  }
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.public_profile_support_v1\(text\) TO anon, authenticated/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.report_profile_support_link_v1\(text\) FROM PUBLIC, anon/);
  assert.match(migration, /You cannot report your own link/);
});

test('the profile section asks for support, never investment', () => {
  const section = read('../src/components/profile/ProfileSupportSection.tsx');
  assert.match(section, /How you can support me/);
  assert.match(section, /<Heart /);
  assert.match(section, /Support is a gift: it doesn't buy equity, returns or rewards\./);
  assert.match(section, /rel="noopener noreferrer nofollow ugc"/);
  assert.doesNotMatch(section, /\b(invest|investment|back this startup|fund my)\b/i);
  const profile = read('../src/pages/Profile.tsx');
  assert.match(profile, /profile\.user_type === 'founder' \|\| profile\.user_type === 'builder'/);
});
