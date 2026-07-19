import fs from "node:fs/promises";
import path from "node:path";
import { BASE_URL, INDEXABLE_ROUTES, OG_IMAGE, SITE_NAME } from "./seo-route-config.mjs";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");

const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/#startup-development-cycle", label: "How It Works" },
  { href: "/build", label: "Tools and Outcomes" },
  { href: "/mentorship", label: "Expert Support" },
  { href: "/stories", label: "Founder Proof" },
  { href: "/pricing", label: "Pricing" },
];

const PRICING_SUMMARY = [
  { name: "Rookie", price: "$0/month", outcome: "Clarify", credits: "50 monthly credits", description: "Create the first customer decision and understand the connected journey." },
  { name: "Starter", price: "$9/month", outcome: "Validate", credits: "100 monthly credits", description: "Publish proof, collect evidence, and make the first PMF decision." },
  { name: "Rising", price: "$29/month", outcome: "Build and Launch", credits: "250 monthly credits", description: "Build the evidence backed MVP, launch assets, and begin measuring traction." },
  { name: "Pro", price: "$65/month", outcome: "Accelerate and Fundraise", credits: "600 monthly credits", description: "Add expert accountability within 48 hours, deeper research, and fundraising workflows." },
];

function buildFallbackHtml(routeConfig) {
  const nav = PRIMARY_NAV.map((item) => `<a href="${item.href}">${item.label}</a>`).join(" | ");
  const heroContent = routeConfig.path === "/"
    ? `<p>Business Development platform for startup founders &amp; first-time business owners.</p>
          <p>Turn your idea into a validated startup through one proven path. Define your customer, prove demand, build your MVP, launch it, and find traction.</p>
          <p><strong>No application. No cohort. No equity.</strong></p>
          <p><a href="/demo-studio/try">Launch a live demo</a> <a href="/icp-builder">Draft your ICP</a></p>`
    : `<p>${routeConfig.heroCopy || routeConfig.description}</p>`;
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
  const pricingSummary = routeConfig.path === "/pricing"
    ? `        <section aria-labelledby="plan-outcomes-heading">
          <h2 id="plan-outcomes-heading">Monthly plans and principal outcomes</h2>
${PRICING_SUMMARY.map((plan) => `          <article>
            <h3>${plan.name}: ${plan.price}</h3>
            <p><strong>${plan.outcome}</strong></p>
            <p>${plan.description} Includes ${plan.credits}.</p>
          </article>`).join("\n")}
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
          ${heroContent}
          ${routeConfig.updatedLabel ? `<p>Last updated ${routeConfig.updatedLabel}</p>` : ""}
        </section>
${quickAnswer}
${pricingSummary}
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

// Site-wide schema entities, kept identical to the index.html template so every
// page reinforces the same WebSite/Organization identity.
const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  url: `${BASE_URL}/`,
  name: SITE_NAME,
  description:
    "An evidence backed founder system connecting customer clarity, proof, PMF decisions, MVP building, GTM execution, and verified traction.",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${BASE_URL}/answers?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: SITE_NAME,
  url: BASE_URL,
  logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon-192x192.png`, width: 192, height: 192 },
  founder: { "@type": "Person", name: "Javier Alonso" },
  sameAs: [
    "https://twitter.com/CreativesTakeover",
    "https://linkedin.com/company/creatives-takeover",
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

  // Founder answer guides mirror FounderAnswerPage.tsx: HowTo + Article.
  if (routeConfig.path.startsWith("/answers/")) {
    const updatedIso = routeConfig.lastmod || new Date().toISOString().split("T")[0];
    if (routeConfig.sections && routeConfig.sections.length) {
      data.push({
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: routeConfig.heroHeading,
        description: routeConfig.heroCopy,
        url: canonical,
        publisher: { "@type": "Organization", name: SITE_NAME, url: BASE_URL },
        step: routeConfig.sections.map((section, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: section.heading,
          text: section.copy,
          url: `${canonical}#step-${index + 1}`,
        })),
      });
    }
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

  return data;
}

function replaceJsonLd(html, routeConfig) {
  const data = buildStructuredData(routeConfig);
  if (!data) return html;
  const json = JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
  return html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json">\n${json}\n    </script>`
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
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${routeConfig.title}</title>`);
  html = replaceMetaByName(html, "description", routeConfig.description);
  html = replaceMetaByName(html, "robots", robots);
  html = replaceMetaByName(html, "googlebot", robots);
  html = replaceMetaByProperty(html, "og:title", routeConfig.title);
  html = replaceMetaByProperty(html, "og:description", routeConfig.description);
  html = replaceMetaByProperty(html, "og:url", canonical);
  html = replaceMetaByProperty(html, "og:image", ogImage);
  html = replaceMetaByName(html, "twitter:title", routeConfig.title);
  html = replaceMetaByName(html, "twitter:description", routeConfig.description);
  html = replaceMetaByName(html, "twitter:image", ogImage);
  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`
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
