import fs from "node:fs/promises";
import path from "node:path";
import { BASE_URL, INDEXABLE_ROUTES, ROBOTS_DISALLOW } from "./seo-route-config.mjs";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");
const ROBOTS_PATH = path.join(PUBLIC_DIR, "robots.txt");

async function fetchPublishedStoryRoutes() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || typeof fetch !== "function") {
    return [];
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/stories_articles?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );

    if (!response.ok) {
      console.warn(`Skipping story sitemap routes: Supabase returned ${response.status}.`);
      return [];
    }

    const stories = await response.json();
    return (Array.isArray(stories) ? stories : [])
      .filter((story) => typeof story.slug === "string" && story.slug.trim().length > 0)
      .map((story) => ({
        path: `/newspaper/${story.slug}`,
        changefreq: "monthly",
        priority: 0.6,
        lastmod: (story.updated_at || story.published_at || new Date().toISOString()).split("T")[0],
      }));
  } catch (error) {
    console.warn("Skipping story sitemap routes: failed to fetch published stories.", error);
    return [];
  }
}

async function generateSitemapXml() {
  const now = new Date().toISOString().split("T")[0];
  const dynamicStoryRoutes = await fetchPublishedStoryRoutes();
  const routes = [...INDEXABLE_ROUTES, ...dynamicStoryRoutes];
  const urls = routes.map(
    (route) => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${route.lastmod || now}</lastmod>
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
  await fs.writeFile(SITEMAP_PATH, await generateSitemapXml(), "utf8");
  await fs.writeFile(ROBOTS_PATH, generateRobotsTxt(), "utf8");
  console.log(`Generated SEO assets for ${INDEXABLE_ROUTES.length} indexable routes.`);
}

main().catch((error) => {
  console.error("Failed to generate SEO assets.", error);
  process.exitCode = 1;
});
