import fs from "node:fs/promises";
import path from "node:path";
import { BASE_URL, INDEXABLE_ROUTES, OG_IMAGE, SITE_NAME } from "./seo-route-config.mjs";
import { fetchHubChildren } from "./fetch-hub-children.mjs";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");

// The sitewide link budget: these appear on all 61 shells, so a slot spent here
// is the strongest internal signal the site can give a page. Every entry must be
// an indexable route that is actually prerendered — /build and /podcast used to
// sit here while being neither, so the most-linked URLs on the site resolved to
// the SPA catch-all and self-canonicalised to the homepage.
const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/build", label: "Build" },
  { href: "/bizmap-ai", label: "Startup Cycle" },
  { href: "/answers", label: "Founder Answers" },
  { href: "/mentorship", label: "Mentors" },
  { href: "/newspaper", label: "Newspaper" },
  { href: "/podcast", label: "Podcast" },
  { href: "/resources", label: "Resources" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
];

// Footer.tsx is a React component, so the prerendered HTML carried no footer at
// all. That left the legal pages with zero inbound links, and the hubs that no
// other page naturally links to — /marketplace, /co-founder, /investors,
// /directories, /prompt-library, /insighta, /startup-guide, /demo — orphaned
// with the sitemap as their only discovery path.
//
// A grouped footer is the conventional fix: it costs a little link equity per
// page and buys every route at least one real inbound link.
const FOOTER_GROUPS = [
  {
    heading: "Explore",
    links: [
      { href: "/bizmap-ai", label: "Startup Development Cycle" },
      { href: "/build", label: "Build" },
      { href: "/answers", label: "Founder Answer Library" },
      { href: "/startup-guide", label: "Startup Guide" },
      { href: "/resources", label: "Resources" },
    ],
  },
  {
    heading: "Community",
    links: [
      { href: "/mentorship", label: "Mentors" },
      { href: "/marketplace", label: "Service Marketplace" },
      { href: "/co-founder", label: "Co-Founder Matching" },
      { href: "/investors", label: "Investors" },
    ],
  },
  {
    heading: "Tools",
    links: [
      { href: "/insighta", label: "Insighta" },
      { href: "/vc-search", label: "VC Search" },
      { href: "/accelerator-hunt", label: "Accelerator Hunt" },
      { href: "/pitch-deck-analyzer", label: "Pitch Deck Analyzer" },
      { href: "/email-templates", label: "Investor Email Templates" },
      { href: "/insighta-test", label: "Insighta Test" },
      { href: "/directories", label: "Launch Directories" },
      { href: "/prompt-library", label: "Prompt Library" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/pricing", label: "Pricing" },
      { href: "/careers", label: "Careers" },
      { href: "/faq", label: "FAQ" },
      { href: "/demo", label: "Demo" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/data-privacy", label: "Data Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

const PRICING_SUMMARY = [
  { name: "Rookie", price: "$0/month", outcome: "Clarify", credits: "50 monthly credits", description: "Create the first customer decision and understand the connected journey." },
  { name: "Starter", price: "$9/month", outcome: "Validate", credits: "100 monthly credits", description: "Publish proof, collect evidence, and make the first PMF decision." },
  { name: "Rising", price: "$29/month", outcome: "Build and Launch", credits: "250 monthly credits", description: "Build the evidence backed MVP, launch assets, and begin measuring traction." },
  { name: "Pro", price: "$65/month", outcome: "Accelerate and Fundraise", credits: "600 monthly credits", description: "Add expert accountability within 48 hours, deeper research, and fundraising workflows." },
];

function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildFallbackHtml(routeConfig, hubChildren = {}) {
  const nav = PRIMARY_NAV.filter((item) => item.href !== routeConfig.path)
    .map((item) => `<a href="${item.href}">${item.label}</a>`)
    .join(" | ");
  const heroContent = routeConfig.path === "/"
    ? `<p>Creatives Takeover &middot; Founders Compass</p>
          <p>Startup incubator platform.</p>
          <p>Define what to build, who it's for, and whether they'll pay before you spend months building.</p>
          <p><strong>No application. No cohort. No equity.</strong></p>
          <form action="/icp-builder" method="get">
            <label for="seo-hero-seed">What is your idea?</label>
            <textarea id="seo-hero-seed" name="seed" minlength="3" required></textarea>
            <button type="submit">Assess viability</button>
          </form>
          <p>Already have a product? <a href="/demo-studio/try">Build my demo</a>.</p>`
    : `<p>${routeConfig.heroCopy || routeConfig.description}</p>`;
  const authorByline = routeConfig.path.startsWith("/answers/")
    ? `<p>By <a href="/about#founder">Javier Peña, Founder &amp; CEO</a></p>`
    : "";
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
  const sources = (routeConfig.sources || []).length
    ? `        <section>
          <h2>Primary sources</h2>
          <ul>
${routeConfig.sources
  .map((source) => `            <li><a href="${source.url}">${source.title}</a> — ${source.publisher}</li>`)
  .join("\n")}
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

  // A hub's children: static ones come from the route config, live ones
  // (articles, mentors) are keyed in by the build-time fetch. This is the whole
  // point of the exercise — a hub that links to nothing leaves its children
  // discoverable only via the sitemap, which Google treats as a weak signal.
  const childLinks = routeConfig.childLinks
    || (routeConfig.childLinksKey ? hubChildren[routeConfig.childLinksKey] : null)
    || [];
  const childLinksSection = childLinks.length
    ? `        <section>
          <h2>${escapeText(routeConfig.childLinksHeading || "In this section")}</h2>
          <ul>
${childLinks
  .map((item) => `            <li><a href="${item.href}">${escapeText(item.label)}</a></li>`)
  .join("\n")}
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
          ${authorByline}
          ${routeConfig.updatedLabel ? `<p>Last updated ${routeConfig.updatedLabel}</p>` : ""}
        </section>
${quickAnswer}
${pricingSummary}
${sections}
${sources}
${checklist}
        ${faqs ? `        <section>
          <h2>Common questions</h2>
          <dl>
${faqs}
          </dl>
        </section>` : ""}
${cta}
${childLinksSection}
        <section>
          <h2>${routeConfig.relatedLinks ? "Keep learning" : "Explore more"}</h2>
          <ul>
            ${exploreLinks}
          </ul>
        </section>
      </article>
      <footer>
        <nav aria-label="Site directory">
${FOOTER_GROUPS.map((group) => {
  const links = group.links
    .filter((item) => item.href !== routeConfig.path)
    .map((item) => `            <li><a href="${item.href}">${item.label}</a></li>`)
    .join("\n");
  return `          <h2>${group.heading}</h2>
          <ul>
${links}
          </ul>`;
}).join("\n")}
        </nav>
      </footer>`;
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

// Keep the Organization entity stable across public pages. WebSite identity
// markup intentionally stays on the domain homepage, per Google's site-name
// guidance, so inner routes do not compete with the homepage as the site root.
const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: SITE_NAME,
  url: BASE_URL,
  logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon-192x192.png`, width: 192, height: 192 },
  description: "Creatives Takeover is a startup development platform for first-time founders, connecting customer clarity, validation, MVP building, go-to-market execution, traction, and fundraising preparation.",
  founder: {
    "@type": "Person",
    "@id": `${BASE_URL}/about#founder`,
    name: "Javier Peña",
    jobTitle: "Founder & CEO",
    url: `${BASE_URL}/about#founder`,
  },
  sameAs: [
    "https://x.com/Creatives_Rule",
    "https://www.linkedin.com/company/creatives-takeover",
    "https://www.instagram.com/creativestakeover.official/",
    "https://www.youtube.com/@CreativesTakeover",
    "https://www.tiktok.com/@creativestakeover",
  ],
};

// The dist/index.html template ships the homepage's JSON-LD (WebSite, Organization,
// SoftwareApplication, homepage FAQ). On inner pages that block is wrong — replace
// it with route-specific schema mirroring what react-helmet renders after hydration.
function buildStructuredData(routeConfig) {
  if (routeConfig.path === "/") return null; // homepage keeps the template block

  const canonical = `${BASE_URL}${routeConfig.path}`;
  const data = [ORGANIZATION_SCHEMA];

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

  if (routeConfig.schemaType === "collection") {
    data.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${canonical}#collection`,
      name: routeConfig.heroHeading || routeConfig.title,
      description: routeConfig.description,
      url: canonical,
      isPartOf: { "@id": `${BASE_URL}/#website` },
      mainEntity: {
        "@type": "ItemList",
        "@id": `${canonical}#items`,
        name: routeConfig.heroHeading || routeConfig.title,
      },
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
      datePublished: routeConfig.publishedAt || updatedIso,
      dateModified: routeConfig.modifiedAt || updatedIso,
      author: {
        "@type": "Person",
        "@id": `${BASE_URL}/about#founder`,
        name: "Javier Peña",
        jobTitle: "Founder & CEO",
        url: `${BASE_URL}/about#founder`,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: { "@type": "ImageObject", url: `${BASE_URL}/favicon-192x192.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      ...(routeConfig.sources?.length
        ? { citation: routeConfig.sources.map((source) => source.url) }
        : {}),
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

// Route-specific crawler content remains in #seo-fallback. The browser does
// not render a second visual shell before React because that causes a visible
// hydration flash when its simplified markup is replaced by the real app.

function renderRoute(template, routeConfig, hubChildren = {}) {
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
    `<main id="seo-fallback">\n${buildFallbackHtml(routeConfig, hubChildren)}\n    </main>`
  );
  return html;
}

async function writeRoute(template, routeConfig, hubChildren) {
  const html = renderRoute(template, routeConfig, hubChildren);
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
  // Never fatal: a hub without live children still builds, it just falls back to
  // the behaviour this change replaced.
  const hubChildren = await fetchHubChildren();
  const hubSummary = Object.entries(hubChildren)
    .map(([hub, links]) => `${hub} (${links.length})`)
    .join(", ");
  if (!hubSummary) {
    console.warn(
      "No live hub children fetched — set VITE_SUPABASE_KEY so /newspaper and /mentorship link to their pages.",
    );
  }

  await fs.mkdir(DIST_DIR, { recursive: true });
  await Promise.all(
    INDEXABLE_ROUTES.map((routeConfig) => writeRoute(template, routeConfig, hubChildren)),
  );
  console.log(
    `Prerendered ${INDEXABLE_ROUTES.length} public route shells with route-specific metadata.`
      + (hubSummary ? ` Hub child links: ${hubSummary}.` : ""),
  );
}

main().catch((error) => {
  console.error("Failed to generate prerendered public pages.", error);
  process.exitCode = 1;
});
