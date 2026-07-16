import fs from "node:fs/promises";
import path from "node:path";
import { BASE_URL, INDEXABLE_ROUTES, OG_IMAGE, SITE_NAME } from "./seo-route-config.mjs";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");

const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/answers", label: "Founder Answers" },
  { href: "/bizmap-ai", label: "BizMap AI" },
  { href: "/build", label: "MVP Builder" },
  { href: "/insighta", label: "Insighta" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/podcast", label: "Podcast" },
  { href: "/newspaper", label: "Newspaper" },
];

function buildFallbackHtml(routeConfig) {
  const nav = PRIMARY_NAV.map((item) => `<a href="${item.href}">${item.label}</a>`).join(" | ");
  const quickAnswer = routeConfig.quickAnswer
    ? `        <section>
          <h2>Quick answer: ${routeConfig.quickAnswer.title}</h2>
          <dl>
${routeConfig.quickAnswer.items
  .map(
    (item) => `            <dt>${item.label}: ${item.title}</dt>
            <dd>${item.description}</dd>`
  )
  .join("\n")}
          </dl>
        </section>`
    : "";
  const sections = (routeConfig.sections || [])
    .map(
      (section) => `        <section>
          <h2>${section.heading}</h2>
          <p>${section.copy}</p>
        </section>`
    )
    .join("\n");
  const checklist = (routeConfig.checklist || []).length
    ? `        <section>
          <h2>Founder checklist</h2>
          <ul>
${routeConfig.checklist.map((item) => `            <li>${item}</li>`).join("\n")}
          </ul>
        </section>`
    : "";
  const faqs = (routeConfig.faqs || [])
    .map(
      (faq) => `          <dt>${faq.question}</dt>
          <dd>${faq.answer}</dd>`
    )
    .join("\n");
  const cta = routeConfig.cta
    ? `        <section>
          <h2>Turn the answer into action</h2>
          <p>${routeConfig.cta.description}</p>
          <p><a href="${routeConfig.cta.href}">${routeConfig.cta.label}</a></p>
        </section>`
    : "";

  // Answer pages interlink within their topic cluster; other pages fall back to
  // the generic cross-links.
  const exploreLinks = (routeConfig.relatedLinks && routeConfig.relatedLinks.length
    ? routeConfig.relatedLinks
    : [
        { href: "/pricing", label: "See pricing" },
        { href: "/newspaper", label: "Read founder insights" },
        { href: "/mentorship", label: "Explore community" },
      ]
  )
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
${quickAnswer}
${sections}
${checklist}
        ${faqs ? `        <section>
          <h2>Common questions</h2>
          <dl>
${faqs}
          </dl>
        </section>` : ""}
${cta}
        <section>
          <h2>${routeConfig.relatedLinks ? "Keep learning" : "Explore more"}</h2>
          <ul>
            ${exploreLinks}
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
  const pattern = new RegExp(`<meta[^>]+name="${name}"[^>]*>`, "i");
  const replacement = `<meta data-rh="true" name="${name}" content="${content}" />`;
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }
  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function replaceMetaByProperty(html, property, content) {
  const pattern = new RegExp(`<meta[^>]+property="${property}"[^>]*>`, "i");
  const replacement = `<meta data-rh="true" property="${property}" content="${content}" />`;
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }
  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

