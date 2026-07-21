import { defineConfig, devices } from '@playwright/test';

// Smoke tests boot the dev server with DUMMY Supabase env so the app always
// mounts (independent of CI secrets) — we only assert that public pages render
// and don't crash, not that data loads.
// Use 127.0.0.1 (not "localhost") so the test client and the dev server agree
// on IPv4 — CI runners can resolve localhost to IPv6 (::1) while Vite binds
// elsewhere, causing connection timeouts.
const PORT = 8080;
const HOST = '127.0.0.1';
const baseURL = `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Serial: the dev server compiles routes on-demand, so parallel cold hits
  // overwhelm it. One worker warms it up progressively and is reliable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 45_000,
  // Tool routes compile large authenticated workspaces on first request in CI.
  // Keep assertions strict while allowing the cold GTM bundle to mount reliably.
  expect: { timeout: 25_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --host ${HOST} --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Merged with process.env by Playwright — guarantees the app boots in CI.
    env: {
      VITE_SUPABASE_URL: 'https://dummy.supabase.co',
      VITE_SUPABASE_KEY: 'dummy-anon-key-for-smoke',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'dummy-anon-key-for-smoke',
      VITE_AMPLITUDE_API_KEY: 'dummy-amplitude-key-for-smoke',
    },
  },
});
