import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { INDEXABLE_ROUTES } from "../scripts/seo-route-config.mjs";
import { PRICING_FAQS } from "../src/config/pricingFaq.ts";
import { PLATFORM_FAQS } from "../src/config/platformFaq.ts";
import { SITE_IDENTITY } from "../src/config/siteIdentity.ts";
import { extractArticleCitations, getArticleCitationStatus } from "../src/lib/articleCitations.ts";

const read = (path: string) => readFileSync(path, "utf8");

test("indexable route metadata has no retired route or mechanical title truncation", () => {
  assert.equal(INDEXABLE_ROUTES.length, 60);
  assert.equal(INDEXABLE_ROUTES.some((route) => route.path === "/creatives-takeover"), false);

  for (const route of INDEXABLE_ROUTES) {
    assert.doesNotMatch(route.title, /\.\.\.$/);
    assert.ok(route.title.length <= 65, `${route.path} title is ${route.title.length} characters`);
    if (route.path !== "/") {
      assert.ok(route.breadcrumb?.length >= 2, `${route.path} is missing breadcrumbs`);
    }
  }
});

test("pricing questions and schema use the canonical plan configuration", () => {
  assert.equal(PRICING_FAQS.length, 11);
  assert.match(PRICING_FAQS.map((faq) => faq.answer).join(" "), /50 credits/);
  assert.match(PRICING_FAQS.map((faq) => faq.answer).join(" "), /600 credits/);
  assert.match(read("src/pages/PricingPage.tsx"), /createFAQSchema\(PRICING_FAQS\)/);
});

test("platform FAQs are visible and schema-backed from one source", () => {
  assert.equal(PLATFORM_FAQS.length, 6);
  const page = read("src/pages/FAQPage.tsx");
  const routeConfig = read("scripts/seo-route-config.mjs");
  assert.match(page, /createFAQSchema\(PLATFORM_FAQS\)/);
  assert.match(page, /faqs=\{PLATFORM_FAQS\}/);
  assert.match(routeConfig, /faqs: PLATFORM_FAQS/);
});

test("resources use verifiable guide counts without changing existing application routes", () => {
  const resources = read("src/pages/Resources.tsx");
  assert.match(resources, /founderAnswerPages\.length/);
  assert.match(resources, /CollectionPage/);
  assert.doesNotMatch(resources, /100,000\+|50,000\+|500\+|creative subscription/i);
  assert.doesNotMatch(read("vercel.json"), /"source": "\/services"/);
  assert.match(read("src/App.tsx"), /path="\/services" element=\{<Services \/>\}/);
  assert.match(read("src/App.tsx"), /path="\/creatives-takeover" element=\{<AdminRoute><CreativesTakeover \/><\/AdminRoute>\}/);
});

test("founder answers expose deeper static evidence, sources, and a named founder", () => {
  const answers = INDEXABLE_ROUTES.filter((route) => route.path.startsWith("/answers/"));
  assert.equal(answers.length, 25);
  for (const answer of answers) {
    assert.ok(answer.sections?.length >= 7, `${answer.path} lacks evidence sections`);
    assert.ok(answer.sources?.length >= 2, `${answer.path} lacks primary sources`);
  }

  const page = read("src/pages/FounderAnswerPage.tsx");
  assert.match(page, /SITE_AUTHOR\.name/);
  assert.match(page, /citation: evidence\.sources/);
  assert.match(page, /Sources and further reading/);
  assert.equal(page.includes("Javier Alonso"), false);
  assert.equal(SITE_IDENTITY.founder.name, "Javier Peña");
});

test("article citations are extracted, deduplicated, and checked for quantitative claims", () => {
  const markdown = [
    "The sample included 1,250 founders and 42% reached activation.",
    "See [the report](https://example.com/report?year=2026#results).",
    "Duplicate: https://example.com/report?year=2026#appendix",
    "Internal: https://creatives-takeover.com/answers",
  ].join("\n");
  const status = getArticleCitationStatus(markdown);

  assert.equal(status.containsQuantitativeClaims, true);
  assert.equal(status.needsSourceWarning, false);
  assert.equal(status.citations.length, 1);
  assert.equal(status.citations[0].url, "https://example.com/report?year=2026");
  assert.equal(extractArticleCitations("Revenue grew 25% with no link.").length, 0);
  assert.equal(getArticleCitationStatus("Revenue grew 25% with no link.").needsSourceWarning, true);
});

test("article publishing surfaces source and metadata quality before release", () => {
  const article = read("src/pages/StoryArticle.tsx");
  const editor = read("src/pages/AdminStoryEditor.tsx");
  assert.doesNotMatch(article, /substring\(0, 157\)/);
  assert.doesNotMatch(article, /primaryTag && !metaTitle/);
  assert.match(editor, /final meta title is \$\{finalMetaTitle\.length\}/i);
  assert.match(editor, /quantitative claims but no external source links/i);
  assert.match(editor, /used as written, without automatic padding or truncation/i);
});

test("analytics are deferred and the bundle no longer creates a chunk per package", () => {
  const html = read("index.html");
  const main = read("src/main.tsx");
  const vite = read("vite.config.ts");

  assert.match(html, /requestIdleCallback\(startTelemetry/);
  assert.doesNotMatch(html, /cdn\.amplitude\.com\/libs/);
  assert.match(main, /await import\('\.\/lib\/analytics'\)/);
  assert.doesNotMatch(main, /PostHogProvider/);
  assert.doesNotMatch(vite, /return `vendor-\$\{sanitizeChunkName\(packageName\)\}`/);
});

test("crawler discovery files are generated from the full route inventory", () => {
  const generator = read("scripts/generate-seo-assets.mjs");
  assert.match(generator, /generateLlmsTxt/);
  assert.match(generator, /INDEXABLE_ROUTES\.map/);
  assert.match(generator, /ClaudeBot/);
  assert.match(generator, /Google-Extended/);
});
