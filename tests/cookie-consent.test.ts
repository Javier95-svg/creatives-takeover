import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// ─── Source-level: the gate is present at every entry point ──────────────────

test('without consent PostHog only counts visits cookieless; everything that stores or identifies stays gated', () => {
  const source = read('../src/lib/analytics.ts');

  assert.match(source, /import \{ hasAnalyticsConsent, onConsentChange \} from '@\/lib\/consent'/);

  // PostHog loads for everyone, cookieless until the visitor accepts.
  const initPosthog = source.slice(source.indexOf('export const initPosthog'), source.indexOf('export const bootstrapPosthog'));
  assert.match(initPosthog, /cookieless_mode: 'on_reject'/);
  assert.match(initPosthog, /applyPosthogConsent\(posthogClient\);\s*registerFirstTouchUtms\(\)/);
  // Recorded clicks and interactions are dropped without consent.
  assert.match(initPosthog, /!hasAnalyticsConsent\(\) && CONSENT_ONLY_EVENTS\.has\(captureResult\.event\)/);
  assert.match(source, /CONSENT_ONLY_EVENTS = new Set\(\['\$autocapture'/);

  // Undecided or rejected: opted out, which on_reject turns into cookieless.
  const apply = source.slice(source.indexOf('const applyPosthogConsent'), source.indexOf('export const initPosthog'));
  assert.match(apply, /if \(hasAnalyticsConsent\(\)\) \{\s*if \(client\.get_explicit_consent_status\(\) !== 'granted'\) client\.opt_in_capturing/);
  // Re-applied on every load: it sends the first pageview of a cookieless page load.
  assert.match(apply, /\} else \{\s*client\.opt_out_capturing\(\);/);

  // A rejecting visitor never rehydrates a previous session's queued events.
  const bootstrap = source.slice(source.indexOf('export const bootstrapPosthog'), source.indexOf('export const bootstrapPosthog') + 400);
  assert.match(bootstrap, /if \(hasAnalyticsConsent\(\)\) restoreDurableEventOutbox\(\)/);

  // Without consent an event goes to PostHog only: no Amplitude, no durable outbox.
  const captureEvent = source.slice(source.indexOf('export const captureEvent'), source.indexOf('export const identify'));
  const unconsented = captureEvent.slice(captureEvent.indexOf('if (!hasAnalyticsConsent())'), captureEvent.indexOf('restoreDurableEventOutbox()'));
  assert.ok(unconsented.length > 0);
  assert.doesNotMatch(unconsented, /captureAmplitudeEvent|persistDurableEvent/);

  const identify = source.slice(source.indexOf('export const identify'), source.indexOf('export const captureAuthenticatedEvent'));
  assert.match(identify, /!hasAnalyticsConsent\(\)/);

  const amplitude = source.slice(source.indexOf('export const initAmplitudeWithUser'), source.indexOf('export const initAmplitudeWithUser') + 200);
  assert.match(amplitude, /!hasAnalyticsConsent\(\)/);

  const guestRecording = source.slice(source.indexOf('export const recordGuestSession'), source.indexOf('export const onPosthogReady'));
  assert.match(guestRecording, /if \(!hasAnalyticsConsent\(\)\) return/);

  // Withdrawing consent resets the identity first, then goes cookieless.
  assert.match(source, /onConsentChange\(\(status\) => \{[\s\S]*?teardownAnalyticsVendors\(\)/);
  const teardown = source.slice(source.indexOf('const teardownAnalyticsVendors'), source.indexOf('const teardownAnalyticsVendors') + 600);
  assert.ok(teardown.indexOf('resetAnalyticsIdentity()') < teardown.indexOf('applyPosthogConsent'), 'reset must precede the cookieless switch');
});

test('first-touch attribution is gated before it writes', () => {
  const source = read('../src/lib/attribution.ts');
  assert.match(source, /from "\.\/consent\.ts"/);

  const capture = source.slice(source.indexOf('export function captureFirstTouch'), source.indexOf('/** The stored first touch'));
  assert.ok(
    capture.indexOf('hasAnalyticsConsent') < capture.indexOf('safeGet()'),
    'consent gate must come before the first storage read/write',
  );
  // Without consent the touch lives in memory only: no storage read or write.
  const unconsented = capture.slice(capture.indexOf('if (!hasAnalyticsConsent())'), capture.indexOf('const existing = safeGet()'));
  assert.match(unconsented, /visitTouch \?\?= touchFromPage/);
  assert.doesNotMatch(unconsented, /safeGet|safeSet|localStorage|readLegacyPosthogUtms/);
});

test('Vercel Analytics only mounts once consent is granted', () => {
  const source = read('../src/App.tsx');
  assert.match(source, /analyticsConsent === 'granted' && \(\s*<Suspense fallback=\{null\}>\s*<Analytics \/>/);
});

test('accepting takes effect without a reload, and undecided visitors are still counted', () => {
  const source = read('../src/main.tsx');
  assert.match(source, /onConsentChange\(\(status\) => \{\s*if \(status === 'granted'\) start\(\)/);
  // Undecided visitors are counted, and their landing page is held in memory.
  assert.match(source, /if \(hasAnalyticsConsent\(\)\) start\(\);\s*else \{[\s\S]*?captureFirstTouch\(\);\s*bootstrapPosthog\(\);/);
});

test('banner is non-modal, links to the privacy policy, and only reports accepts', () => {
  const source = read('../src/components/consent/CookieConsentBanner.tsx');

  assert.match(source, /role="region"/);
  assert.doesNotMatch(source, /role="dialog"/);
  // A Radix dialog would trap focus and become a centered modal on desktop.
  assert.doesNotMatch(source, /from ['"][^'"]*bottom-sheet['"]|DialogContent/);
  assert.match(source, /to="\/privacy-policy"/);
  assert.match(source, /Reject All/);
  assert.match(source, /Accept All/);
  assert.match(source, /z-\[70\]/);
  assert.match(source, /env\(safe-area-inset-bottom,0px\)/);

  // A *_rejected or *_shown event would be dropped by the gate itself.
  assert.match(source, /cookie_consent_accepted/);
  assert.doesNotMatch(source, /cookie_consent_rejected|cookie_consent_shown/);
});

// ─── Runtime: consent.ts is React-free and directly importable ───────────────

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
}

const local = new MemoryStorage();
const session = new MemoryStorage();

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: local, sessionStorage: session },
});

const { getAnalyticsConsent, hasAnalyticsConsent, setAnalyticsConsent, clearAnalyticsConsent, onConsentChange, CONSENT_STORAGE_KEY } =
  await import('../src/lib/consent.ts');

beforeEach(() => {
  local.clear();
  session.clear();
  clearAnalyticsConsent();
  local.clear();
});

test('undecided visitors are not consented', () => {
  assert.equal(getAnalyticsConsent(), 'unknown');
  assert.equal(hasAnalyticsConsent(), false);
});

test('a decision round-trips through storage', () => {
  setAnalyticsConsent('granted');
  assert.equal(hasAnalyticsConsent(), true);
  assert.match(local.getItem(CONSENT_STORAGE_KEY) as string, /"analytics":"granted"/);

  setAnalyticsConsent('denied');
  assert.equal(hasAnalyticsConsent(), false);
});

test('rejecting purges the event outbox and stored attribution', () => {
  session.setItem('ct_analytics_event_outbox_v1', '[{"eventName":"x"}]');
  local.setItem('ct_first_touch_v1', '{"utm_source":"twitter"}');
  local.setItem('ct_posthog_first_touch_utms', '{"utm_source":"twitter"}');
  local.setItem('ph_phc_abc_posthog', '{"distinct_id":"1"}');

  setAnalyticsConsent('denied');

  assert.equal(session.getItem('ct_analytics_event_outbox_v1'), null);
  assert.equal(local.getItem('ct_first_touch_v1'), null);
  assert.equal(local.getItem('ct_posthog_first_touch_utms'), null);
  assert.equal(local.getItem('ph_phc_abc_posthog'), null);
});

test('listeners are notified and can unsubscribe', () => {
  const seen: string[] = [];
  const off = onConsentChange((status) => seen.push(status));

  setAnalyticsConsent('granted');
  setAnalyticsConsent('denied');
  off();
  setAnalyticsConsent('granted');

  assert.deepEqual(seen, ['granted', 'denied']);
});

test('a corrupt record is treated as undecided rather than consented', () => {
  local.setItem(CONSENT_STORAGE_KEY, 'not json');
  assert.equal(getAnalyticsConsent(), 'unknown');
});
