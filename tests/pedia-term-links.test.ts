import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { PEDIA_ENTRIES } from "../src/data/startupPedia/index.ts";
import { MAX_PEDIA_LINKS_PER_ARTICLE, PEDIA_TERM_LINKS, linkPediaTerms } from "../src/lib/pediaTermLinks.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("every term link points at a real Startup Pedia entry", () => {
  const slugs = new Set(PEDIA_ENTRIES.map((entry) => entry.slug));
  for (const term of PEDIA_TERM_LINKS) assert.ok(slugs.has(term.slug), `${term.pattern} -> ${term.slug}`);
});

test("api/newspaper-og.ts carries an identical copy of the linker", () => {
  const source = read("src/lib/pediaTermLinks.ts");
  const api = read("api/newspaper-og.ts");
  const from = (text: string) => text.slice(text.indexOf("interface PediaTermLink"));
  const sourceBlock = from(source).trim();
  const apiBlock = from(api).slice(0, from(api).indexOf("// --- end of Startup Pedia term links ---")).trim();
  assert.equal(apiBlock, sourceBlock);
  assert.match(api, /markdownToHtml\(linkPediaTerms\(article\.body_content, SITE_ORIGIN\)\)/);
  assert.match(read("src/pages/StoryArticle.tsx"), /<ArticleBody content=\{linkPediaTerms\(article\.body_content\)\}/);
});

test("only the first mention of a term is linked, and phrases ignore case", () => {
  const out = linkPediaTerms("Our CAC fell. Then CAC rose.\n\nWe found Product-Market Fit late.");
  assert.equal(out.match(/\/startup-pedia\/customer-acquisition-cost/g)?.length, 1);
  assert.match(out, /^Our \[CAC\]\(\/startup-pedia\/customer-acquisition-cost\) fell\. Then CAC rose\./);
  assert.match(out, /\[Product-Market Fit\]\(\/startup-pedia\/product-market-fit\)/);
});

test("acronyms match whole words with their exact case", () => {
  const out = linkPediaTerms("A tamper-proof cac lid. Plain mvp. The MVPs shipped.");
  assert.doesNotMatch(out, /customer-acquisition-cost|tam-sam-som/);
  assert.match(out, /\[MVPs\]\(\/startup-pedia\/minimum-viable-product\)/);
  assert.doesNotMatch(out, /\[mvp\]/);
});

test("headings, existing links, images, code and URLs are never linked", () => {
  const markdown = [
    "## Our MVP journey",
    "Read [our MVP post](https://example.com/mvp) and see ![MVP chart](/mvp.png).",
    "Run `CAC = spend / customers` or visit https://example.com/CAC today.",
    "> A quote about SaaS.",
    "```",
    "NPS score",
    "```",
  ].join("\n");
  assert.equal(linkPediaTerms(markdown), markdown);
});

test("an article gets at most a few links, each to a different entry", () => {
  const out = linkPediaTerms("MVP, CAC, LTV, MRR, NPS, KPIs, SaaS and B2B all appear here. Then MVP again.");
  const links = [...out.matchAll(/\]\(\/startup-pedia\/([^)]+)\)/g)].map((match) => match[1]);
  assert.equal(links.length, MAX_PEDIA_LINKS_PER_ARTICLE);
  assert.equal(new Set(links).size, links.length);
});

test("the server copy writes absolute links its converter accepts", () => {
  assert.match(
    linkPediaTerms("A pitch deck matters.", "https://creatives-takeover.com"),
    /\[pitch deck\]\(https:\/\/creatives-takeover\.com\/startup-pedia\/pitch-deck-outline\)/,
  );
  assert.equal(linkPediaTerms(null), "");
});
