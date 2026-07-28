import { request } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};

const baseUrl = readArg('--base-url', 'https://creatives-takeover.com').replace(/\/$/, '');
const outputFile = path.resolve(readArg('--output', 'test-results/header-audit.json'));
const context = await request.newContext();

const summarize = async (url) => {
  const response = await context.get(url, { failOnStatusCode: false });
  const headers = response.headers();
  const body = await response.body();
  return {
    url,
    status: response.status(),
    sizeBytes: body.length,
    headers: {
      age: headers.age ?? null,
      cacheControl: headers['cache-control'] ?? null,
      cdnCacheControl: headers['cdn-cache-control'] ?? null,
      contentEncoding: headers['content-encoding'] ?? null,
      contentType: headers['content-type'] ?? null,
      server: headers.server ?? null,
      vercelCache: headers['x-vercel-cache'] ?? null,
    },
    body,
  };
};

const home = await summarize(`${baseUrl}/`);
const homeHtml = home.body.toString('utf8');
const assetPaths = [
  ...homeHtml.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g),
].map((match) => new URL(match[1], baseUrl).href);
const uniqueAssetUrls = [...new Set(assetPaths)].slice(0, 6);

const targets = [
  home,
  await summarize(`${baseUrl}/robots.txt`),
  await summarize(`${baseUrl}/sitemap.xml`),
  ...(await Promise.all(uniqueAssetUrls.map(summarize))),
].map(({ body: _body, ...result }) => result);

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  targets,
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await context.dispose();

console.log(JSON.stringify(report, null, 2));
