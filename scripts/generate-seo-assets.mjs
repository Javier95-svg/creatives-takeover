import fs from "node:fs/promises";
import path from "node:path";
import { BASE_URL, INDEXABLE_ROUTES, ROBOTS_DISALLOW, updatedLabelToIso } from "./seo-route-config.mjs";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const SITEMAP_INDEX_PATH = path.join(PUBLIC_DIR, "sitemap.xml");
const SITEMAP_PAGES_PATH = path.join(PUBLIC_DIR, "sitemap-pages.xml");
const ROBOTS_PATH = path.join(PUBLIC_DIR, "robots.txt");

// Static pages + programmatic answer routes are stable per deploy, so they ship
// as a built sitemap. Newspaper articles change between deploys, so they live in
// a runtime sitemap (/sitemap-articles.xml -> /api/sitemap-articles) that always
// reflects the latest published stories without waiting for a rebuild.
function generatePagesSitemapXml() {
  // Only emit <lastmod> when the route declares a real update date. Stamping the
  // build date on every URL each deploy teaches Google to distrust lastmod sitewide.
  const urls = INDEXABLE_ROUTES.map((route) => {
    const lastmod =
      route.lastmod || (route.updatedLabel ? updatedLabelToIso(route.updatedLabel) : null);
    return `  <url>
    <loc>${BASE_URL}${route.path}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function generateSitemapIndexXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap-pages.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-articles.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>
`;
}

function generateRobotsTxt() {
  const rules = ROBOTS_DISALLOW.map((entry) => `Disallow: ${entry}`).join("\n");
  const crawlerAgents = [
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
  ];

  const crawlerBlocks = crawlerAgents
    .map(
      (agent) => `User-agent: ${agent}
Allow: /
${rules}`
    )
    .join("\n\n");

  return `User-agent: *
Allow: /
${rules}

${crawlerBlocks}

Sitemap: ${BASE_URL}/sitemap.xml
`;
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(SITEMAP_PAGES_PATH, generatePagesSitemapXml(), "utf8");
  await fs.writeFile(SITEMAP_INDEX_PATH, generateSitemapIndexXml(), "utf8");
  await fs.writeFile(ROBOTS_PATH, generateRobotsTxt(), "utf8");
  console.log(`Generated SEO assets: sitemap index + ${INDEXABLE_ROUTES.length} page routes (articles served live at /sitemap-articles.xml).`);
}

main().catch((error) => {
  console.error("Failed to generate SEO assets.", error);
  process.exitCode = 1;
});
