import fs from "node:fs";
import path from "node:path";
import { BASE_URL, INDEXABLE_ROUTES } from "./seo-route-config.mjs";

// Last step of `npm run build`, so it runs on Vercel: a failing check fails the
// deploy and the previous version stays live. It guards the signals Google uses
// to decide which page represents the brand. When the SPA fallback was the
// homepage file, 77 URLs claimed canonical="/" and Google dropped the homepage
// for /about on the brand search; that broke silently more than once.

const canonicalOf = (html) => html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1] ?? null;
const titleOf = (html) => html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? null;

export function verifySeoBuild({ distDir, vercelConfig, routes = INDEXABLE_ROUTES }) {
  const problems = [];
  const readDist = (file) => {
    const full = path.join(distDir, file);
    if (!fs.existsSync(full)) {
      problems.push(`${file} is missing from the build`);
      return null;
    }
    return fs.readFileSync(full, "utf8");
  };

  // The fallback must not claim to be any page, least of all the homepage.
  const shell = readDist("app-shell.html");
  if (shell) {
    if (canonicalOf(shell)) problems.push(`app-shell.html has canonical ${canonicalOf(shell)}; the SPA fallback must have none`);
    if (/application\/ld\+json/i.test(shell)) problems.push("app-shell.html carries JSON-LD; WebSite markup belongs on the homepage only");
    if (/<h1/i.test(shell)) problems.push("app-shell.html has an <h1>; it would repeat on every unknown URL");
  }

  const home = readDist("index.html");
  if (home) {
    if (canonicalOf(home) !== `${BASE_URL}/`) problems.push(`index.html canonical is ${canonicalOf(home)}, expected ${BASE_URL}/`);
    if (!/"@type":\s*"WebSite"/.test(home)) problems.push("index.html lost its WebSite markup (site name in Google results)");
    if (/noindex/i.test(home.match(/<meta\s+name="robots"[^>]*>/i)?.[0] ?? "")) problems.push("index.html is noindex");
  }

  // Every prerendered page must point at itself.
  for (const route of routes) {
    const file = route.path === "/" ? "index.html" : `${route.path.replace(/^\//, "")}/index.html`;
    const html = route.path === "/" ? home : readDist(file);
    if (!html) continue;
    const expected = `${BASE_URL}${route.path}`;
    if (canonicalOf(html) !== expected) problems.push(`${route.path} canonical is ${canonicalOf(html)}, expected ${expected}`);
    if (titleOf(html) !== route.title) problems.push(`${route.path} title is "${titleOf(html)}", expected "${route.title}"`);
    if (route.path !== "/" && /"@type":\s*"WebSite"/.test(html)) problems.push(`${route.path} carries the homepage's WebSite markup`);
  }

  const sitemap = readDist("sitemap.xml");
  if (sitemap && /<lastmod>[^<]*T\d\d:\d\d/.test(sitemap)) problems.push("sitemap.xml stamps a build time; every deploy would look like a site-wide change");

  // Every rewrite to a static HTML file must use the neutral shell.
  for (const rule of vercelConfig.rewrites ?? []) {
    if (/^\/[^/]+\.html$/.test(rule.destination) && rule.destination !== "/app-shell.html") {
      problems.push(`vercel.json rewrite ${rule.source} -> ${rule.destination}; SPA routes must use /app-shell.html`);
    }
  }

  return problems;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const root = process.cwd();
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const problems = verifySeoBuild({ distDir: path.join(root, "dist"), vercelConfig });
  if (problems.length) {
    console.error(`SEO build check failed (${problems.length}):\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log(`SEO build check passed: app shell, homepage and ${INDEXABLE_ROUTES.length} page canonicals.`);
  }
}
