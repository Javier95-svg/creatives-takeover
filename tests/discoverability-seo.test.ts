import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Startup Pedia covers the priority topics and the 30 startup shortcuts", () => {
  const topics = read("src/data/startupPedia/topics.ts");
  const shortcuts = read("src/data/startupPedia/shortcuts.ts");

  ["validation", "customers", "product", "growth", "metrics", "business-models", "fundraising", "programs"].forEach((key) => {
    assert.match(topics, new RegExp(`key: "${key}"`));
  });
  assert.equal((shortcuts.match(/acronym: "/g) || []).length, 30);
});

test("Startup Pedia entries route to tool-specific conversion paths", () => {
  const entries = ["validation", "customers", "product", "growth", "metrics", "fundraising", "programs"]
    .map((file) => read(`src/data/startupPedia/entries/${file}.ts`))
    .join("\n");

  ["/icp-builder", "/demo-studio", "/pmf-lab", "/mvp-builder", "/go-to-market", "/pitch-deck-analyzer", "/vc-search", "/validate"].forEach(
    (href) => {
      assert.match(entries, new RegExp(`href: "${href}"`));
    },
  );
  // Tracking parameters are added once, at render time.
  assert.match(read("src/data/startupPedia/index.ts"), /utm_source=seo&utm_medium=startup_pedia/);
});

test("public routing and sitemap include Startup Pedia", () => {
  const app = read("src/App.tsx");
  const sitemapIndex = read("public/sitemap.xml");
  const sitemap = read("public/sitemap-pages.xml");
  const seoConfig = read("scripts/seo-route-config.mjs");

  assert.match(app, /path="\/startup-pedia"/);
  assert.match(app, /path="\/startup-pedia\/:slug"/);
  assert.match(app, /path="\/startup-pedia\/topics\/:topic"/);
  assert.doesNotMatch(app, /path="\/answers/);
  assert.match(sitemapIndex, /sitemap-pages\.xml/);
  assert.match(sitemap, /https:\/\/creatives-takeover\.com\/startup-pedia</);
  assert.match(sitemap, /https:\/\/creatives-takeover\.com\/startup-pedia\/ideal-customer-profile</);
  assert.doesNotMatch(sitemap, /creatives-takeover\.com\/answers/);
  assert.match(seoConfig, /STARTUP_PEDIA_ROUTES/);
});

test("resources and homepage link internally to Startup Pedia", () => {
  assert.match(read("src/pages/Resources.tsx"), /FounderAnswerLibraryTeaser/);
  assert.match(read("src/pages/Index.tsx"), /FounderAnswerLibraryTeaser/);
});

test("growth roadmap records community guardrails and channel ownership", () => {
  const roadmap = read("docs/growth/discoverability-roadmap.md");

  assert.match(roadmap, /Do not use fake UGC/);
  assert.match(roadmap, /Growth Lead/);
  assert.match(roadmap, /Founder \/ Community Operator/);
  assert.match(roadmap, /Build My ICP Free/);
});

test("marketplace discovery entry point is canonical and prerendered", () => {
  const vercel = read("vercel.json");
  const config = read("scripts/seo-route-config.mjs");

  assert.match(vercel, /"source": "\/explore"[\s\S]*?"destination": "\/marketplace"[\s\S]*?"permanent": true/);
  assert.match(config, /path: "\/marketplace"/);
  assert.match(config, /schemaType: "collection"/);
  assert.match(read("public/sitemap-pages.xml"), /https:\/\/creatives-takeover\.com\/marketplace/);
});

test("dynamic public entities use server rendering and runtime sitemaps", () => {
  const vercel = read("vercel.json");
  const renderer = read("api/public-entity.ts");

  for (const route of ["marketplace/:slug", "mentorship/:slug", "co-founder/listing/:slug", "profile/:slug"]) {
    assert.match(vercel, new RegExp(route.replace(/[/:]/g, (character) => character === "/" ? "\\/" : ":")));
  }
  assert.match(vercel, /sitemap-entities\.xml/);
  assert.match(vercel, /sitemap-published\.xml/);
  assert.match(renderer, /status: 404/);
  assert.match(renderer, /'ProfilePage'/);
  assert.match(renderer, /'Service'/);
  assert.match(renderer, /'Person'/);
});

test("a story that is gone answers 404, not a soft 404", () => {
  const og = read("api/newspaper-og.ts");

  // Lookup succeeded and the article is absent: the status line has to say so,
  // or Search Console files the 200 as a soft 404.
  assert.match(og, /if \(!article\) \{[\s\S]*?return notFound\(\);/);
  assert.match(og, /status: 404/);
  assert.match(og, /'x-robots-tag': 'noindex,follow'/);

  // Everything else keeps answering 200. A 404 on a transient Supabase failure
  // would deindex live articles for the length of the outage, so exactly one
  // branch may be the 404 — the four passthroughs are reserved slugs, a bad
  // response, a malformed body, and the network catch.
  assert.equal(og.match(/return passthrough\(\);/g)?.length, 4);
  assert.match(og, /if \(!res\.ok\) \{\s*return passthrough\(\);/);
  assert.match(og, /\} catch \{[\s\S]*?return passthrough\(\);/);
});

test("founder and MVP indexing are review-gated server-side", () => {
  const migration = read("supabase/migrations/20260815170000_seo_aeo_discoverability.sql");
  const publishedSite = read("api/published-site.ts");

  assert.match(migration, /search_indexing_requested boolean NOT NULL DEFAULT false/);
  assert.match(migration, /search_indexing_review_status text NOT NULL DEFAULT 'not_requested'/);
  assert.match(migration, /profile_is_search_indexable/);
  assert.match(migration, /char_length\(btrim\(COALESCE\(p\.bio, ''\)\)\) >= 120/);
  assert.match(migration, /guard_search_indexing_review/);
  assert.match(migration, /string_agg\(format\('p\.%I', column_name\), ', ' ORDER BY ordinal_position\)/);
  assert.match(migration, /column_name <> 'seo_indexable'/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.public_profiles AS SELECT %s/);
  assert.match(publishedSite, /seo_indexable/);
  assert.match(publishedSite, /index,follow,max-image-preview:large/);
  assert.match(publishedSite, /robots\.txt/);
  assert.match(publishedSite, /sitemap\.xml/);
  assert.match(read("middleware.ts"), /'\/robots\.txt', '\/sitemap\.xml'/);
});

test("Startup Pedia schema keeps publication and revision provenance separate", () => {
  const data = read("src/data/startupPedia/entries/customers.ts").replace(/\r\n/g, "\n");
  const prerender = read("scripts/generate-prerendered-pages.mjs");

  // Migrated guides keep their original publication date; the rewrite is the revision.
  assert.match(data, /publishedAt: "2026-05-17",\n    modifiedAt: "2026-10-25",\n    legacySlugs: \["how-to-define-icp-for-startup"\]/);
  assert.match(prerender, /datePublished: routeConfig\.publishedAt/);
  assert.match(prerender, /dateModified: routeConfig\.modifiedAt/);
});

test("profile crawl rules use per-entity eligibility instead of a blanket block", () => {
  assert.doesNotMatch(read("public/robots.txt"), /Disallow: \/profile/);
  assert.doesNotMatch(read("scripts/seo-route-config.mjs"), /"\/profile"/);
  assert.doesNotMatch(read("src/components/RouteRobots.tsx"), /['"]\/profile['"]/);
  assert.match(read("src/pages/Profile.tsx"), /noindex=\{!profile\.seo_indexable\}/);
});
