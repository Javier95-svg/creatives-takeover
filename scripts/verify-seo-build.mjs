import crypto from "node:crypto";
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

const sha256 = (text) => crypto.createHash("sha256").update(text).digest("base64");

// The site CSP has no 'unsafe-inline' for scripts: an inline <script> or on*
// handler runs only if its hash is listed, so a new one would silently break
// every page that carries it. Unknown URLs must also get a real 404 page.
export function verifyServingBuild({ distDir, vercelConfig }) {
  const problems = [];
  const csp = (vercelConfig.headers ?? [])
    .find((rule) => rule.source === "/(.*)")
    ?.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
  const scriptSrc = csp.match(/script-src ([^;]*)/)?.[1] ?? "";
  if (/'unsafe-inline'|'unsafe-eval'/.test(scriptSrc)) problems.push("the site-wide CSP script-src allows 'unsafe-inline' or 'unsafe-eval'");

  const htmlFiles = fs.readdirSync(distDir, { recursive: true }).filter((file) => String(file).endsWith(".html"));
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(distDir, String(file)), "utf8");
    const inline = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
      .filter(([, attrs = ""]) => !/\ssrc=/i.test(attrs) && !/type="(?!module|text\/javascript)[^"]*"/i.test(attrs))
      .map(([, , body]) => body);
    const handlers = [...html.matchAll(/<[a-z][^>]*?\son[a-z]+="([^"]*)"/gi)].map(([, body]) => body);
    for (const body of [...inline, ...handlers]) {
      if (!scriptSrc.includes(`'sha256-${sha256(body)}'`)) {
        problems.push(`${file} has inline script "${body.trim().slice(0, 60)}" whose sha256-${sha256(body)} is not in the vercel.json CSP`);
      }
    }
  }

  const notFound = path.join(distDir, "404.html");
  if (!fs.existsSync(notFound)) problems.push("404.html is missing; unknown URLs would get Vercel's default page");
  else if (!/<meta name="robots" content="noindex"/.test(fs.readFileSync(notFound, "utf8"))) problems.push("404.html is not noindex");

  return problems;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const root = process.cwd();
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  const problems = [
    ...verifySeoBuild({ distDir: path.join(root, "dist"), vercelConfig }),
    ...verifyServingBuild({ distDir: path.join(root, "dist"), vercelConfig }),
  ];
  if (problems.length) {
    console.error(`SEO build check failed (${problems.length}):\n- ${problems.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log(`SEO build check passed: app shell, homepage, ${INDEXABLE_ROUTES.length} page canonicals, 404 page and CSP script hashes.`);
  }
}
