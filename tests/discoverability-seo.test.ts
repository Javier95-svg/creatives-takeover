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
  const sitemap = read("public/sitemap-pages.xml");
  const seoConfig = read("scripts/seo-route-config.mjs");

  assert.match(app, /path="\/answers"/);
  assert.match(app, /path="\/answers\/:slug"/);
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
