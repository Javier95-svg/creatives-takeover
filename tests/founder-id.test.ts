import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { founderIdDisplay, founderIdPath, founderIdUrl, isFounderIdAccount } from '../src/lib/founderId.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Founder ID belongs to founders and builders only', () => {
  assert.equal(isFounderIdAccount('founder'), true);
  assert.equal(isFounderIdAccount('builder'), true);
  assert.equal(isFounderIdAccount(null), true, 'accounts from before account types were founders');
  for (const type of ['mentor', 'marketplace', 'investor']) assert.equal(isFounderIdAccount(type), false, type);
});

test('every Founder ID has a short link people can read and paste', () => {
  assert.equal(founderIdPath('maya_lindqvist'), '/@maya_lindqvist');
  assert.equal(founderIdUrl('maya_lindqvist', 'https://creatives-takeover.com'), 'https://creatives-takeover.com/@maya_lindqvist');
  assert.equal(founderIdDisplay('maya_lindqvist', 'creatives-takeover.com'), 'creatives-takeover.com/@maya_lindqvist');
});

test('the short link redirects to the profile, which stays canonical', () => {
  const vercel = JSON.parse(read('../vercel.json')) as { redirects: Array<{ source: string; destination: string; permanent: boolean }> };
  const short = vercel.redirects.find((rule) => rule.source === '/@:username');
  assert.ok(short, 'the /@username redirect exists');
  assert.equal(short.destination, '/profile/:username');
  assert.equal(short.permanent, false, 'temporary, so the short link can change target later without stale browser caches');
  assert.ok(vercel.redirects.some((rule) => rule.source === '/%40:username'), 'an encoded @ is handled too');
  assert.match(read('../api/public-entity.ts'), /const canonical = `\$\{SITE_ORIGIN\}\$\{path\}`/);
});

test('a Founder ID link previews correctly whatever the capitals in the username', () => {
  // 108 Founder IDs had capitals on 2026-10-18; lowercasing the lookup turned
  // their link previews into "Page not found".
  const entity = read('../api/public-entity.ts');
  assert.match(entity, /const profile = await findPublicProfile\(rawSlug\)/);
  assert.match(entity, /username=ilike\.\$\{pattern\}/);
  assert.ok(entity.includes("username.replace(/_/g, '\\\\_')"), 'LIKE underscore is escaped');
  assert.match(entity, /\^\[A-Za-z0-9_\]\{1,64\}\$/, 'only username characters reach the pattern');
  const card = read('../api/og-profile.tsx');
  assert.doesNotMatch(card, /searchParams\.get\('username'\) \?\? ''\)\.trim\(\)\.toLowerCase\(\)/);
  assert.ok(card.includes("ilike.${encodeURIComponent(username.replace(/_/g, '\\\\_'))}"), 'case-insensitive, underscore escaped');
});

test('Progress shows only when the founder switched it on, for the owner too', () => {
  const card = read('../src/components/profile/PublicProgressCard.tsx');
  assert.match(card, /if \(!data \|\| !data\.visible\) return null;/);
  assert.doesNotMatch(card, /Only you can see this/);
});

test('startup and social links live in the hero instead of two extra cards', () => {
  const profile = read('../src/pages/Profile.tsx');
  assert.doesNotMatch(profile, />\s*Startup Links\s*</);
  assert.doesNotMatch(profile, />\s*Social Links\s*</);
  const hero = profile.slice(profile.indexOf('{roleDetails.length'), profile.indexOf('{/* Action Buttons'));
  assert.match(hero, /<ProfileLinks/);
  const links = read('../src/components/profile/ProfileLinks.tsx');
  assert.match(links, /\^https\?:\\\/\\\//, 'only web addresses become links');
  assert.match(links, /aria-label=\{label\}/);
});

test('the owner can see their profile exactly as a signed-out visitor does', () => {
  const profile = read('../src/pages/Profile.tsx');
  assert.match(profile, /const profile = previewing \? publicProfile : loadedProfile;/);
  assert.match(profile, /const isOwnProfile = viewerIsOwner && !previewing;/);
  assert.match(profile, /View as visitor/);
  assert.match(profile, /Back to my \{profileNoun\}/);
  assert.match(profile, /setPublicProfile\(visitorView\)/, 'the preview uses the public projection, not the owner row');
  assert.match(profile, /!isOwnProfile && !previewing && profile\.id/, 'no message or connect buttons to yourself');
  assert.match(read('../src/components/profile/ProfileSupportSection.tsx'), /if \(isOwnProfile \|\| preview\) \{/);
});

test('only Founder IDs get the Founder ID name, link, progress and support', () => {
  const profile = read('../src/pages/Profile.tsx');
  assert.match(profile, /const isFounderId = isFounderIdAccount\(profile\?\.user_type\)/);
  assert.match(profile, /\{isFounderId && profile\.username && \(\s*<FounderIdHeader/);
  assert.match(profile, /\{profile\.username && isFounderId && \(\s*<PublicProgressCard/);
  assert.match(profile, /\| \$\{profileNoun\}/);
  assert.match(profile, /founderId=\{isFounderId\}/);
  const share = read('../src/components/profile/ProfileShareButton.tsx');
  assert.match(share, /founderId \? founderIdUrl\(username\)/);
  const card = read('../api/og-profile.tsx');
  assert.match(card, /founderId: !row\.user_type \|\| row\.user_type === 'founder' \|\| row\.user_type === 'builder'/);
  assert.match(card, /creatives-takeover\.com\/@\$\{profile\.username\}/);
  assert.match(read('../api/public-entity.ts'), /'Founder ID' : 'Profile'/);
});
