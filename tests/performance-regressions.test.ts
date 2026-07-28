import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('founder journey media stays outside the homepage critical loading path', () => {
  const media = read('../src/components/FounderJourneyVideo.tsx');
  const journey = read('../src/components/EntrepreneurProblems.tsx');

  assert.match(media, /new IntersectionObserver/);
  assert.match(media, /loading="lazy"/);
  assert.match(media, /fetchPriority="low"/);
  assert.match(media, /width=\{1152\}/);
  assert.match(media, /height=\{648\}/);
  assert.match(journey, /\{isMobile \? \(/);
  assert.doesNotMatch(journey, /hidden md:block/);
  assert.doesNotMatch(journey, /md:hidden/);
});

test('optional analytics cannot load replay or Amplitude during anonymous LCP', () => {
  const analytics = read('../src/lib/analytics.ts');
  const main = read('../src/main.tsx');
  const vite = read('../vite.config.ts');
  const featureFlags = read('../src/hooks/usePosthogFeatureFlag.ts');

  assert.match(analytics, /import\('@amplitude\/analytics-browser'\)/);
  assert.match(analytics, /import\('posthog-js'\)/);
  assert.match(analytics, /disable_session_recording: true/);
  assert.match(analytics, /disable_surveys: true/);
  assert.match(analytics, /capture_performance: false/);
  assert.match(analytics, /scheduleAuthenticatedSessionRecording/);
  assert.match(analytics, /requestIdleCallback/);
  assert.doesNotMatch(main, /from ['"]posthog-js/);
  assert.doesNotMatch(main, /PostHogProvider/);
  assert.match(vite, /packageName === "posthog-js"[\s\S]*return undefined/);
  assert.match(featureFlags, /onPosthogReady/);
  assert.doesNotMatch(featureFlags, /posthog-js\/react/);
});

test('legacy GTM links redirect to the canonical live route', () => {
  const app = read('../src/App.tsx');
  const vercel = read('../vercel.json');

  assert.match(app, /path="\/gtm-strategist"[\s\S]*to="\/go-to-market"/);
  assert.match(vercel, /"source": "\/gtm-strategist"[\s\S]*"destination": "\/go-to-market"/);
});

test('known dead guide URLs do not return to the source tree', () => {
  const guides = read('../src/components/GuidesSection.tsx');

  assert.doesNotMatch(guides, /Brand-Guidelines\.pdf/);
  assert.doesNotMatch(guides, /how-to-start-a-creative-business/);
  assert.doesNotMatch(guides, /productivity-frontier-vF\.pdf/);
});
