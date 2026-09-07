// Guards the internal-linking fixes for Google indexing.
//
// Background: Search Console reported 43 "Discovered – currently not indexed"
// and 21 "Crawled – currently not indexed". The causes were measurable in the
// build output — hubs that linked to none of their children, 22 prerendered
// shells shipping under 52 words, and sitemap entries that were really
// client-side redirects. These assertions pin the fixes so a later edit cannot
// quietly restore any of them.
//
// The shell assertions need `npm run build` output. When dist/ is absent they
// skip rather than fail, so the suite still runs on a clean checkout.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) => readFileSync(file, "utf8");

const DIST = "dist";
const hasDist = existsSync(path.join(DIST, "index.html"));

interface Shell {
  route: string;
  words: number;
  hrefs: string[];
}

function collectShells(): Shell[] {
  const files: string[] = [];
  (function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "index.html") files.push(full);
    }
  })(DIST);

  return files.map((file) => {
    const html = read(file);
    const match = html.match(/<main id="seo-fallback">([\s\S]*?)<\/main>/i);
    const inner = match ? match[1] : "";
    const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const route = `/${path
      .relative(DIST, file)
      .split(path.sep)
      .join("/")
      .replace(/index\.html$/, "")
      .replace(/\/$/, "")}`;
    return {
      route,
      words: text ? text.split(" ").length : 0,
      hrefs: [...new Set([...inner.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))],
    };
  });
}

function sitemapPaths(): string[] {
  return [...read("public/sitemap-pages.xml").matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname.replace(/\/$/, "") || "/");
}

// ---------------------------------------------------------------- config ---

test("sitemap routes are real pages, not client-side redirects", () => {
  const app = read("src/App.tsx");
  const config = read("scripts/seo-route-config.mjs");

  // These five were in the sitemap while App.tsx redirected them elsewhere, so
  // three systems disagreed on the canonical URL for the same page.
  for (const stub of [
    "/insighta/vc-search",
    "/insighta/email-templates",
    "/insighta/accelerator-hunt",
    "/insighta/pitch-deck-analyzer",
    "/insighta/test",
  ]) {
    assert.doesNotMatch(config, new RegExp(`path: "${stub}"`), `${stub} must not be an indexable route`);
    // ...and the old URL must still resolve, as a server redirect.
    assert.match(read("vercel.json"), new RegExp(`"source": "${stub}"`), `${stub} needs a 301`);
  }

  // /stories redirected only in React, so the server answered 200 with homepage content.
  assert.match(app, /path="\/stories" element=\{<Navigate to="\/newspaper"/);
  assert.match(read("vercel.json"), /"source": "\/stories", "destination": "\/newspaper", "permanent": true/);
});

test("every nav link in the prerendered shell is itself an indexable route", () => {
  const generator = read("scripts/generate-prerendered-pages.mjs");
  const config = read("scripts/seo-route-config.mjs");
  const navHrefs = [...generator.matchAll(/\{ href: "([^"]+)", label: "[^"]*" \}/g)].map((m) => m[1]);

  assert.ok(navHrefs.length > 0, "expected nav/footer links in the generator");
  for (const href of navHrefs) {
    if (href === "/") continue;
    assert.match(
      config,
      new RegExp(`path: "${href}"`),
      `${href} is linked from every shell but is not an indexable route`,
    );
  }
});

test("/build and /podcast are indexable, not SPA-catchall duplicates", () => {
  const config = read("scripts/seo-route-config.mjs");
  // Both carry an inbound link from every shell; before this they resolved to
  // dist/index.html and self-canonicalised to the homepage.
  assert.match(config, /path: "\/build"/);
  assert.match(config, /path: "\/podcast"/);
});

test("hub child links degrade instead of breaking the build", () => {
  const fetcher = read("scripts/fetch-hub-children.mjs");
  // A hub with no children is the old behaviour; a build that dies because
  // Supabase blinked is worse.
  assert.match(fetcher, /if \(!SUPABASE_KEY\) return \[\];/);
  assert.match(fetcher, /catch \{\s*return \[\];\s*\}/);
});

// ------------------------------------------------------------ build output ---

test("no prerendered shell is thin", { skip: !hasDist && "run npm run build first" }, () => {
  const thin = collectShells().filter((s) => s.words <= 51);
  assert.deepEqual(
    thin.map((s) => `${s.route} (${s.words}w)`),
    [],
    "shells at or under 51 words match what Google declined to index",
  );
});

test("hubs link to their children", { skip: !hasDist && "run npm run build first" }, () => {
  const shells = collectShells();
  for (const hub of ["/newspaper", "/mentorship", "/answers"]) {
    const shell = shells.find((s) => s.route === hub);
    assert.ok(shell, `${hub} shell missing`);
    const deep = shell.hrefs.filter((h) => h.startsWith(`${hub}/`));
    assert.ok(
      deep.length > 0,
      `${hub} links to none of its children — its pages would be sitemap-only again`,
    );
  }
});

test("no sitemap URL is orphaned", { skip: !hasDist && "run npm run build first" }, () => {
  const shells = collectShells();
  const linked = new Set<string>();
  for (const shell of shells) {
    for (const href of shell.hrefs) {
      linked.add(href.split("?")[0].split("#")[0].replace(/\/$/, "") || "/");
    }
  }
  const orphans = sitemapPaths().filter((p) => !linked.has(p));
  assert.deepEqual(orphans, [], "sitemap URLs with no inbound internal link");
});

test("every indexable route has a prerendered shell", { skip: !hasDist && "run npm run build first" }, () => {
  const routes = collectShells().map((s) => s.route);
  const missing = sitemapPaths().filter((p) => !routes.includes(p));
  assert.deepEqual(missing, [], "sitemap URLs with no prerendered shell");
});
