import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  ATTRIBUTION_STORAGE_KEY,
  captureFirstTouch,
  getSignupMetadata,
  persistAttributionAfterAuth,
  type AttributionRpcClient,
} from "../src/lib/attribution.ts";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const storage = new MemoryStorage();

const installBrowser = ({
  href,
  referrer = "",
}: {
  href: string;
  referrer?: string;
}) => {
  const url = new URL(href);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      location: {
        host: url.host,
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
      },
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { referrer },
  });
  // captureFirstTouch() is gated on analytics consent. These cases exercise the
  // capture logic, so grant it; the gate itself is covered by cookie-consent.test.ts.
  storage.setItem(
    "ct_cookie_consent_v1",
    JSON.stringify({ analytics: "granted", decided_at: new Date().toISOString(), version: 1 }),
  );
};

beforeEach(() => storage.clear());
afterEach(() => {
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
});

test("captures and preserves the first campaign touch", () => {
  installBrowser({
    href: "https://creatives-takeover.com/pricing?utm_source=twitter&utm_medium=social&utm_campaign=launch&email=private@example.com",
    referrer: "https://x.com/some-post?token=private",
  });

  assert.deepEqual(captureFirstTouch(), {
    utm_source: "twitter",
    utm_medium: "social",
    utm_campaign: "launch",
    referrer: "https://x.com/some-post",
    landing_page: "/pricing?utm_source=twitter&utm_medium=social&utm_campaign=launch",
    captured_at: JSON.parse(storage.getItem(ATTRIBUTION_STORAGE_KEY) as string).captured_at,
  });

  installBrowser({ href: "https://creatives-takeover.com/?utm_source=google" });
  assert.equal(captureFirstTouch()?.utm_source, "twitter");
});

test("maps ad click identifiers and excludes internal referrers", () => {
  installBrowser({
    href: "https://www.creatives-takeover.com/signup?gclid=abc123",
    referrer: "https://creatives-takeover.com/pricing?secret=value",
  });

  const touch = captureFirstTouch();
  assert.equal(touch?.utm_source, "google");
  assert.equal(touch?.referrer, undefined);
  assert.equal(touch?.landing_page, "/signup");
});

test("migrates legacy PostHog UTMs into signup metadata", () => {
  storage.setItem("ct_posthog_first_touch_utms", JSON.stringify({
    utm_source: "producthunt",
    utm_campaign: "launch_day",
  }));
  installBrowser({ href: "https://creatives-takeover.com/signup" });

  assert.deepEqual(getSignupMetadata(), {
    utm_source: "producthunt",
    utm_campaign: "launch_day",
    landing_page: "/signup",
  });
});

test("persists direct attribution and never rejects authentication", async () => {
  installBrowser({ href: "https://creatives-takeover.com/signup" });
  captureFirstTouch();

  let capturedArgs: Record<string, unknown> | null = null;
  const client: AttributionRpcClient = {
    rpc: async (fn, args) => {
      assert.equal(fn, "capture_my_attribution");
      capturedArgs = args;
      return { error: null };
    },
  };
  await persistAttributionAfterAuth(client);
  assert.equal(capturedArgs?.p_utm_source, null);
  assert.equal(capturedArgs?.p_landing_page, "/signup");

  await assert.doesNotReject(() => persistAttributionAfterAuth({
    rpc: async () => { throw new Error("offline"); },
  }));
});

// Runs last: the in-memory visit touch lasts for the module's lifetime, as it
// does for one page load in the browser.
test("without consent, a sign-up is still credited to its channel and nothing is stored", async () => {
  installBrowser({
    href: "https://creatives-takeover.com/?utm_source=x&utm_medium=social",
    referrer: "https://t.co/abc",
  });
  storage.removeItem("ct_cookie_consent_v1");

  assert.equal(captureFirstTouch()?.utm_source, "x");
  // The visitor browses on: the landing page stays the one they arrived on.
  installBrowser({ href: "https://creatives-takeover.com/pricing" });
  storage.removeItem("ct_cookie_consent_v1");
  const metadata = getSignupMetadata();
  assert.equal(metadata.utm_source, "x");
  assert.equal(metadata.utm_medium, "social");
  assert.equal(metadata.signup_referrer, "https://t.co/abc");
  assert.equal(metadata.landing_page, "/?utm_source=x&utm_medium=social");

  const calls: Array<Record<string, unknown>> = [];
  const client: AttributionRpcClient = { rpc: async (_fn, args) => { calls.push(args); return { error: null }; } };
  await persistAttributionAfterAuth(client);
  assert.equal(calls[0]?.p_utm_source, "x");
  assert.equal(calls[0]?.p_referrer, "https://t.co/abc");

  // Nothing about the visit was written to the device.
  assert.equal(storage.getItem(ATTRIBUTION_STORAGE_KEY), null);
});
