import assert from "node:assert/strict";
import test from "node:test";

import { renderSeoDocument } from "../api/_seo.ts";

const shell = `<!doctype html><html><head><title>Home</title><meta name="description" content="home"><meta name="robots" content="index,follow"><link rel="canonical" href="https://creatives-takeover.com/"></head><body><main id="seo-fallback"><h1>Home</h1></main></body></html>`;

test("edge renderer replaces the initial HTML metadata and crawler-visible facts", () => {
  const html = renderSeoDocument(shell, {
    title: "Jane Founder | Founder Profile",
    description: "Jane builds evidence-backed workflow software for independent creative businesses.",
    canonical: "https://creatives-takeover.com/profile/jane-founder",
    indexable: true,
    schema: {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: { "@type": "Person", name: "Jane Founder" },
    },
    fallbackHtml: "<article><h1>Jane Founder</h1><p>Evidence-backed workflow software.</p></article>",
  });

  assert.match(html, /<title>Jane Founder \| Founder Profile<\/title>/);
  assert.match(html, /rel="canonical" href="https:\/\/creatives-takeover\.com\/profile\/jane-founder"/);
  assert.match(html, /content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/);
  assert.match(html, /<h1>Jane Founder<\/h1>/);
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(json);
  assert.equal(JSON.parse(json)["@type"], "ProfilePage");
});

test("edge renderer emits noindex for entities below the quality threshold", () => {
  const html = renderSeoDocument(shell, {
    title: "Incomplete Founder Profile",
    description: "This profile is not eligible for indexing.",
    canonical: "https://creatives-takeover.com/profile/incomplete",
    indexable: false,
    schema: { "@context": "https://schema.org", "@type": "ProfilePage" },
    fallbackHtml: "<h1>Incomplete Founder Profile</h1>",
  });

  assert.match(html, /content="noindex,follow"/);
});
