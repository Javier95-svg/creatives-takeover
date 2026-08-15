import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("founder answer library exposes the intended acquisition clusters", () => {
  const data = read("src/data/founderAnswerPages.ts");

  [
    "how-to-define-icp-for-startup",
    "how-to-validate-startup-idea",
    "mvp-builder-for-startups",
    "go-to-market-strategy-for-startup",
    "pitch-deck-feedback-for-startups",
  ].forEach((slug) => {
    assert.match(data, new RegExp(`slug: "${slug}"`));
  });

  assert.match(data, /label: "ICP \/ Customer Clarity"/);
  assert.match(data, /label: "Validation"/);
  assert.match(data, /label: "Build"/);
  assert.match(data, /label: "Launch \/ GTM"/);
  assert.match(data, /label: "Fundraising"/);
});

test("answer pages route to tool-specific conversion paths", () => {
  const data = read("src/data/founderAnswerPages.ts");

  [
    "/icp-builder?utm_source=seo",
    "/demo-studio?utm_source=seo",
    "/pmf-lab?utm_source=seo",
    "/mvp-builder?utm_source=seo",
    "/go-to-market?utm_source=seo",
    "/pitch-deck-analyzer?utm_source=seo",
    "/vc-search?utm_source=seo",
  ].forEach((href) => {
    assert.match(data, new RegExp(href.replace(/[?]/g, "\\?")));
  });
});

test("public routing and sitemap include the answer library", () => {
  const app = read("src/App.tsx");
  const sitemapIndex = read("public/sitemap.xml");
  const sitemap = read("public/sitemap-pages.xml");
  const seoConfig = read("scripts/seo-route-config.mjs");

  assert.match(app, /path="\/answers"/);
  assert.match(app, /path="\/answers\/:slug"/);
  assert.match(sitemapIndex, /sitemap-pages\.xml/);
  assert.match(sitemap, /https:\/\/creatives-takeover\.com\/answers/);
  assert.match(sitemap, /https:\/\/creatives-takeover\.com\/answers\/how-to-define-icp-for-startup/);
  assert.match(seoConfig, /FOUNDER_ANSWER_ROUTES/);
});

test("resources and homepage link internally to the founder answer library", () => {
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

test("answer-page schema keeps publication and revision provenance separate", () => {
  const data = read("src/data/founderAnswerPages.ts");
  const prerender = read("scripts/generate-prerendered-pages.mjs");

  assert.match(data, /"how-to-define-icp-for-startup": \{ publishedAt: "2026-05-17", modifiedAt: "2026-07-22" \}/);
  assert.match(prerender, /datePublished: routeConfig\.publishedAt/);
  assert.match(prerender, /dateModified: routeConfig\.modifiedAt/);
});

test("profile crawl rules use per-entity eligibility instead of a blanket block", () => {
  assert.doesNotMatch(read("public/robots.txt"), /Disallow: \/profile/);
  assert.doesNotMatch(read("scripts/seo-route-config.mjs"), /"\/profile"/);
  assert.doesNotMatch(read("src/components/RouteRobots.tsx"), /['"]\/profile['"]/);
  assert.match(read("src/pages/Profile.tsx"), /noindex=\{!profile\.seo_indexable\}/);
});
