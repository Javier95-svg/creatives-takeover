import { INDEXNOW_KEY } from "../api/indexnow.ts";
import { BASE_URL } from "./seo-route-config.mjs";

// Daily IndexNow submission (see .github/workflows/indexnow.yml). Bing, whose
// index ChatGPT search draws on, and the other IndexNow engines learn about a
// changed page within minutes instead of at their next crawl.
//
// The newspaper editor already pings when a story is published; Startup Pedia
// entries and page edits ship with a deploy and were never submitted. This reads
// the LIVE sitemaps, so it only ever submits pages that are already deployed,
// and picks the ones whose lastmod is within the last few days.

const DAY = 24 * 60 * 60 * 1000;

/** URLs from sitemap XML whose <lastmod> is on or after `since` (YYYY-MM-DD). */
export function recentlyChangedUrls(xml, since) {
  const urls = [];
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
    const lastmod = block.match(/<lastmod>\s*(\d{4}-\d{2}-\d{2})/)?.[1];
    if (loc?.startsWith(`${BASE_URL}/`) || loc === BASE_URL) {
      if (lastmod && lastmod >= since) urls.push(loc);
    }
  }
  return urls;
}

/** Child sitemap URLs listed in a sitemap index. */
export function childSitemaps(indexXml) {
  return [...indexXml.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(([, loc]) => loc);
}

async function main() {
  const days = Number(process.env.INDEXNOW_DAYS ?? 2);
  const since = new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
  const index = await (await fetch(`${BASE_URL}/sitemap.xml`)).text();
  const urls = new Set();
  for (const sitemap of childSitemaps(index)) {
    const response = await fetch(sitemap);
    if (!response.ok) {
      console.warn(`${sitemap}: ${response.status}, skipped`);
      continue;
    }
    for (const url of recentlyChangedUrls(await response.text(), since)) urls.add(url);
  }

  if (!urls.size) {
    console.log(`No pages changed since ${since}; nothing to submit.`);
    return;
  }
  const urlList = [...urls].slice(0, 10000);
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(BASE_URL).host, key: INDEXNOW_KEY, keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`, urlList }),
  });
  console.log(`Submitted ${urlList.length} pages changed since ${since}: IndexNow answered ${response.status}.`);
  for (const url of urlList) console.log(`  ${url}`);
  // 200 and 202 both mean accepted; anything else should show up as a failed run.
  if (response.status !== 200 && response.status !== 202) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
