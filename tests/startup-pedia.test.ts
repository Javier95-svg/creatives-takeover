import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  MIN_ENTRIES_PER_TOPIC_PAGE,
  PEDIA_ENTRIES,
  PEDIA_TOPICS,
  STARTUP_SHORTCUTS,
  ctaSignupHref,
  pediaCtaHref,
  entryPlainText,
  entryWordCount,
  getEntriesByTopic,
  getEntry,
  isTopicIndexable,
  legacyRedirects,
} from "../src/data/startupPedia/index.ts";
import { markdownToHtml } from "../src/lib/markdownToHtml.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// Every URL the retired Founder Answer Library (/answers) published.
const RETIRED_ANSWER_SLUGS = [
  "how-to-define-icp-for-startup",
  "ideal-customer-profile-template",
  "startup-positioning-examples",
  "how-to-validate-startup-idea",
  "waitlist-before-mvp",
  "product-market-fit-survey-questions",
  "mvp-builder-for-startups",
  "tech-stack-for-startup",
  "go-to-market-strategy-for-startup",
  "first-users-for-saas",
  "startup-launch-checklist",
  "pitch-deck-feedback-for-startups",
  "vc-search-for-startups",
  "accelerator-alternatives",
  "how-to-find-your-target-audience",
  "customer-interview-questions",
  "signs-your-startup-idea-is-good",
  "no-code-vs-code-for-mvp",
  "mvp-feature-prioritization",
  "how-to-get-first-100-users",
  "product-hunt-launch-guide",
  "cold-email-for-startups",
  "how-to-find-investors-for-startup",
  "pre-seed-vs-seed-funding",
  "startup-pitch-deck-outline",
];

test("entry slugs are unique, URL-safe and never collide with the topics path", () => {
  const slugs = PEDIA_ENTRIES.map((entry) => entry.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, slug);
    assert.notEqual(slug, "topics");
  }
});

test("every entry belongs to a real topic and links only to real entries", () => {
  const topicKeys = new Set(PEDIA_TOPICS.map((topic) => topic.key));
  for (const entry of PEDIA_ENTRIES) {
    assert.ok(topicKeys.has(entry.topic), `${entry.slug}: unknown topic ${entry.topic}`);
    assert.ok(entry.relatedSlugs.length >= 2, `${entry.slug}: needs related entries`);
    for (const related of entry.relatedSlugs) {
      assert.ok(getEntry(related), `${entry.slug}: related ${related} does not exist`);
      assert.notEqual(related, entry.slug);
    }
  }
});

test("all 30 startup shortcuts resolve, including their anchors", () => {
  assert.equal(STARTUP_SHORTCUTS.length, 30);
  assert.equal(new Set(STARTUP_SHORTCUTS.map((shortcut) => shortcut.acronym)).size, 30);
  for (const shortcut of STARTUP_SHORTCUTS) {
    const entry = getEntry(shortcut.slug);
    assert.ok(entry, `${shortcut.acronym}: no entry ${shortcut.slug}`);
    if (shortcut.anchor) {
      assert.ok(entry.sections.some((section) => section.id === shortcut.anchor), `${shortcut.acronym}: missing #${shortcut.anchor}`);
    }
  }
});

test("titles and descriptions fit search result limits", () => {
  for (const item of [...PEDIA_ENTRIES, ...PEDIA_TOPICS]) {
    const name = "slug" in item ? item.slug : item.key;
    assert.ok(item.metaTitle.length <= 60, `${name}: title ${item.metaTitle.length} chars`);
    assert.ok(item.metaDescription.length <= 160, `${name}: description ${item.metaDescription.length} chars`);
    assert.ok(item.metaDescription.length >= 110, `${name}: description too short to be useful`);
  }
});

