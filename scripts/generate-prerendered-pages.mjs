import fs from "node:fs/promises";
import path from "node:path";
import { BASE_URL, INDEXABLE_ROUTES, OG_IMAGE, SITE_NAME } from "./seo-route-config.mjs";
import { PLAN_MONTHLY_CREDITS, PLAN_PRICING } from "../src/config/pricing.ts";
import { SITE_IDENTITY } from "../src/config/siteIdentity.ts";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");

const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/#startup-development-cycle", label: "How It Works" },
  { href: "/build", label: "Tools and Outcomes" },
  { href: "/mentorship", label: "Expert Support" },
  { href: "/newspaper", label: "Founder Proof" },
  { href: "/pricing", label: "Pricing" },
];

const PRICING_SUMMARY = [
  { name: "Rookie", price: `$${PLAN_PRICING.rookie.monthly}/month`, outcome: "Clarify", credits: `${PLAN_MONTHLY_CREDITS.rookie} monthly credits`, description: "Create the first customer decision and understand the connected journey." },
  { name: "Starter", price: `$${PLAN_PRICING.starter.monthly}/month`, outcome: "Validate", credits: `${PLAN_MONTHLY_CREDITS.starter} monthly credits`, description: "Publish proof, collect evidence, and make the first PMF decision." },
  { name: "Rising", price: `$${PLAN_PRICING.rising.monthly}/month`, outcome: "Build and Launch", credits: `${PLAN_MONTHLY_CREDITS.rising} monthly credits`, description: "Build the evidence backed MVP, launch assets, and begin measuring traction." },
  { name: "Pro", price: `$${PLAN_PRICING.pro.monthly}/month`, outcome: "Accelerate and Fundraise", credits: `${PLAN_MONTHLY_CREDITS.pro} monthly credits`, description: "Add expert accountability within 48 hours, deeper research, and fundraising workflows." },
];

const SOFTWARE_TOOL_PATHS = new Set([
  "/bizmap-ai",
  "/pmf-lab",
  "/tech-stack",
  "/icp-builder",
  "/demo-studio",
  "/decision-sprint",
  "/validate",
  "/mvp-builder",
  "/mvp-scope",
  "/go-to-market",
  "/directories",
  "/traction-engine",
  "/insighta",
  "/insighta/vc-search",
  "/insighta/email-templates",
  "/insighta/accelerator-hunt",
  "/insighta/pitch-deck-analyzer",
  "/insighta/test",
]);

async function fetchLatestArticleLinks() {
  try {
    const response = await fetch(`${BASE_URL}/sitemap-articles.xml`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return [];
    const xml = await response.text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => match[1])
      .filter((url) => url.startsWith(`${BASE_URL}/newspaper/`))
      .slice(0, 15)
      .map((url) => {
        const pathname = new URL(url).pathname;
        const slug = pathname.split("/").filter(Boolean).at(-1) || "Founder article";
        const label = slug
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return { href: pathname, label };
      });
  } catch {
    return [];
  }
}

function buildFallbackHtml(routeConfig) {
  const nav = PRIMARY_NAV.map((item) => `<a href="${item.href}">${item.label}</a>`).join(" | ");
  const heroContent = routeConfig.path === "/"
    ? `<p>Business Development platform for startup founders &amp; first-time business owners.</p>
          <p>Define your ideal customer, prove demand, build your MVP, launch it, and find investment.</p>
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
  const sources = (routeConfig.sources || []).length
    ? `        <section aria-labelledby="sources-heading">
          <h2 id="sources-heading">Sources and further reading</h2>
          <p>Primary references used to ground this framework.</p>
          <ul>
${routeConfig.sources.map((source) => `            <li><a href="${source.url}">${source.title}</a> — ${source.publisher}</li>`).join("\n")}
          </ul>
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
          ${routeConfig.updatedLabel ? `<p>${routeConfig.path.startsWith("/answers/") ? "Published" : "Last updated"} ${routeConfig.updatedLabel}</p>` : ""}
        </section>
${quickAnswer}
${pricingSummary}
${sections}
${checklist}
${sources}
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
  logo: { "@type": "ImageObject", url: SITE_IDENTITY.logoUrl, width: 192, height: 192 },
  description: SITE_IDENTITY.description,
  founder: {
    "@type": "Person",
    "@id": `${BASE_URL}/about#founder`,
    name: SITE_IDENTITY.founder.name,
    jobTitle: SITE_IDENTITY.founder.jobTitle,
    url: SITE_IDENTITY.founder.url,
    sameAs: [...SITE_IDENTITY.founder.sameAs],
  },
  sameAs: [...SITE_IDENTITY.sameAs],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Support",
    email: SITE_IDENTITY.supportEmail,
  },
};

