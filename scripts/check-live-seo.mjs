import { BASE_URL, INDEXABLE_ROUTES } from "./seo-route-config.mjs";

// Daily check of what Google actually receives from production (see
// .github/workflows/seo-live-check.yml). The build guard covers the code; this
// covers everything outside it: Vercel settings, middleware, a dashboard edit,
// a stale deploy. Each line it prints is one problem.

const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const canonicalOf = (html) => html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1] ?? null;
const titleOf = (html) => html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null;
const robotsOf = (html) => html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i)?.[1] ?? "";

async function get(pathname, { redirect = "follow" } = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, { headers: { "user-agent": UA }, redirect });
  return { status: response.status, location: response.headers.get("location"), body: redirect === "manual" ? "" : await response.text() };
}

export async function checkLiveSeo() {
  const problems = [];
  const routeByPath = new Map(INDEXABLE_ROUTES.map((route) => [route.path, route]));

  const home = await get("/");
  if (home.status !== 200) problems.push(`/ returned ${home.status}`);
  if (canonicalOf(home.body) !== `${BASE_URL}/`) problems.push(`/ canonical is ${canonicalOf(home.body)}`);
  if (titleOf(home.body) !== routeByPath.get("/")?.title) problems.push(`/ title is "${titleOf(home.body)}", expected "${routeByPath.get("/")?.title}"`);
  if (/noindex/i.test(robotsOf(home.body))) problems.push("/ is noindex");
  if (!/"@type":\s*"WebSite"/.test(home.body)) problems.push("/ lost its WebSite markup");

  // A URL that cannot exist must not pose as the homepage.
  const random = `/seo-check-${Date.now().toString(36)}`;
  const unknown = await get(random);
  if (canonicalOf(unknown.body)) problems.push(`unknown URL ${random} declares canonical ${canonicalOf(unknown.body)}`);
  if (/"@type":\s*"WebSite"/.test(unknown.body)) problems.push(`unknown URL ${random} carries the homepage's WebSite markup`);
  if (titleOf(unknown.body) === titleOf(home.body)) problems.push(`unknown URL ${random} has the homepage title`);

  for (const pathname of ["/about", "/pricing", "/build", "/demo", "/mentorship"]) {
    if (!routeByPath.has(pathname)) continue;
    const page = await get(pathname);
    if (page.status !== 200) problems.push(`${pathname} returned ${page.status}`);
    if (canonicalOf(page.body) !== `${BASE_URL}${pathname}`) problems.push(`${pathname} canonical is ${canonicalOf(page.body)}`);
    if (/noindex/i.test(robotsOf(page.body))) problems.push(`${pathname} is noindex`);
  }

  const www = await fetch(BASE_URL.replace("://", "://www.") + "/", { redirect: "manual" });
  if (![301, 308].includes(www.status) || www.headers.get("location") !== `${BASE_URL}/`) problems.push(`www does not permanently redirect to ${BASE_URL}/ (got ${www.status} ${www.headers.get("location")})`);

  const robots = await get("/robots.txt");
  if (!robots.body.includes(`Sitemap: ${BASE_URL}/sitemap.xml`)) problems.push("robots.txt does not list the sitemap");
  if (/^Disallow:\s*\/\s*$/m.test(robots.body)) problems.push("robots.txt blocks the whole site");

  const index = await get("/sitemap.xml");
  if (index.status !== 200 || !index.body.includes("sitemap-pages.xml")) problems.push(`sitemap.xml is broken (${index.status})`);
  if (/<lastmod>[^<]*T\d\d:\d\d/.test(index.body)) problems.push("sitemap.xml stamps a build time again");
  const pages = await get("/sitemap-pages.xml");
  const first = pages.body.match(/<loc>([^<]*)<\/loc>/)?.[1];
  if (first !== `${BASE_URL}/`) problems.push(`sitemap-pages.xml does not start with the homepage (starts with ${first})`);

  return problems;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  checkLiveSeo().then((problems) => {
    if (problems.length) {
      console.log(problems.map((problem) => `- ${problem}`).join("\n"));
      process.exitCode = 1;
    } else {
      console.log("Live SEO check passed.");
    }
  }).catch((error) => {
    console.log(`- The check could not run: ${error.message}`);
    process.exitCode = 1;
  });
}
