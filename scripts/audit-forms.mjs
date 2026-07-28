import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const baseUrl = readArg('--base-url', 'https://creatives-takeover.com').replace(/\/$/, '');
const outputFile = path.resolve(readArg('--output', 'test-results/form-audit.json'));
const routes = readArg(
  '--routes',
  '/icp-builder,/demo-studio/try,/pmf-lab,/mvp-builder,/go-to-market,/traction-engine,/marketplace,/pricing,/contact,/login,/signup',
)
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const results = [];

for (const route of routes) {
  const page = await context.newPage();
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    failedRequests.push({
      method: request.method(),
      url: request.url(),
      error: request.failure()?.errorText ?? 'unknown',
    });
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      badResponses.push({
        method: response.request().method(),
        status: response.status(),
        url: response.url(),
      });
    }
  });

  let navigationError = null;
  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(1_500);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const snapshot = await page.evaluate(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };

    const controls = [...document.querySelectorAll('input, textarea, select')]
      .filter(isVisible)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type'),
        name: element.getAttribute('name'),
        placeholder: element.getAttribute('placeholder'),
        required: element.hasAttribute('required'),
        disabled: element.disabled,
        ariaLabel: element.getAttribute('aria-label'),
      }));

    const forms = [...document.forms].map((form) => ({
      action: form.action,
      method: form.method,
      visible: isVisible(form),
      controlCount: form.elements.length,
      requiredCount: [...form.elements].filter((element) => element.hasAttribute?.('required')).length,
      emptyStateIsValid: form.checkValidity(),
    }));

    const buttons = [...document.querySelectorAll('button, input[type="submit"]')]
      .filter(isVisible)
      .map((button) => ({
        text: (button.textContent ?? button.getAttribute('value') ?? '').replace(/\s+/g, ' ').trim().slice(0, 120),
        type: button.getAttribute('type'),
        disabled: button.disabled,
      }));

    return {
      finalUrl: window.location.href,
      title: document.title,
      forms,
      controls,
      buttons,
    };
  });

  results.push({
    route,
    navigationError,
    ...snapshot,
    pageErrors: [...new Set(pageErrors)],
    failedRequests,
    badResponses,
  });
  console.log(`${route}: forms=${snapshot.forms.length} controls=${snapshot.controls.length} errors=${pageErrors.length}`);
  await page.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  summary: {
    routes: results.length,
    forms: results.reduce((total, result) => total + result.forms.length, 0),
    visibleControls: results.reduce((total, result) => total + result.controls.length, 0),
    routesWithPageErrors: results.filter((result) => result.pageErrors.length > 0).length,
    routesWithFailedRequests: results.filter((result) => result.failedRequests.length > 0).length,
    routesWithBadResponses: results.filter((result) => result.badResponses.length > 0).length,
  },
  results,
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await browser.close();
console.log(`Wrote ${outputFile}`);