// The dist/index.html template ships the homepage's JSON-LD (WebSite, Organization,
// SoftwareApplication, homepage FAQ). On inner pages that block is wrong — replace
// it with route-specific schema mirroring what react-helmet renders after hydration.
function buildStructuredData(routeConfig) {
  const canonical = `${BASE_URL}${routeConfig.path}`;
  const data = [WEBSITE_SCHEMA, ORGANIZATION_SCHEMA];

  if (routeConfig.path === "/") {
    data.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: SITE_IDENTITY.description,
      url: BASE_URL,
      offers: {
        "@type": "Offer",
        price: String(PLAN_PRICING.rookie.monthly),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    });
  }

  if (SOFTWARE_TOOL_PATHS.has(routeConfig.path)) {
    data.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: routeConfig.heroHeading,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: routeConfig.description,
      url: canonical,
      publisher: ORGANIZATION_SCHEMA,
      offers: {
        "@type": "Offer",
        price: String(PLAN_PRICING.rookie.monthly),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    });
  }

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
      author: {
        "@type": "Person",
        "@id": `${BASE_URL}/about#founder`,
        name: SITE_IDENTITY.founder.name,
        url: SITE_IDENTITY.founder.url,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon-192x192.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      ...(routeConfig.keyword ? { keywords: `${routeConfig.keyword}, startup founder guide, ${SITE_NAME}` } : {}),
      ...(routeConfig.sources?.length ? { citation: routeConfig.sources.map((source) => source.url) } : {}),
    });
  }

  if (routeConfig.path === "/pricing") {
    data.push(
      ...PRICING_SUMMARY.map((plan) => ({
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${SITE_NAME} ${plan.name} Plan`,
        description: `${plan.description} Includes ${plan.credits}.`,
        image: OG_IMAGE,
        offers: {
          "@type": "Offer",
          price: String(PLAN_PRICING[plan.name.toLowerCase()].monthly),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: `${BASE_URL}/pricing`,
        },
      }))
    );
  }

  if (routeConfig.path === "/answers" || routeConfig.path === "/newspaper") {
    data.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: routeConfig.heroHeading,
      description: routeConfig.description,
      url: canonical,
      hasPart: (routeConfig.relatedLinks || [])
        .filter((link) => link.href.startsWith(routeConfig.path === "/answers" ? "/answers/" : "/newspaper/"))
        .map((link) => ({
          "@type": routeConfig.path === "/newspaper" ? "Article" : "WebPage",
          name: link.label,
          url: `${BASE_URL}${link.href}`,
        })),
    });
  }

  return data;
}

function replaceJsonLd(html, routeConfig) {
  const data = buildStructuredData(routeConfig);
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
  const latestArticleLinks = await fetchLatestArticleLinks();
  const routes = INDEXABLE_ROUTES.map((routeConfig) =>
    routeConfig.path === "/newspaper" && latestArticleLinks.length
      ? {
          ...routeConfig,
          relatedLinks: [...latestArticleLinks, ...(routeConfig.relatedLinks || [])],
        }
      : routeConfig
  );
  await Promise.all(routes.map((routeConfig) => writeRoute(template, routeConfig)));
  console.log(`Prerendered ${INDEXABLE_ROUTES.length} public route shells with route-specific metadata.`);
}

main().catch((error) => {
  console.error("Failed to generate prerendered public pages.", error);
  process.exitCode = 1;
});
