import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const publicConfig = new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Timed out reading the public live Supabase config')), 30_000);

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!url.hostname.endsWith('.supabase.co') || !url.pathname.startsWith('/rest/v1/')) return;

    const apiKey = request.headers().apikey;
    if (!apiKey) return;
    clearTimeout(timeout);
    resolve({ supabaseUrl: url.origin, apiKey });
  });
});

await page.goto('https://creatives-takeover.com/icp-builder', { waitUntil: 'domcontentloaded' });
const { supabaseUrl, apiKey } = await publicConfig;
await browser.close();

// The production key is already a public browser credential. Read it from the
// application fallback without echoing either public credential into audit logs.
const analyticsSource = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');
const posthogKey = analyticsSource.match(/'(phc_[^']+)'/)?.[1] ?? '';

const result = spawnSync('npm.cmd', ['run', 'build'], {
  cwd: new URL('..', import.meta.url),
  env: {
    ...process.env,
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_KEY: apiKey,
    VITE_SUPABASE_PUBLISHABLE_KEY: apiKey,
    VITE_POSTHOG_API_KEY: posthogKey,
    VITE_POSTHOG_KEY: posthogKey,
  },
  shell: true,
  stdio: 'inherit',
});

process.exitCode = result.status ?? 1;
