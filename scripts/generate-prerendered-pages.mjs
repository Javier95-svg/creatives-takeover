import fs from "node:fs/promises";
import path from "node:path";
import { BASE_URL, INDEXABLE_ROUTES, OG_IMAGE, SITE_NAME } from "./seo-route-config.mjs";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");

const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/bizmap-ai", label: "BizMap AI" },
  { href: "/insighta", label: "Insighta" },
  { href: "/mentorship", label: "Community" },
  { href: "/newspaper", label: "Newspaper" },
];

function buildFallbackHtml(routeConfig) {
  const nav = PRIMARY_NAV.map((item) => `<a href="${item.href}">${item.label}</a>`).join(" | ");
  const sections = (routeConfig.sections || [])
    .map(
      (section) => `        <section>
          <h2>${section.heading}</h2>
          <p>${section.copy}</p>
        </section>`
    )
    .join("\n");
  const faqs = (routeConfig.faqs || [])
    .map(
      (faq) => `          <dt>${faq.question}</dt>
          <dd>${faq.answer}</dd>`
    )
    .join("\n");

  const ctaLinks = [
    { href: "/pricing", label: "See pricing" },
    { href: "/newspaper", label: "Read founder insights" },
    { href: "/mentorship", label: "Explore community" },
  ]
    .filter((item) => item.href !== routeConfig.path)
    .map((item) => `<li><a href="${item.href}">${item.label}</a></li>`)
    .join("");

  return `
      <header>
        <p>${SITE_NAME}</p>
        <nav aria-label="Primary pages">
          ${nav}
        </nav>
      </header>
      <article>
        <section>
          <h1>${routeConfig.heroHeading || routeConfig.title}</h1>
          <p>${routeConfig.heroCopy || routeConfig.description}</p>
          ${routeConfig.updatedLabel ? `<p>Last updated ${routeConfig.updatedLabel}</p>` : ""}
        </section>
${sections}
        ${faqs ? `        <section>
          <h2>Common questions</h2>
          <dl>
${faqs}
          </dl>
        </section>` : ""}
        <section>
          <h2>Explore more</h2>
          <ul>
            ${ctaLinks}
          </ul>
        </section>
      </article>`;
}

function toOutputPath(route) {
  if (route.path === "/") {
    return "index.html";
  }
  return `${route.path.replace(/^\//, "")}/index.html`;
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html;
}

function replaceMetaByName(html, name, content) {
  const pattern = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*"\\s*/?>`, "i");
  const replacement = `<meta name="${name}" content="${content}" />`;
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }
  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function replaceMetaByProperty(html, property, content) {
  const pattern = new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]*"\\s*/?>`, "i");
  const replacement = `<meta property="${property}" content="${content}" />`;
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }
  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function renderRoute(template, routeConfig) {
  const canonical = `${BASE_URL}${routeConfig.path}`;
  const robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
  let html = template;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${routeConfig.title}</title>`);
  html = replaceMetaByName(html, "description", routeConfig.description);
  html = replaceMetaByName(html, "robots", robots);
  html = replaceMetaByName(html, "googlebot", robots);
  html = replaceMetaByProperty(html, "og:title", routeConfig.title);
  html = replaceMetaByProperty(html, "og:description", routeConfig.description);
  html = replaceMetaByProperty(html, "og:url", canonical);
  html = replaceMetaByProperty(html, "og:image", OG_IMAGE);
  html = replaceMetaByName(html, "twitter:title", routeConfig.title);
  html = replaceMetaByName(html, "twitter:description", routeConfig.description);
  html = replaceMetaByName(html, "twitter:image", OG_IMAGE);
  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`
  );
  html = replaceTag(
    html,
    /<main id="seo-fallback">[\s\S]*?<\/main>/i,
    `<main id="seo-fallback">\n${buildFallbackHtml(routeConfig)}\n    </main>`
  );
  return html;
}

async function writeRoute(template, routeConfig) {
  const html = renderRoute(template, routeConfig);
  const outputFile = path.join(DIST_DIR, toOutputPath(routeConfig));
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, html, "utf8");
}

async function main() {
  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  await Promise.all(INDEXABLE_ROUTES.map((routeConfig) => writeRoute(template, routeConfig)));
  console.log(`Prerendered ${INDEXABLE_ROUTES.length} public route shells with route-specific metadata.`);
}

main().catch((error) => {
  console.error("Failed to generate prerendered public pages.", error);
  process.exitCode = 1;
});
