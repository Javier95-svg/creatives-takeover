import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CORE_ROUTES = [
  '/',
  '/pricing',
  '/icp-builder',
  '/demo-studio',
  '/demo-studio/try',
  '/pmf-lab',
  '/mvp-builder',
  '/go-to-market',
  '/gtm-strategist',
  '/traction-engine',
  '/marketplace',
  '/build',
  '/mentorship',
  '/newspaper',
  '/about',
  '/faq',
  '/contact',
  '/services',
  '/resources',
  '/login',
  '/signup',
  '/privacy-policy',
  '/data-privacy',
  '/terms',
  '/ip-policy',
];

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const baseUrl = readArg('--base-url', 'http://127.0.0.1:4173').replace(/\/$/, '');
const outputFile = path.resolve(readArg('--output', 'test-results/route-audit.json'));
const maxRoutes = Number.parseInt(readArg('--max-routes', '120'), 10);
const settleMs = Number.parseInt(readArg('--settle-ms', '1800'), 10);
const shouldCrawl = args.includes('--crawl');
const isMobile = args.includes('--mobile');
const requestedRoutes = readArg('--routes', '')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);

const initialRoutes = requestedRoutes.length > 0 ? requestedRoutes : CORE_ROUTES;
const normalizeInternalRoute = (href) => {
  try {
    const url = new URL(href, baseUrl);
    if (url.origin !== new URL(baseUrl).origin) return null;
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.pathname.startsWith('/api/')) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
};

const uniqueMessages = (items) =>
  [...new Map(items.map((item) => [JSON.stringify(item), item])).values()];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(
  isMobile
    ? {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
);

await context.addInitScript(() => {
  window.__ctAudit = {
    cls: 0,
    lcp: 0,
    longTaskCount: 0,
    longTaskDuration: 0,
    layoutShifts: [],
  };

  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries[entries.length - 1];
      if (latest) window.__ctAudit.lcp = latest.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Unsupported performance entry types remain zero.
  }

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__ctAudit.cls += entry.value;
          window.__ctAudit.layoutShifts.push({
            value: entry.value,
            sources: [...(entry.sources ?? [])].map((source) => ({
              node:
                source.node?.id ||
                source.node?.getAttribute?.('data-testid') ||
                source.node?.className ||
                source.node?.nodeName ||
                'unknown',
              previousRect: source.previousRect,
              currentRect: source.currentRect,
            })),
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Unsupported performance entry types remain zero.
  }

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__ctAudit.longTaskCount += 1;
        window.__ctAudit.longTaskDuration += entry.duration;
      }
    }).observe({ type: 'longtask', buffered: true });
  } catch {
    // Unsupported performance entry types remain zero.
  }
});

const queue = initialRoutes.map((route) => normalizeInternalRoute(route)).filter(Boolean);
const queued = new Set(queue);
const audited = new Set();
const results = [];