// Site-wide schema entities, kept identical to the index.html template so every
// page reinforces the same WebSite/Organization identity.
const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  url: `${BASE_URL}/`,
  name: SITE_NAME,
  description:
    "AI-powered startup builder for first-time founders — customer discovery, MVP planning, fundraising prep, and go-to-market execution.",
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: SITE_NAME,
  url: BASE_URL,
  logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon-192x192.png`, width: 192, height: 192 },
  founder: { "@type": "Person", name: "Javier Alonso" },
  description: "The Founders' Compass: an AI startup builder for first-time founders moving from idea validation to launch.",
  sameAs: [
    "https://x.com/Creatives_Rule",
    "https://www.linkedin.com/company/creatives-takeover",
    "https://www.instagram.com/creativestakeover.official/",
    "https://www.youtube.com/@CreativesTakeover",
  ],
};

// The dist/index.html template ships the homepage's JSON-LD (WebSite, Organization,
// SoftwareApplication, homepage FAQ). On inner pages that block is wrong — replace
// it with route-specific schema mirroring what react-helmet renders after hydration.
function buildStructuredData(routeConfig) {
  if (routeConfig.path === "/") return null; // homepage keeps the template block

  const canonical = `${BASE_URL}${routeConfig.path}`;
  const data = [WEBSITE_SCHEMA, ORGANIZATION_SCHEMA];

  if (routeConfig.breadcrumb && routeConfig.breadcrumb.length) {
    data.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: routeConfig.breadcrumb.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${BASE_URL}${item.url}`,
      })),
    });
  }

  if (routeConfig.faqs && routeConfig.faqs.length) {
    data.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: routeConfig.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    });
  }

  // Founder answer guides use Article schema. HowTo rich results are deprecated,
  // so the unsupported type is not emitted.
  if (routeConfig.path.startsWith("/answers/")) {
    const updatedIso = routeConfig.lastmod || new Date().toISOString().split("T")[0];
    data.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: routeConfig.heroHeading,
      description: routeConfig.description,
      datePublished: updatedIso,
      dateModified: updatedIso,
      author: { "@type": "Person", name: "Javier Alonso", url: `${BASE_URL}/about` },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon-192x192.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      ...(routeConfig.keyword ? { keywords: `${routeConfig.keyword}, startup founder guide, ${SITE_NAME}` } : {}),
    });
  }

  if (routeConfig.path === "/contact") {
    data.push({
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: routeConfig.heroHeading,
      description: routeConfig.description,
      url: canonical,
      mainEntity: { "@id": `${BASE_URL}/#organization` },
    });
  }

  const softwarePaths = new Set([
    "/build", "/bizmap-ai", "/pmf-lab", "/tech-stack", "/icp-builder",
    "/validate", "/mvp-builder", "/go-to-market", "/traction-engine",
    "/vc-search", "/email-templates", "/accelerator-hunt", "/pitch-deck-analyzer", "/insighta-test",
  ]);
  if (softwarePaths.has(routeConfig.path)) {
    data.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: routeConfig.heroHeading,
      description: routeConfig.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: canonical,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
  }

  return data;
}

function replaceJsonLd(html, routeConfig) {
  const data = buildStructuredData(routeConfig);
  if (!data) return html;
  const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  return html.replace(
    /<script[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/i,
    `<script data-rh="true" type="application/ld+json">\n${json}\n    </script>`
  );
}

// Per-route dynamic OG image so each page gets a distinct, on-brand social card.
function buildOgImage(routeConfig) {
  if (routeConfig.path === "/") return OG_IMAGE; // homepage keeps the brand hero image
  const title = (routeConfig.heroHeading || routeConfig.title || "").replace(/\s*\|\s*Creatives Takeover.*$/i, "").trim();
  const subtitle = (routeConfig.heroCopy || routeConfig.description || "").trim();
  const params = new URLSearchParams({ title, subtitle, eyebrow: "Creatives Takeover" });
  // Escape & for safe injection into HTML attribute values.
  return `${BASE_URL}/api/og?${params.toString()}`.replace(/&/g, "&amp;");
}

function renderRoute(template, routeConfig) {
  const canonical = `${BASE_URL}${routeConfig.path}`;
  const robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
  const ogImage = buildOgImage(routeConfig);
  let html = template;
  html = replaceTag(html, /<title[^>]*>[\s\S]*?<\/title>/i, `<title data-rh="true">${routeConfig.title}</title>`);
  html = replaceMetaByName(html, "description", routeConfig.description);
  html = replaceMetaByName(html, "robots", robots);
  html = replaceMetaByProperty(html, "og:title", routeConfig.title);
  html = replaceMetaByProperty(html, "og:description", routeConfig.description);
  html = replaceMetaByProperty(html, "og:url", canonical);
  html = replaceMetaByProperty(html, "og:image", ogImage);
  html = replaceMetaByName(html, "twitter:title", routeConfig.title);
  html = replaceMetaByName(html, "twitter:description", routeConfig.description);
  html = replaceMetaByName(html, "twitter:image", ogImage);
  html = replaceTag(
    html,
    /<link[^>]+rel="canonical"[^>]*>/i,
    `<link data-rh="true" rel="canonical" href="${canonical}" />`
  );
  html = replaceJsonLd(html, routeConfig);
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
  try {
    await fs.access(TEMPLATE_PATH);
  } catch {
    console.error(`dist/index.html not found at ${TEMPLATE_PATH} — run \`npm run build\` first.`);
    process.exitCode = 1;
    return;
  }

  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  await Promise.all(INDEXABLE_ROUTES.map((routeConfig) => writeRoute(template, routeConfig)));
  console.log(`Prerendered ${INDEXABLE_ROUTES.length} public route shells with route-specific metadata.`);
}

main().catch((error) => {
  console.error("Failed to generate prerendered public pages.", error);
  process.exitCode = 1;
});
