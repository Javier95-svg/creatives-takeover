import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { INDEXABLE_ROUTES, ROBOTS_DISALLOW } from "../scripts/seo-route-config.mjs";

// Google's robots.txt matching: a rule matches by prefix, "*" is any run of
// characters and a trailing "$" anchors the end of the URL.
const ruleMatches = (rule: string, url: string) => {
  const anchored = rule.endsWith("$");
  const body = (anchored ? rule.slice(0, -1) : rule)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`).test(url);
};

test("no robots.txt rule blocks an indexable route", () => {
  // A bare "Disallow: /start" once blocked /startup-pedia and /startup-guide,
  // and Search Console rejected every indexing request for them.
  for (const route of INDEXABLE_ROUTES) {
    for (const rule of ROBOTS_DISALLOW) {
      assert.ok(!ruleMatches(rule, route.path), `"Disallow: ${rule}" blocks ${route.path}`);
    }
  }
});

test("the onboarding page itself stays blocked", () => {
  for (const url of ["/start", "/start?return=%2Ficp-builder", "/start/product"]) {
    assert.ok(ROBOTS_DISALLOW.some((rule) => ruleMatches(rule, url)), `${url} should be disallowed`);
  }
  for (const url of ["/startup-pedia", "/startup-pedia/tam-sam-som", "/startup-guide"]) {
    assert.ok(!ROBOTS_DISALLOW.some((rule) => ruleMatches(rule, url)), `${url} should be crawlable`);
  }
});

test("the committed robots.txt matches the generated rules", () => {
  const robots = readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");
  assert.doesNotMatch(robots, /^Disallow: \/start\r?$/m);
  assert.match(robots, /^Disallow: \/start\$\r?$/m);
});