while (queue.length > 0 && results.length < maxRoutes) {
  const route = queue.shift();
  if (!route || audited.has(route)) continue;
  audited.add(route);

  const page = await context.newPage();
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];
  const badResponses = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
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
        status: response.status(),
        method: response.request().method(),
        url: response.url(),
      });
    }
  });

  const startedAt = Date.now();
  let navigationStatus = null;
  let navigationError = null;

  try {
    const response = await page.goto(`${baseUrl}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    navigationStatus = response?.status() ?? null;
    await page.locator('#root').waitFor({ state: 'attached', timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(settleMs);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const snapshot = await page
    .evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      const scripts = resources.filter((resource) => resource.initiatorType === 'script');
      const styles = resources.filter(
        (resource) =>
          resource.initiatorType === 'css' ||
          (resource.name && new URL(resource.name, window.location.href).pathname.endsWith('.css')),
      );
      const images = resources.filter((resource) => resource.initiatorType === 'img');
      const sum = (entries, key) => entries.reduce((total, entry) => total + (entry[key] || 0), 0);
      const root = document.querySelector('#root');
      const bodyText = document.body?.innerText ?? '';
      const links = [...document.querySelectorAll('a[href]')].map((anchor) => ({
        href: anchor.href,
        text: (anchor.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160),
      }));
      const imagesWithoutDimensions = [...document.images]
        .filter((image) => !image.getAttribute('width') || !image.getAttribute('height'))
        .map((image) => image.currentSrc || image.src)
        .filter(Boolean);
      const eagerBelowFoldImages = [...document.images]
        .filter((image) => {
          const rect = image.getBoundingClientRect();
          return rect.top > window.innerHeight && image.loading !== 'lazy';
        })
        .map((image) => image.currentSrc || image.src)
        .filter(Boolean);

      return {
        finalUrl: window.location.href,
        title: document.title,
        rootTextLength: root?.textContent?.trim().length ?? 0,
        looksLikeNotFound:
          /page not found|404|couldn['’]t find/i.test(`${document.title}\n${bodyText.slice(0, 2500)}`),
        timings: navigation
          ? {
              ttfb: navigation.responseStart,
              domContentLoaded: navigation.domContentLoadedEventEnd,
              load: navigation.loadEventEnd,
            }
          : null,
        vitals: { ...window.__ctAudit },
        resources: {
          count: resources.length,
          transferBytes: sum(resources, 'transferSize'),
          decodedBytes: sum(resources, 'decodedBodySize'),
          scriptCount: scripts.length,
          scriptTransferBytes: sum(scripts, 'transferSize'),
          scriptDecodedBytes: sum(scripts, 'decodedBodySize'),
          styleCount: styles.length,
          styleTransferBytes: sum(styles, 'transferSize'),
          styleDecodedBytes: sum(styles, 'decodedBodySize'),
          imageCount: images.length,
          imageTransferBytes: sum(images, 'transferSize'),
          imageDecodedBytes: sum(images, 'decodedBodySize'),
        },
        links,
        imagesWithoutDimensions,
        eagerBelowFoldImages,
      };
    })
    .catch(() => null);

  if (shouldCrawl && snapshot) {
    for (const link of snapshot.links) {
      const discovered = normalizeInternalRoute(link.href);
      if (
        discovered &&
        !queued.has(discovered) &&
        !audited.has(discovered) &&
        queued.size < maxRoutes * 3
      ) {
        queued.add(discovered);
        queue.push(discovered);
      }
    }
  }

  results.push({
    route,
    durationMs: Date.now() - startedAt,
    navigationStatus,
    navigationError,
    ...snapshot,
    consoleMessages: uniqueMessages(consoleMessages),
    pageErrors: [...new Set(pageErrors)],
    failedRequests: uniqueMessages(failedRequests),
    badResponses: uniqueMessages(badResponses),
  });

  const result = results[results.length - 1];
  const issueCount =
    result.consoleMessages.length +
    result.pageErrors.length +
    result.failedRequests.length +
    result.badResponses.length +
    (result.looksLikeNotFound ? 1 : 0) +
    (result.navigationError ? 1 : 0);
  process.stdout.write(
    `${String(results.length).padStart(3, ' ')}/${maxRoutes} ${route} ` +
      `${navigationStatus ?? 'ERR'} issues=${issueCount} lcp=${Math.round(result.vitals?.lcp ?? 0)}ms\n`,
  );

  await page.close();
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  viewport: isMobile ? 'mobile-390x844' : 'desktop-1440x900',
  routesAudited: results.length,
  summary: {
    navigationErrors: results.filter((result) => result.navigationError).length,
    notFoundPages: results.filter((result) => result.looksLikeNotFound).length,
    routesWithPageErrors: results.filter((result) => result.pageErrors.length > 0).length,
    routesWithConsoleMessages: results.filter((result) => result.consoleMessages.length > 0).length,
    routesWithFailedRequests: results.filter((result) => result.failedRequests.length > 0).length,
    routesWithBadResponses: results.filter((result) => result.badResponses.length > 0).length,
  },
  results,
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`Wrote ${outputFile}\n`);