test("entries are substantial but not padded, and never show internal SEO notes", () => {
  for (const entry of PEDIA_ENTRIES) {
    const words = entryWordCount(entry);
    const floor = entry.kind === "term" ? 350 : 450;
    assert.ok(words >= floor, `${entry.slug}: ${words} words, below ${floor}`);
    assert.ok(words <= 1600, `${entry.slug}: ${words} words, too long for a reference entry`);
    assert.ok(entry.faqs.length >= 3, `${entry.slug}: needs at least 3 FAQs`);
    assert.doesNotMatch(entryPlainText(entry), /search intent/i, entry.slug);
    for (const source of entry.sources) assert.match(source.url, /^https:\/\//, `${entry.slug}: ${source.url}`);
  }
});

test("topic intros are original summaries of 80 to 170 words", () => {
  for (const topic of PEDIA_TOPICS) {
    const words = topic.intro.split(/\s+/).length;
    assert.ok(words >= 80 && words <= 170, `${topic.key}: ${words} words`);
  }
});

test("a topic page is indexable only once it has enough entries", () => {
  for (const topic of PEDIA_TOPICS) {
    assert.equal(isTopicIndexable(topic.key), getEntriesByTopic(topic.key).length >= MIN_ENTRIES_PER_TOPIC_PAGE);
  }
});

test("internal links in entry bodies and CTAs point at real routes", () => {
  const app = read("src/App.tsx");
  const routeExists = (path: string) => app.includes(`path="${path}"`);
  for (const entry of PEDIA_ENTRIES) {
    const bodies = [...entry.sections.map((section) => section.body), ...(entry.steps || []).map((step) => step.body)];
    for (const body of bodies) {
      for (const [, href] of body.matchAll(/\]\((\/[^)\s#]*)/g)) {
        if (href.startsWith("/startup-pedia/")) {
          assert.ok(getEntry(href.split("/")[2]), `${entry.slug}: broken link ${href}`);
        } else {
          assert.ok(routeExists(href), `${entry.slug}: ${href} is not an app route`);
        }
      }
    }
    if (entry.cta) {
      assert.ok(routeExists(entry.cta.href), `${entry.slug}: CTA ${entry.cta.href} is not an app route`);
      assert.doesNotMatch(entry.cta.href, /utm_/, `${entry.slug}: tracking is added at render time`);
    }
  }
  for (const topic of PEDIA_TOPICS) {
    for (const tool of topic.tools) assert.ok(routeExists(tool.href), `${topic.key}: ${tool.href}`);
  }
});

test("signed-out readers go from a CTA straight to signup, then on to the tool", () => {
  const href = ctaSignupHref("/mvp-scope", "minimum-viable-product");
  const url = new URL(href, "https://creatives-takeover.com");
  assert.equal(url.pathname, "/signup");
  assert.equal(url.searchParams.get("source"), "startup_pedia");
  assert.equal(url.searchParams.get("utm_campaign"), "minimum-viable-product");
  assert.equal(
    url.searchParams.get("return"),
    "/mvp-scope?utm_source=seo&utm_medium=startup_pedia&utm_campaign=minimum-viable-product",
  );
  // One rule for every "Put it into practice" link: members go to the page,
  // visitors to signup, and public pages (the programs page) never detour.
  assert.match(pediaCtaHref("/mvp-scope", "x", false), /^\/signup\?/);
  assert.match(pediaCtaHref("/mvp-scope", "x", true), /^\/mvp-scope\?utm_source=seo/);
  assert.match(pediaCtaHref("/enterprise", "x", false), /^\/enterprise\?utm_source=seo/);
  assert.match(read("src/pages/StartupPediaEntry.tsx"), /to=\{pediaCtaHref\(entry\.cta\.href, entry\.slug, Boolean\(user\)\)\}/);
  assert.match(read("src/pages/StartupPediaTopic.tsx"), /pediaCtaHref\(href, `topic-\$\{topic\.key\}`, Boolean\(user\)\)/);
  assert.match(read("scripts/seo-route-config.mjs"), /href: pediaCtaHref\(entry\.cta\.href, entry\.slug, false\)/);
});

test("every retired /answers URL 301s to an existing entry", () => {
  const redirects = legacyRedirects();
  const mapped = redirects.map((redirect) => redirect.from.replace("/answers/", "")).sort();
  assert.deepEqual(mapped, [...RETIRED_ANSWER_SLUGS].sort());

  const vercel = JSON.parse(read("vercel.json")) as { redirects: Array<{ source: string; destination: string; permanent: boolean }> };
  const sources = vercel.redirects.map((redirect) => redirect.source);
  for (const { from, to } of redirects) {
    const rule = vercel.redirects.find((redirect) => redirect.source === from);
    assert.ok(rule, `${from} has no redirect`);
    assert.equal(rule.destination, to);
    assert.equal(rule.permanent, true);
    assert.ok(getEntry(to.split("/")[2]), `${to} is not an entry`);
  }
  // The catch-alls come after the specific rules, so they never shadow them.
  const catchAll = sources.indexOf("/answers/:path*");
  assert.ok(catchAll > -1 && sources.indexOf("/answers") > -1);
  for (const { from } of redirects) assert.ok(sources.indexOf(from) < catchAll, `${from} is shadowed by the catch-all`);
});

test("the author byline links to the Founder ID profile in the page and the crawler HTML", () => {
  assert.match(read("src/pages/StartupPediaEntry.tsx"), /AUTHOR_PROFILE_PATH = "\/profile\/javier"/);
  assert.match(read("src/pages/StartupPediaEntry.tsx"), /<Link to=\{AUTHOR_PROFILE_PATH\} className="sp-link">/);
  const prerender = read("scripts/generate-prerendered-pages.mjs");
  assert.match(prerender, /<p>By <a href="\/profile\/javier">/);
  assert.match(prerender, /url: `\$\{BASE_URL\}\/profile\/javier`/);
});

test("navigation and site search point at Startup Pedia", () => {
  assert.match(read("src/components/VisitorNavbar.tsx"), /label: "Startup Pedia", href: "\/startup-pedia"/);
  // In the Content submenu, under Newspaper and Podcast (requested 2026-10-25).
  assert.match(read("src/components/Navigation.tsx"), /name: "Startup Pedia", href: "\/startup-pedia", icon: BookMarked, description:/);
  assert.match(read("src/components/SEO.tsx"), /startup-pedia\?q=\{search_term_string\}/);
  assert.match(read("index.html"), /startup-pedia\?q=\{search_term_string\}/);
});

test("markdownToHtml escapes text and keeps internal links relative", () => {
  const html = markdownToHtml(
    "Use <script> carefully & see [CAC](/startup-pedia/customer-acquisition-cost).\n\n- **One:** first\n  continued\n- Two\n\n### Sub",
  );
  assert.match(html, /&lt;script&gt; carefully &amp; see <a href="\/startup-pedia\/customer-acquisition-cost">CAC<\/a>/);
  assert.match(html, /<li><strong>One:<\/strong> first<br \/>continued<\/li>/);
  assert.match(html, /<h3>Sub<\/h3>/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(markdownToHtml("[x](https://example.com)"), /<a href="https:\/\/example.com" rel="noopener">x<\/a>/);
  assert.doesNotMatch(markdownToHtml("[x](javascript:alert(1))"), /<a /);
});
