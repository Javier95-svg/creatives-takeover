import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { INDEXABLE_ROUTES } from "../scripts/seo-route-config.mjs";
import { CANONICAL_ROUTE_ALIASES, isKnownAppRoute, isPrivateRoute } from "../src/config/seoRoutePolicy.ts";

const read = (path: string) => readFileSync(path, "utf8");

test("indexable routes are unique, self-canonical, and prerenderable", () => {
  const paths = INDEXABLE_ROUTES.map((route) => route.path);
  assert.equal(new Set(paths).size, paths.length);
  INDEXABLE_ROUTES.forEach((route) => {
    assert.equal(route.indexable, true);
    assert.equal(route.prerender, true);
    assert.equal(route.canonicalPath, route.path);
    assert.ok(route.title);
    assert.ok(route.description);
    assert.doesNotMatch(route.title, /\.\.\.$/);
  });
});

test("canonical commercial routes are in the manifest and aliases are not", () => {
  const paths = new Set(INDEXABLE_ROUTES.map((route) => route.path));
  ["/build", "/contact", "/marketplace", "/podcast", "/vc-search", "/email-templates", "/accelerator-hunt", "/pitch-deck-analyzer", "/insighta-test"]
    .forEach((path) => assert.equal(paths.has(path), true, `${path} must be indexable`));
  assert.equal(paths.has("/creatives-takeover"), false);
  CANONICAL_ROUTE_ALIASES.forEach(({ source, destination }) => {
    assert.equal(paths.has(source), false, `${source} must not enter the sitemap`);
    assert.equal(paths.has(destination), true, `${destination} must be canonical and indexable`);
  });
});

test("Vercel permanent redirects match the canonical alias policy", () => {
  const vercel = JSON.parse(read("vercel.json")) as { redirects: Array<{ source: string; destination: string; permanent: boolean }> };
  CANONICAL_ROUTE_ALIASES.forEach((alias) => {
    assert.ok(vercel.redirects.some((redirect) => redirect.source === alias.source && redirect.destination === alias.destination && redirect.permanent));
  });
});

test("private routes and random unknown routes have response-level policies", () => {
  assert.equal(isPrivateRoute("/creatives-takeover"), true);
  assert.equal(isPrivateRoute("/admin/newspaper"), true);
  assert.equal(isPrivateRoute("/messages/123"), true);
  assert.equal(isKnownAppRoute("/answers/example"), true);
  assert.equal(isKnownAppRoute("/definitely-not-a-real-route"), false);
  assert.match(read("middleware.ts"), /status: 404/);
  assert.match(read("middleware.ts"), /x-robots-tag': 'noindex, nofollow'/);
});

test("template and prerender generator use Helmet-owned SEO elements", () => {
  const template = read("index.html");
  const generator = read("scripts/generate-prerendered-pages.mjs");
  assert.match(template, /<title data-rh="true">/);
  assert.match(template, /<meta data-rh="true" name="description"/);
  assert.match(template, /<link data-rh="true" rel="canonical"/);
  assert.match(template, /<div id="root">\s*<main id="seo-fallback">/);
  assert.doesNotMatch(template, /\.js #seo-fallback/);
  assert.doesNotMatch(template, /SearchAction/);
  assert.match(generator, /<title data-rh="true">/);
  assert.match(generator, /<script data-rh="true" type="application\/ld\+json">/);
});

test("SEO component does not mechanically clip metadata", () => {
  const seo = read("src/components/SEO.tsx");
  assert.doesNotMatch(seo, /substring\(0, 57\)/);
  assert.doesNotMatch(seo, /substring\(0, 157\)/);
  assert.doesNotMatch(seo, /"@type": "LocalBusiness"/);
  assert.doesNotMatch(seo, /"@type": "SearchAction"/);
});
