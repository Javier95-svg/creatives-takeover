import fs from "node:fs/promises";
import path from "node:path";
import { BASE_URL, INDEXABLE_ROUTES, ROBOTS_DISALLOW } from "./seo-route-config.mjs";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");
const ROBOTS_PATH = path.join(PUBLIC_DIR, "robots.txt");

function generateSitemapXml() {
  const now = new Date().toISOString().split("T")[0];
  const urls = INDEXABLE_ROUTES.map(
    (route) => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function generateRobotsTxt() {
  const rules = ROBOTS_DISALLOW.map((entry) => `Disallow: ${entry}`).join("\n");
  return `User-agent: *
Allow: /
${rules}

User-agent: GPTBot
Allow: /
${rules}

User-agent: ChatGPT-User
Allow: /
${rules}

User-agent: OAI-SearchBot
Allow: /
${rules}

User-agent: PerplexityBot
Allow: /
${rules}

User-agent: Perplexity-User
Allow: /
${rules}

Sitemap: ${BASE_URL}/sitemap.xml
`;
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(SITEMAP_PATH, generateSitemapXml(), "utf8");
  await fs.writeFile(ROBOTS_PATH, generateRobotsTxt(), "utf8");
  console.log(`Generated SEO assets for ${INDEXABLE_ROUTES.length} indexable routes.`);
}

main().catch((error) => {
  console.error("Failed to generate SEO assets.", error);
  process.exitCode = 1;
});
