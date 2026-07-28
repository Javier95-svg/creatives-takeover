import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const inputFile = path.resolve(readArg('--input', 'test-results/route-audit.json'));
const outputFile = path.resolve(readArg('--output', 'test-results/external-link-audit.json'));
const concurrency = Number.parseInt(readArg('--concurrency', '8'), 10);
const timeoutMs = Number.parseInt(readArg('--timeout-ms', '15_000'), 10);

const routeAudit = JSON.parse(await readFile(inputFile, 'utf8'));
const internalOrigin = new URL(routeAudit.baseUrl).origin;
const linksByUrl = new Map();

for (const result of routeAudit.results ?? []) {
  for (const link of result.links ?? []) {
    try {
      const url = new URL(link.href);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin === internalOrigin) continue;

      const existing = linksByUrl.get(url.href) ?? { url: url.href, texts: new Set(), sourceRoutes: new Set() };
      if (link.text) existing.texts.add(link.text);
      existing.sourceRoutes.add(result.route);
      linksByUrl.set(url.href, existing);
    } catch {
      // Invalid hrefs are reported by the route audit's browser console.
    }
  }
}

const classify = (status, error) => {
  if (error) return 'network_error';
  if (status >= 200 && status < 400) return 'ok';
  if ([401, 403, 406, 418, 429, 999].includes(status)) return 'blocked_by_remote';
  if ([404, 410].includes(status)) return 'broken';
  if (status >= 500) return 'remote_error';
  return 'unexpected_status';
};

const checkLink = async (link) => {
  const startedAt = Date.now();
  const headers = {
    accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
    'user-agent': 'Mozilla/5.0 (compatible; CreativesTakeoverLinkAudit/1.0)',
  };

  let response;
  let error = null;
  let method = 'HEAD';

  try {
    response = await fetch(link.url, {
      method,
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if ([400, 405, 501].includes(response.status)) {
      method = 'GET';
      response = await fetch(link.url, {
        method,
        headers: { ...headers, range: 'bytes=0-1023' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      await response.body?.cancel();
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  return {
    url: link.url,
    texts: [...link.texts],
    sourceRoutes: [...link.sourceRoutes],
    method,
    status: response?.status ?? null,
    finalUrl: response?.url ?? null,
    classification: classify(response?.status ?? 0, error),
    durationMs: Date.now() - startedAt,
    error,
  };
};

const pending = [...linksByUrl.values()];
const results = [];

const worker = async () => {
  while (pending.length > 0) {
    const link = pending.shift();
    const result = await checkLink(link);
    results.push(result);
    process.stdout.write(
      `${String(results.length).padStart(3, ' ')}/${linksByUrl.size} ` +
        `${result.status ?? 'ERR'} ${result.classification} ${result.url}\n`,
    );
  }
};

await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()));
results.sort((a, b) => a.url.localeCompare(b.url));

const report = {
  generatedAt: new Date().toISOString(),
  inputFile,
  linksChecked: results.length,
  summary: results.reduce((summary, result) => {
    summary[result.classification] = (summary[result.classification] ?? 0) + 1;
    return summary;
  }, {}),
  results,
};

await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`Wrote ${outputFile}\n`);
