import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

// ─── Source-level: the gate is present at every entry point ──────────────────

test('every analytics entry point is gated on consent', () => {
  const source = read('../src/lib/analytics.ts');

  assert.match(source, /import \{ hasAnalyticsConsent, onConsentChange \} from '@\/lib\/consent'/);

  // initPosthog must refuse even though PH_KEY has a hardcoded production fallback.
  const initPosthog = source.slice(source.indexOf('export const initPosthog'), source.indexOf('export const bootstrapPosthog'));
  assert.match(initPosthog, /!hasAnalyticsConsent\(\)/);

  // The gate must precede restoreDurableEventOutbox(), or a rejecting visitor
  // rehydrates a previous session's queued events.
  const bootstrap = source.slice(source.indexOf('export const bootstrapPosthog'), source.indexOf('export const bootstrapPosthog') + 400);
  assert.ok(
    bootstrap.indexOf('hasAnalyticsConsent') < bootstrap.indexOf('restoreDurableEventOutbox'),
    'consent gate must come before restoreDurableEventOutbox()',
  );

  const captureEvent = source.slice(source.indexOf('export const captureEvent'), source.indexOf('export const identify'));
  assert.match(captureEvent, /!hasAnalyticsConsent\(\)/);

  const identify = source.slice(source.indexOf('export const identify'), source.indexOf('export const captureAuthenticatedEvent'));
  assert.match(identify, /!hasAnalyticsConsent\(\)/);

  const amplitude = source.slice(source.indexOf('export const initAmplitudeWithUser'), source.indexOf('export const initAmplitudeWithUser') + 200);
  assert.match(amplitude, /!hasAnalyticsConsent\(\)/);

  // Withdrawing consent mid-session must tear the vendors down.
  assert.match(source, /onConsentChange\(\(status\) => \{[\s\S]*?teardownAnalyticsVendors\(\)/);
  assert.match(source, /opt_out_capturing\(\)/);
});

test('first-touch attribution is gated before it writes', () => {
  const source = read('../src/lib/attribution.ts');
  assert.match(source, /from "\.\/consent\.ts"/);

  const capture = source.slice(source.indexOf('export function captureFirstTouch'), source.indexOf('export function getSignupMetadata'));
  assert.ok(
    capture.indexOf('hasAnalyticsConsent') < capture.indexOf('safeGet()'),
    'consent gate must come before the first storage read/write',
  );
});

test('Vercel Analytics only mounts once consent is granted', () => {
  const source = read('../src/App.tsx');
  assert.match(source, /analyticsConsent === 'granted' && \(\s*<Suspense fallback=\{null\}>\s*<Analytics \/>/);
});

test('accepting takes effect without a reload', () => {
  const source = read('../src/main.tsx');
  assert.match(source, /onConsentChange\(\(status\) => \{\s*if \(status === 'granted'\) start\(\)/);
});

test('banner is non-modal, links to the privacy policy, and only reports accepts', () => {
  const source = read('../src/components/consent/CookieConsentBanner.tsx');

  assert.match(source, /role="region"/);
  assert.doesNotMatch(source, /role="dialog"/);
  // A Radix dialog would trap focus and become a centered modal on desktop.
  assert.doesNotMatch(source, /bottom-sheet|DialogContent/);
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
  get size() { return this.values.size; }
  keys() { return [...this.values.keys()]; }
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
