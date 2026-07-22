import fs from "node:fs";
import path from "node:path";

import { BASE_URL, INDEXABLE_ROUTES } from "./seo-route-config.mjs";

const DIST_DIR = path.resolve(process.cwd(), "dist");

function outputPathForRoute(routePath) {
  return routePath === "/"
    ? path.join(DIST_DIR, "index.html")
    : path.join(DIST_DIR, routePath.replace(/^\//, ""), "index.html");
}

function firstMatch(html, pattern) {
  return pattern.exec(html)?.[1]?.trim() || "";
}

function visibleWordCount(html) {
  const body = firstMatch(html, /<body[^>]*>([\s\S]*?)<\/body>/i) || html;
  const text = body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}

const failures = [];
const routeResults = [];

for (const route of INDEXABLE_ROUTES) {
  const filePath = outputPathForRoute(route.path);
  if (!fs.existsSync(filePath)) {
    failures.push(`${route.path}: missing ${path.relative(process.cwd(), filePath)}`);
    continue;
  }

  const html = fs.readFileSync(filePath, "utf8");
  const title = firstMatch(html, /<title>([\s\S]*?)<\/title>/i);
  const canonical = firstMatch(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
  const robots = firstMatch(html, /<meta\s+name="robots"\s+content="([^"]+)"/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const schemaBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  const schemaTypes = [];

  for (const block of schemaBlocks) {
    try {
      const parsed = JSON.parse(block[1]);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of nodes) {
        if (typeof node?.["@type"] === "string") schemaTypes.push(node["@type"]);
      }
    } catch (error) {
      failures.push(`${route.path}: invalid JSON-LD (${error.message})`);
    }
  }

  const words = visibleWordCount(html);
  const expectedCanonical = `${BASE_URL}${route.path === "/" ? "/" : route.path}`;
  if (!title) failures.push(`${route.path}: missing title`);
  if (title.endsWith("...")) failures.push(`${route.path}: mechanically truncated title`);
  if (title.length > 65) failures.push(`${route.path}: title is ${title.length} characters`);
  if (canonical !== expectedCanonical) failures.push(`${route.path}: canonical is ${canonical || "missing"}`);
  if (!robots.includes("index") || !robots.includes("follow")) failures.push(`${route.path}: robots is ${robots || "missing"}`);
  if (h1Count !== 1) failures.push(`${route.path}: expected one H1, found ${h1Count}`);
  if (schemaTypes.length === 0) failures.push(`${route.path}: no parseable JSON-LD types`);
  if (route.path.startsWith("/answers/") && words < 450) {
    failures.push(`${route.path}: answer shell has only ${words} visible words`);
  }

  routeResults.push({ path: route.path, words, h1Count, schemaTypes });
}

const homepage = fs.readFileSync(path.join(DIST_DIR, "index.html"), "utf8");
const modulePreloads = (homepage.match(/rel="modulepreload"/g) || []).length;
const initialModuleScripts = (homepage.match(/<script\s+type="module"[^>]+src=/g) || []).length;
const answerResults = routeResults.filter((result) => result.path.startsWith("/answers/"));
const thinnestRoutes = [...routeResults]
  .sort((left, right) => left.words - right.words)
  .slice(0, 10)
  .map(({ path: routePath, words }) => ({ path: routePath, words }));
const keyRoutePaths = [
  "/",
  "/about",
  "/pricing",
  "/resources",
  "/answers",
  "/startup-guide",
  "/newspaper",
  "/icp-builder",
  "/mvp-builder",
  "/go-to-market",
  "/traction-engine",
  "/insighta",
];
const keyRouteWords = Object.fromEntries(
  routeResults
    .filter((result) => keyRoutePaths.includes(result.path))
    .map((result) => [result.path, result.words]),
);

const summary = {
  auditedRoutes: routeResults.length,
  failures: failures.length,
  initialModuleScripts,
  modulePreloads,
  answerPages: answerResults.length,
  minimumAnswerWords: Math.min(...answerResults.map((result) => result.words)),
  routesUnder300StaticWords: routeResults.filter((result) => result.words < 300).length,
  keyRouteWords,
  thinnestRoutes,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length) {
  console.error("\nPrerender audit failures:\n- " + failures.join("\n- "));
  process.exitCode = 1;
}
