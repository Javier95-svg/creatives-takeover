import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const baseUrl = readArg('--base-url', 'https://creatives-takeover.com').replace(/\/$/, '');
const outputFile = path.resolve(readArg('--output', 'test-results/empty-validation-audit.json'));
const checks = [
  { route: '/icp-builder', button: 'Generate my free draft' },
  { route: '/demo-studio/try', button: 'Generate the demo' },
  { route: '/mvp-builder', button: 'Build', useLast: true },
  { route: '/go-to-market', button: 'Save' },
  { route: '/login', button: 'Sign In' },
  { route: '/signup', button: 'Create Account' },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const results = [];

for (const check of checks) {
  const page = await context.newPage();
  const mutationRequests = [];
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      mutationRequests.push({ method: request.method(), url: request.url() });
    }
  });

  await page.goto(`${baseUrl}${check.route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForTimeout(1_200);
  mutationRequests.length = 0;

  let clickError = null;
  const button = page.getByRole('button', { name: check.button, exact: true });
  try {
    const target = check.useLast ? button.last() : button.first();
    await target.click({ timeout: 10_000 });
    await page.waitForTimeout(1_000);
  } catch (error) {
    clickError = error instanceof Error ? error.message : String(error);
  }

  const feedback = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const candidates = [
      ...document.querySelectorAll(
        '[role="alert"], [aria-live], .text-destructive, [data-sonner-toast], input:invalid, textarea:invalid',
      ),
    ].filter(visible);

    return [...new Set(candidates.map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim()))]
      .filter(Boolean)
      .slice(0, 12);
  });

  const productMutations = mutationRequests.filter(
    ({ url }) =>
      !/posthog|amplitude|page_analytics|speed-insights|vercel\/insights|google-analytics/.test(url),
  );

  results.push({
    ...check,
    finalUrl: page.url(),
    clickError,
    feedback,
    productMutations,
    pageErrors: [...new Set(pageErrors)],
  });
  console.log(
    `${check.route}: feedback=${feedback.length} productMutations=${productMutations.length} errors=${pageErrors.length}`,
  );
  await page.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  summary: {
    checks: results.length,
    clicksSucceeded: results.filter((result) => !result.clickError).length,
    checksWithFeedback: results.filter((result) => result.feedback.length > 0).length,
    checksWithUnexpectedProductMutations: results.filter((result) => result.productMutations.length > 0).length,
    checksWithPageErrors: results.filter((result) => result.pageErrors.length > 0).length,
  },
  results,
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await browser.close();
console.log(`Wrote ${outputFile}`);
