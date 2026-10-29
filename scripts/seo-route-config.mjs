// Node 22.18+ strips TypeScript types natively, so the build scripts can import
// the app's Startup Pedia content directly. Single source of truth: the same
// data renders the React pages (StartupPedia*.tsx) and the prerendered HTML.
import {
  PEDIA_BASE_PATH,
  PEDIA_ENTRIES,
  PEDIA_HUB_SEO,
  PEDIA_TOPICS,
  STARTUP_SHORTCUTS,
  AUDIENCE_LABELS,
  AUDIENCE_ORDER,
  pediaCtaHref,
  entryPath,
  getEntriesByTopic,
  getRelatedEntries,
  indexableTopics,
  isTopicIndexable,
  shortcutHref,
  topicPath,
} from "../src/data/startupPedia/index.ts";
import { markdownToHtml } from "../src/lib/markdownToHtml.ts";
import { FOUNDER_ID_FAQS } from "../src/data/founderIdPage.ts";

export const BASE_URL = "https://creatives-takeover.com";
export const SITE_NAME = "Creatives Takeover";
export const OG_IMAGE = `${BASE_URL}/og-founders-compass-2026-09.png`;

// Mirror the truncation rules in src/components/SEO.tsx so the prerendered
// <title>/<meta description> match what react-helmet renders after hydration.
const truncateTitle = (title) => (title.length > 60 ? `${title.substring(0, 57)}...` : title);
const truncateDescription = (description) =>
  description.length > 160 ? `${description.substring(0, 157)}...` : description;

// Turns a route's updatedLabel into a sitemap lastmod ("May 2026" -> "2026-05-01").
const MONTHS = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};
export function updatedLabelToIso(label) {
  const match = /([a-zA-Z]+)\s+(\d{4})/.exec(label || "");
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    if (month) return `${match[2]}-${month}-01`;
  }
  return null;
}

export const ROBOTS_DISALLOW = [
  "/admin/",
  "/auth/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  // Robots rules match by prefix: a bare "/start" also blocked /startup-pedia
  // and /startup-guide. These three block only the onboarding page (/start),
  // its query-string links (/start?return=...) and the pages under it.
  "/start$",
  "/start?",
  "/start/",
  "/dashboard",
  "/account",
  "/messages",
  "/setup-quiz",
  "/focus-funnel",
  "/core-metrics",
  "/weekly-mission",
  "/tasks",
  "/subscription-success",
  "/mentorship/book/",
  "/mentorship/my-bookings",
  "/mentorship/admin/",
  "/co-founder/create",
  "/co-founder/edit/",
  "/investors/admin/",
  "/newspaper/admin/",
  "/stories/admin/",
  "/w/",
  "/api/",
  "/rag-test",
  "/test-phase1",
];

// Startup Pedia: the hub, every indexable topic and every entry, built from the
// same data as the React pages. Entries carry their full body as HTML so the
// crawler reads the whole article without running JavaScript.
const escapeHtml = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const pediaEntryBodyHtml = (entry) => {
  const parts = [];
  if (entry.formulas?.length) {
    parts.push(`<h2 id="formula">${entry.formulas.length > 1 ? "Formulas" : "Formula"}</h2>`);
    parts.push(
      `<dl>${entry.formulas
        .map((formula) => `<dt>${escapeHtml(formula.label)}</dt><dd>${escapeHtml(formula.expression)}${formula.note ? ` (${escapeHtml(formula.note)})` : ""}</dd>`)
        .join("")}</dl>`,
    );
  }
  if (entry.steps?.length) {
    parts.push('<h2 id="steps">Step by step</h2>');
    parts.push(
      `<ol>${entry.steps.map((step) => `<li><h3>${escapeHtml(step.title)}</h3>${markdownToHtml(step.body)}</li>`).join("")}</ol>`,
    );
  }
  for (const section of entry.sections) {
    parts.push(`<h2 id="${section.id}">${escapeHtml(section.heading)}</h2>`);
    parts.push(markdownToHtml(section.body));
  }
  const roles = AUDIENCE_ORDER.filter((key) => entry.roleNotes?.[key]);
  if (roles.length) {
    parts.push('<h2 id="for-your-role">For your role</h2>');
    parts.push(`<dl>${roles.map((key) => `<dt>${AUDIENCE_LABELS[key]}</dt><dd>${escapeHtml(entry.roleNotes[key])}</dd>`).join("")}</dl>`);
  }
  return parts.join("\n");
};

const PEDIA_HUB_ROUTE = {
  // Written out (it equals PEDIA_BASE_PATH) because internal-linking-seo.test.ts
  // checks that every sitewide nav href appears as a literal indexable path.
  path: "/startup-pedia",
  title: PEDIA_HUB_SEO.title,
  description: PEDIA_HUB_SEO.description,
  changefreq: "weekly",
  priority: 0.85,
  heroHeading: PEDIA_HUB_SEO.heading,
  heroCopy: PEDIA_HUB_SEO.intro,
  schemaType: "collection",
  breadcrumb: [
    { name: "Home", url: "/" },
    { name: "Startup Pedia", url: PEDIA_BASE_PATH },
  ],
  bodyHtml: [
    "<h2>Startup Shortcuts: 30 terms every founder should know</h2>",
    `<ul>${STARTUP_SHORTCUTS.map((shortcut) => `<li><a href="${shortcutHref(shortcut)}"><abbr title="${escapeHtml(shortcut.expansion)}">${shortcut.acronym}</abbr> ${escapeHtml(shortcut.expansion)}</a></li>`).join("")}</ul>`,
    "<h2>Topics</h2>",
    `<ul>${indexableTopics().map((topic) => `<li><a href="${topicPath(topic.key)}">${escapeHtml(topic.label)}</a></li>`).join("")}</ul>`,
  ].join("\n"),
  // The hub's whole job is to point at its entries: without these, every entry
  // would depend on the sitemap alone for discovery.
  childLinksHeading: "Every Startup Pedia entry",
  childLinks: PEDIA_ENTRIES.map((entry) => ({ href: entryPath(entry.slug), label: entry.title })),
};

const PEDIA_TOPIC_ROUTES = PEDIA_TOPICS.filter((topic) => isTopicIndexable(topic.key)).map((topic) => ({
  path: topicPath(topic.key),
  title: topic.metaTitle,
  description: topic.metaDescription,
  changefreq: "weekly",
  priority: 0.75,
  heroHeading: topic.heading,
  heroCopy: topic.intro,
  schemaType: "collection",
  breadcrumb: [
    { name: "Home", url: "/" },
    { name: "Startup Pedia", url: PEDIA_BASE_PATH },
    { name: topic.label, url: topicPath(topic.key) },
  ],
  childLinksHeading: `${topic.label}: terms and guides`,
  childLinks: getEntriesByTopic(topic.key).map((entry) => ({ href: entryPath(entry.slug), label: entry.title })),
  relatedLinks: [
    ...topic.tools.map((tool) => ({ href: tool.href, label: tool.label })),
    { href: PEDIA_BASE_PATH, label: "Startup Pedia" },
  ],
}));

const PEDIA_ENTRY_ROUTES = PEDIA_ENTRIES.map((entry) => {
  const topic = PEDIA_TOPICS.find((item) => item.key === entry.topic);
  const topicCrumb = topic && isTopicIndexable(topic.key) ? [{ name: topic.label, url: topicPath(topic.key) }] : [];
  return {
    path: entryPath(entry.slug),
    title: truncateTitle(entry.metaTitle),
    description: truncateDescription(entry.metaDescription),
    changefreq: "monthly",
    priority: 0.7,
    lastmod: entry.modifiedAt,
    publishedAt: entry.publishedAt,
    modifiedAt: entry.modifiedAt,
    heroHeading: entry.title,
    heroCopy: entry.answer,
    pediaEntry: {
      kind: entry.kind,
      acronyms: entry.acronyms || [],
      aliases: entry.aliases || [],
      answer: entry.answer,
      topicLabel: topic?.label,
    },
    bodyHtml: pediaEntryBodyHtml(entry),
    sources: entry.sources,
    faqs: entry.faqs,
    ...(entry.cta
      ? { cta: { label: entry.cta.label, href: pediaCtaHref(entry.cta.href, entry.slug), description: entry.cta.description } }
      : {}),
    relatedLinks: [
      ...getRelatedEntries(entry).map((related) => ({ href: entryPath(related.slug), label: related.title })),
      ...(topicCrumb.length ? [{ href: topicCrumb[0].url, label: topicCrumb[0].name }] : []),
      { href: PEDIA_BASE_PATH, label: "Startup Pedia" },
    ],
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Startup Pedia", url: PEDIA_BASE_PATH },
      ...topicCrumb,
      { name: entry.title, url: entryPath(entry.slug) },
    ],
  };
});

export const STARTUP_PEDIA_ROUTES = [PEDIA_HUB_ROUTE, ...PEDIA_TOPIC_ROUTES, ...PEDIA_ENTRY_ROUTES];

export const INDEXABLE_ROUTES = [
  {
    path: "/",
    title: "Creatives Takeover | Startup Development Platform",
    description:
      "Creatives Takeover is a startup development platform that helps first-time founders validate ideas, build MVPs, launch, gain traction, and prepare to raise.",
    changefreq: "daily",
    priority: 1.0,
    heroHeading: "The Founders' Compass",
    heroCopy:
      "Identify what’s worth building, validate demand with reliable evidence, and turn insights into products and go-to-market strategies.",
    sections: [
      {
        heading: "Reach value before signup",
        copy: "Launch a personalized live demo or draft an evidence backed customer decision before creating an account.",
      },
      {
        heading: "Complete six connected outcomes",
        copy: "Move from ICP Builder through Demo Studio, PMF Lab, MVP Builder, GTM Strategist, and Traction Engine without losing the evidence behind each decision.",
      },
    ],
  },
  {
    path: "/about",
    title: "About Creatives Takeover | Our Mission and Team",
    description:
      "Meet the team behind Creatives Takeover and learn how our mission, principles, and founder-first approach shape the platform we are building.",
    changefreq: "monthly",
    priority: 0.7,
    heroHeading: "About Creatives Takeover",
    heroCopy:
      "We are building a founder-focused platform for startup validation, MVP planning, fundraising prep, and execution support.",
  },
  {
    path: "/pricing",
    // Mirrors src/data/pricingPage.ts (PRICING_SEO); tests/pricing-audiences.test.ts
    // keeps them equal.
    title: "Pricing for Founders and Programs | Creatives Takeover",
    description:
      "Four plans for founders and builders, from free to Pro, and custom pricing for accelerators, incubators and university programs. Talk with sales.",
    changefreq: "weekly",
    priority: 0.9,
    heroHeading: "Pricing",
    heroCopy:
      "Plans for founders and builders. Custom pricing for programs.",
    sections: [
      {
        heading: "Founders and builders: four plans",
        copy: "Rookie is free. Starter, Rising and Pro add monthly credits and capacity, billed monthly or yearly. See the credit cost before every metered action.",
      },
      {
        heading: "Institutions: custom pricing",
        copy: "Accelerators, incubators, university programs and other institutions don’t pay a single fee. Pricing depends on the number of startups and the program’s length, starting with a 30-day pilot. Talk with sales.",
      },
    ],
  },
  // Audience pages (B2B2C repositioning, 2026-10-15). Title and description
  // mirror src/data/audiencePages.ts and src/data/enterprisePage.ts;
  // tests/audience-pages.test.ts keeps them equal.
  {
    path: "/for-founders",
    title: "For Founders and Builders | Creatives Takeover",
    description:
      "Start and test your project in one workspace: a tool for every stage, plus mentors, service providers, investors and other founders. Free to start, no equity.",
    changefreq: "monthly",
    priority: 0.9,
    heroHeading: "Start and test your project here",
    heroCopy:
      "Define who you are building for, put your idea in front of real buyers and build what they ask for, with mentors, service providers, investors and other founders in the same place.",
    sections: [
      {
        heading: "A tool for every stage",
        copy: "ICP Builder, Demo Studio, PMF Lab, MVP Builder, GTM Strategist and Traction Engine, each ending in something you can show.",
      },
      {
        heading: "Free to start. No equity.",
        copy: "Create an account without applying. We can’t promise investment: you choose whether investors can see your progress, and they decide whom to contact.",
      },
    ],
  },
  {
    path: "/enterprise",
    title: "For Accelerators and Incubators | Creatives Takeover",
    description:
      "A 30-day founder validation pilot for accelerators and incubators: a validation plan and documented evidence for every founder, and a cohort report.",
    changefreq: "monthly",
    priority: 0.9,
    heroHeading: "See which startups in your cohort are doing the work.",
    heroCopy:
      "A 30-day founder validation pilot for accelerators, incubators and university programs. We keep your cohort engaged and accountable throughout the program. Start with a 30-day pilot, then we shape it around your program’s length, size and founders.",
    sections: [
      {
        heading: "We run it. You bring the founders.",
        copy: "Seven steps: we set up your cohort; founders join with their consent; they get a weekly plan and full access to our paid tools for the 30 days, at no cost to them; you see every startup on one screen; we follow up every week and send you a summary; on day 30 you get the cohort report; after that, founders keep their account, their work and the free plan.",
      },
      {
        heading: "What the pilot includes, and what it doesn’t",
        copy: "Included: a program dashboard with spreadsheet export, full access for every founder, kickoff and onboarding, weekly follow-up and a summary, and the final cohort report. Not included: founders’ private work, promised results, funding or investor introductions, or a replacement for your curriculum. Your program provides 5 to 10 startups, one contact from your team, a kickoff session with your founders and, if you need one, your funder’s report format. Each startup brings an idea worth testing, one founder to lead it, and about 3 hours a week.",
      },
      {
        heading: "Your size, your founders, your calendar",
        copy: "The pilot is set up around your cohort size, your founders’ sector, such as fintech, and your program’s length.",
      },
      {
        heading: "Your founders keep going after the program ends",
        copy: "Alumni keep getting support from the platform, with the stage tools, mentors, and rooms, launches and co-founder matching with other founders. No extra work for your team.",
      },
    ],
  },
  {
    path: "/for-investors",
    title: "For VCs and Family Offices | Creatives Takeover",
    description:
      "Sponsor a founder cohort in your thesis area, or get matched with early founders who chose to share their progress with investors.",
    changefreq: "monthly",
    priority: 0.9,
    heroHeading: "Meet founders while they’re still building",
    heroCopy:
      "For VCs and family offices. Sponsor a cohort in your thesis area, or create an investor account and get matched with teams whose progress you can read.",
    sections: [
      {
        heading: "Sponsored cohort",
        copy: "Fund a cohort under your brand, by thesis area, region or university. Founders use the platform free, and you follow the teams that choose to share their progress with you.",
      },
      {
        heading: "Investor account",
        copy: "Set the sectors and stages you invest in and get matched with founders who opted in to be visible to investors.",
      },
      {
        heading: "Founders decide what you see",
        copy: "Visibility is opt-in, founder by founder. Sponsoring a cohort doesn’t commit you, or the founders, to an investment.",
      },
    ],
  },
  {
    path: "/resources",
    title: "Resources | Creatives Takeover",
    description:
      "Explore founder resources, startup guides, templates, and practical learning materials from Creatives Takeover.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Founder resources and guides",
    heroCopy:
      "Browse practical tutorials, downloads, and startup learning resources designed to help founders move faster with less guesswork.",
  },
  ...STARTUP_PEDIA_ROUTES,
  {
    path: "/startup-guide",
    title: "How to Build a Startup: First-Time Founder Guide",
    description:
      "A step-by-step guide for first-time founders: define your ICP, validate your idea, scope your MVP, plan go-to-market, and prepare for fundraising.",
    changefreq: "monthly",
    priority: 0.85,
    heroHeading: "How to Build a Startup: The Complete First-Time Founder Guide",
    heroCopy:
      "The full startup journey in one place — from customer clarity and idea validation through MVP scoping, launch, and fundraising preparation.",
    sections: [
      {
        heading: "Define who you're building for",
        copy: "Start with ideal customer profile (ICP) clarity. Narrow your first market, name the pain worth solving, and make your positioning specific enough to test.",
      },
      {
        heading: "Prove the problem before you build",
        copy: "Validate demand with customer interviews, waitlists, and real signals before writing code. Most startups fail by building first and asking later.",
      },
      {
        heading: "Scope and ship your MVP in 6–8 weeks",
        copy: "Cut scope to the riskiest assumption, choose a stack that matches your stage, and ship a first version designed to learn, not to impress.",
      },
      {
        heading: "Get your first 100 customers",
        copy: "Pick one or two acquisition channels, craft messaging from customer language, and run a focused go-to-market plan for your first 90 days.",
      },
      {
        heading: "Prepare for investors when you're ready",
        copy: "Build a defensible traction story, tighten your pitch deck, and research the right VCs and accelerators before you start outreach.",
      },
    ],
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Startup Guide", url: "/startup-guide" },
    ],
  },
  {
    path: "/faq",
    title: "FAQ | Creatives Takeover",
    description:
      "Answers to common questions about Creatives Takeover's AI startup tools, pricing, credits, BizMap AI, PMF Lab, Insighta, and community features.",
    changefreq: "monthly",
    priority: 0.6,
    heroHeading: "Frequently Asked Questions",
    heroCopy:
      "Everything founders ask about Creatives Takeover: what the platform does, how pricing and credits work, and what you get on the free plan.",
    faqs: [
      {
        question: "What is Creatives Takeover?",
        answer:
          "Creatives Takeover is a founder support platform built to help people build startups from scratch. BizMap AI guides users through the Startup Development Cycle, while tools like PMF Lab, ICP Builder, Tech Stack Builder, VC Search, and the mentor and co-founder community help turn ideas into real execution.",
      },
      {
        question: "How much does it cost?",
        answer:
          "We offer four plans: Rookie is free with 50 credits/month, Starter is $9/month or $79/year with 100 credits, Rising is $29/month or $239/year with 250 credits, and Pro is $65/month or $589/year with 600 credits. Extra credit packs remain available on every plan.",
      },
      {
        question: "Can I try it for free?",
        answer:
          "Yes. Rookie is free forever with 50 credits per month and no credit card required. You get free ICP Builder access, Insighta Test, Newspaper, early-stage browsing or preview access, and community browsing features.",
      },
      {
        question: "What makes Creatives Takeover different?",
        answer:
          "We help founders, indie hackers, and builders move from scratch to launch through a practical Startup Development Cycle supported by AI, founder tools, mentors, co-founders, and fundraising resources.",
      },
    ],
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "FAQ", url: "/faq" },
    ],
  },
  {
    path: "/mentorship",
    title: "Mentor Marketplace | Creatives Takeover",
    description:
      "Find startup mentors, book working sessions, and connect with experienced founders who can help you move from idea to execution.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Connect. Learn. Grow.",
    heroCopy:
      "Browse startup mentors, review expertise, and book practical sessions focused on execution, fundraising, product, and growth.",
    // Filled at build time from the live mentor roster — see fetch-hub-children.mjs.
    childLinksHeading: "Browse mentors",
    childLinksKey: "/mentorship",
  },
  {
    childLinksHeading: "Services on the marketplace",
    childLinksKey: "/marketplace",
    path: "/marketplace",
    title: "Founder Service Marketplace | Creatives Takeover",
    description:
      "Browse founder-ready services for sales, marketing, operations, automation, and technical support from specialists who understand early-stage companies.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Founder services that move the business forward",
    heroCopy:
      "Compare curated startup services, review provider expertise, and contact specialists for practical execution support.",
    schemaType: "collection",
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Founder Service Marketplace", url: "/marketplace" },
    ],
    sections: [
      {
        heading: "Curated for early-stage execution",
        copy: "Browse practical sales, marketing, operations, automation, and technical services designed for founders and small teams.",
      },
      {
        heading: "Review before you contact",
        copy: "Each active service has a dedicated profile with a clear description, named provider, category, and supporting materials when available.",
      },
    ],
  },
  {
    path: "/co-founder",
    title: "Find a Co-Founder | Creatives Takeover",
    description:
      "Say what you are building or what you want to join, see transparent compatibility signals, and send interest to founders who fit. No credits used.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Find the right co-founder",
    heroCopy:
      "Explore active founder profiles and startup ideas to find a collaborator who complements your skills and ambition.",
  },
  {
    path: "/investors",
    title: "Find Your Angel | Creatives Takeover",
    description:
      "Browse angel investors, review fit signals, and build a tighter investor shortlist for your startup fundraising process.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Build a better investor shortlist",
    heroCopy:
      "Review angel investor profiles and focus areas so you can spend less time on random outreach and more time on targeted conversations.",
  },
  {
    // /build and /podcast carry an inbound link from every prerendered shell,
    // making them the most-linked URLs on the site — yet neither was prerendered
    // nor in the sitemap, so both fell through the SPA catch-all in vercel.json
    // and shipped the homepage title and canonical. They are real pages; treat
    // them as such.
    path: "/build",
    title: "Evidence-Backed MVP Builder for Founders | Creatives Takeover",
    description:
      "Turn saved ICP and PMF evidence into a focused, deployable MVP. Build around one customer, one job, and the smallest testable feature set.",
    changefreq: "weekly",
    priority: 0.9,
    heroHeading: "Build the MVP your evidence points to",
    heroCopy:
      "Turn saved ICP and PMF evidence into a focused, deployable MVP built around one customer, one job, and the smallest testable feature set.",
    relatedLinks: [
      { href: "/mvp-scope", label: "Decide what to build first" },
      { href: "/mvp-builder", label: "MVP Builder" },
      { href: "/bizmap-ai", label: "The full startup development cycle" },
    ],
  },
  {
    path: "/founder-id",
    // Mirrors src/data/founderIdPage.ts (FOUNDER_ID_SEO); tests/founder-id-page.test.ts
    // keeps them equal. A static share card, because robots.txt blocks /api/og
    // for the LinkedIn and Facebook scrapers.
    title: "Founder ID: Your Project in One Link | Creatives Takeover",
    description:
      "Founder ID is a free public page for founders and builders: your project, your links, a way to support you and your updates, all at one short link.",
    changefreq: "monthly",
    priority: 0.8,
    heroHeading: "Everything you’re building, in one link.",
    heroCopy:
      "Founder ID is your public page on Creatives Takeover. Your project, your links, a way for people to support you and your latest progress, at one short address you can share anywhere.",
    ogImage: `${BASE_URL}/og-founder-id.png`,
    faqs: FOUNDER_ID_FAQS,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    sections: [
      {
        heading: "Profile: who you are and what you’re building",
        copy: "Your name, location and one-line pitch beside your project, your role, stage and industry, project links (website, demo, Loom video, pitch deck, waitlist) and your LinkedIn, X, GitHub, Instagram or YouTube.",
      },
      {
        heading: "Support: let people back your project",
        copy: "Add your Patreon, PayPal or Buy Me a Coffee page, or Ko-fi, Stripe, GitHub Sponsors and Open Collective. Visitors tap Donate and pay on your provider’s page, not through Creatives Takeover.",
      },
      {
        heading: "Project Updates: show your progress",
        copy: "Post milestones, ideas and requests for feedback, with photos or a YouTube video. Schedule posts, pin one, and let people like, comment, repost and share them.",
      },
    ],
    relatedLinks: [
      { href: "/pricing", label: "See pricing" },
      { href: "/build", label: "Build your product" },
      { href: "/mentorship", label: "Find mentors" },
    ],
  },
  {
    path: "/podcast",
    title: "Founders Unleashed — Podcast | Creatives Takeover",
    description:
      "Conversations with founders building real products, told as stories, not pitches. Unusual paths, contrarian bets, and the hard moments behind the company.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Founders Unleashed",
    heroCopy:
      "Conversations with founders building real products, told as stories, not pitches — the unusual paths, the contrarian bets, and the hard moments behind the company.",
    relatedLinks: [
      { href: "/newspaper", label: "Read founder stories" },
      { href: "/mentorship", label: "Meet the mentors" },
    ],
  },
  {
    path: "/newspaper",
    title: "Newspaper | Creatives Takeover",
    description:
      "Read founder stories, startup lessons, fundraising insights, and practical articles for early-stage entrepreneurs.",
    changefreq: "daily",
    priority: 0.8,
    heroHeading: "Founder stories and startup insights",
    heroCopy:
      "Read articles, case studies, and lessons for founders building products, raising capital, and growing from zero.",
    // Filled at build time from the newest published articles — the React hub
    // paginates client-side, so these are the only article links a crawler sees.
    childLinksHeading: "Latest articles",
    childLinksKey: "/newspaper",
  },
  {
    path: "/careers",
    title: "Careers | Creatives Takeover",
    description:
      "Explore open roles at Creatives Takeover and help build tools for startup founders, fundraising workflows, and execution support.",
    changefreq: "monthly",
    priority: 0.55,
    heroHeading: "Work with us",
    heroCopy:
      "Join Creatives Takeover and help build products that make startup execution more accessible for founders.",
  },
  {
    path: "/prompt-library",
    title: "Prompt Library | Creatives Takeover",
    description:
      "Browse startup prompt libraries, business idea workflows, and structured founder prompts for research, validation, and strategy.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Prompt libraries for founders",
    heroCopy:
      "Use curated prompts and structured startup workflows to generate ideas, sharpen positioning, and accelerate execution.",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Creatives Takeover",
    description:
      "Review how Creatives Takeover collects, uses, stores, and protects personal data across its founder tools and platform features.",
    changefreq: "yearly",
    priority: 0.3,
    heroHeading: "Privacy Policy",
    heroCopy: "Read how we handle personal data and platform information.",
  },
  {
    path: "/data-privacy",
    title: "Data Privacy Policy | Creatives Takeover",
    description:
      "Learn how Creatives Takeover collects, uses, protects, and shares founder data across BizMap AI, Insighta, community features, and startup tools.",
    changefreq: "yearly",
    priority: 0.3,
    heroHeading: "Data Privacy Policy",
    heroCopy:
      "A plain-language guide to what data we collect, why we use it, how we protect it, and how you stay in control.",
  },
  {
    path: "/terms",
    title: "Terms of Service | Creatives Takeover",
    description:
      "Review the Terms of Service for Creatives Takeover, including subscriptions, credits, founder tools, and community features.",
    changefreq: "yearly",
    priority: 0.3,
    heroHeading: "Terms of Service",
    heroCopy: "Read the rules and terms that govern use of the platform.",
  },
  {
    path: "/bizmap-ai",
    title: "AI Startup Builder & Validation Tools | Creatives Takeover",
    description:
      "Use BizMap AI to validate a startup idea, define your ideal customer, plan your MVP, and move into launch with a clearer founder workflow.",
    changefreq: "weekly",
    priority: 0.9,
    heroHeading: "Startup Development Cycle For Founders",
    heroCopy:
      "Move from idea validation to MVP planning and launch with a structured founder workflow covering customer research, PMF, product scope, and go-to-market.",
    updatedLabel: "March 2026",
    // The React hub links these well (BizMapJourneyHubPage.tsx), but the
    // prerendered shell did not, leaving each tool page dependent on a
    // UTM-tagged answer-page CTA for its only inbound link.
    childLinksHeading: "Tools in the cycle",
    childLinks: [
      { href: "/icp-builder", label: "ICP Builder — define your ideal customer" },
      { href: "/validate", label: "Validate — test demand before you build" },
      { href: "/pmf-lab", label: "PMF Lab — find product–market fit evidence" },
      { href: "/mvp-scope", label: "MVP Scope — decide what to build first" },
      { href: "/mvp-builder", label: "MVP Builder — build the evidence-backed MVP" },
      { href: "/tech-stack", label: "Tech Stack — choose your build tooling" },
      { href: "/demo-studio", label: "Demo Studio — turn the product into a live demo" },
      { href: "/go-to-market", label: "Go-To-Market — plan the launch" },
      { href: "/traction-engine", label: "Traction Engine — measure and grow" },
      { href: "/decision-sprint", label: "Decision Sprint — resolve a blocking call" },
    ],
    sections: [
      {
        heading: "What BizMap AI is",
        copy: "BizMap AI is a founder workflow that connects startup validation, ideal customer definition, MVP scoping, waitlist testing, and go-to-market planning in one guided cycle.",
      },
      {
        heading: "Who should use it",
        copy: "It is built for early-stage founders who need structure, not just prompts, and want to move from vague ideas to concrete execution steps.",
      },
      {
        heading: "What you get from it",
        copy: "You leave with clearer customer priorities, a tighter MVP, stronger launch preparation, and linked tools that carry your context forward stage by stage.",
      },
    ],
  },
  {
    path: "/pmf-lab",
    title: "Product-Market Fit Score Tool | PMF Lab | Creatives Takeover",
    description:
      "Score product-market fit readiness with customer evidence, validation signals, and practical recommendations before building your startup.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Product-Market Fit Score Tool",
    heroCopy:
      "Review your waitlist, interviews, and demand signals, then get a clearer product-market fit score before you commit to building.",
    updatedLabel: "March 2026",
    sections: [
      {
        heading: "What PMF Lab measures",
        copy: "PMF Lab scores the strength of your demand evidence, not just your confidence. It looks at customer signals, urgency, traction, and how clearly the pain shows up in the market.",
      },
      {
        heading: "When to use it",
        copy: "Use it before building a new MVP, before raising money on a weak story, or when you need to know whether current traction is strong enough to justify product development.",
      },
      {
        heading: "What the output gives you",
        copy: "You get a readiness score, practical recommendations, and a clearer decision on whether to build now or keep iterating on validation.",
      },
    ],
  },
  {
    path: "/tech-stack",
    title: "Startup Tech Stack Builder | Creatives Takeover",
    description:
      "Compare startup frameworks, tools, and platforms to choose a tech stack that fits your product, speed, and budget.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Startup Tech Stack Builder",
    heroCopy:
      "Compare frameworks, tools, and infrastructure choices so you can build with a stack that matches your product and stage.",
  },
  {
    path: "/icp-builder",
    title: "ICP Builder: Define Your Ideal Customer | Creatives Takeover",
    description:
      "Define your ideal customer profile, sharpen positioning, and choose the customer segment your startup should target first.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Ideal Customer Profile Builder",
    heroCopy:
      "Define the customer segment you should target first, the pain worth solving, and the positioning that makes your startup easier to explain.",
    updatedLabel: "March 2026",
    sections: [
      {
        heading: "What ICP Builder does",
        copy: "ICP Builder helps founders define the first customer segment they should target, the pain point that matters most, and the positioning that makes the product easier to sell.",
      },
      {
        heading: "Why founders use it",
        copy: "Most early-stage startups fail by targeting too many audiences at once. This tool narrows the market so your messaging, interviews, and MVP priorities become more specific.",
      },
      {
        heading: "What you get back",
        copy: "You get a clearer ideal customer profile, sharper positioning, and practical next steps for validation before you spend more time on the wrong audience.",
      },
    ],
  },
  {
    path: "/demo-studio",
    title: "Demo Studio for Startup Founders | Creatives Takeover",
    description:
      "Build an interactive product demo, record a founder VSL, and publish one proof page with signup capture.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Demo Studio for Startup Founders",
    heroCopy:
      "Turn a rough product idea into something people can actually see: a click-through demo, a founder pitch video, and a public launch page.",
    updatedLabel: "June 2026",
    sections: [
      {
        heading: "What Demo Studio is for",
        copy: "Demo Studio helps founders create the assets they need to show the product before the product is fully mature: an interactive demo and a VSL.",
      },
      {
        heading: "Why a demo matters",
        copy: "A demo gives people something concrete to react to. It is easier to validate interest when prospects can click through the experience and hear the founder explain the value.",
      },
      {
        heading: "What founders learn from it",
        copy: "You learn whether the walkthrough, pitch angle, and CTA are strong enough to earn attention and signups.",
      },
    ],
  },
  {
    path: "/decision-sprint",
    title: "Decision Sprint | Creatives Takeover",
    description:
      "Score startup ideas side by side, compare opportunity quality, and decide which concept deserves your next sprint.",
    changefreq: "weekly",
    priority: 0.65,
    heroHeading: "Pick the strongest idea",
    heroCopy:
      "Compare startup concepts against consistent criteria so you can focus on the idea with the best odds of traction.",
  },
  {
    path: "/validate",
    title: "Validate In 7 Days | Creatives Takeover",
    description:
      "Follow a structured founder validation journey to test demand, gather evidence, and move from assumptions to learning.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Validate in 7 days",
    heroCopy:
      "Follow a guided startup validation plan that helps you talk to users, collect signals, and make better founder decisions.",
  },
  {
    path: "/mvp-builder",
    title: "AI MVP Builder | Creatives Takeover",
    description:
      "Describe your product, generate a working MVP, and iterate with live preview and code updates inside an AI MVP builder.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Build your MVP with AI",
    heroCopy:
      "Turn a product idea into a working prototype with prompt-based generation, live preview, and iterative edits.",
  },
  {
    path: "/mvp-scope",
    title: "MVP Scope | Creatives Takeover",
    description:
      "Define MVP boundaries, cut unnecessary features, and leave with a clearer build scope for your first product version.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Scope the right first version",
    heroCopy:
      "Reduce complexity, identify must-have features, and leave with a tighter, more buildable MVP plan.",
  },
  {
    path: "/go-to-market",
    title: "Go-To-Market Strategy Generator | Creatives Takeover",
    description:
      "Generate a go-to-market strategy with channel recommendations, positioning, messaging, and a 30-day startup launch plan.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Plan how you will get customers",
    heroCopy:
      "Get channel recommendations, positioning, messaging, and launch priorities designed for early-stage execution.",
    updatedLabel: "March 2026",
    sections: [
      {
        heading: "What GTM Strategist does",
        copy: "GTM Strategist helps founders turn a product idea into a go-to-market plan with messaging, channels, launch tasks, and practical acquisition priorities.",
      },
      {
        heading: "When to use it",
        copy: "Use it when your offer is defined enough to launch but you still need a practical plan for who to reach, what to say, and which channels to prioritize first.",
      },
      {
        heading: "What the output includes",
        copy: "The output includes positioning, messaging, recommended channels, a 30-day action plan, and a launch checklist you can execute immediately.",
      },
    ],
  },
  {
    path: "/directories",
    title: "Startup Launch Directories | Creatives Takeover",
    description:
      "Find the best platforms to submit and promote your startup or product launch. Filterable directory of 30+ communities, aggregators, review sites, and more.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Startup Launch Directories",
    heroCopy:
      "Discover communities, launch platforms, and listing sites where founders can submit and promote new products.",
  },
  {
    path: "/traction-engine",
    title: "Traction Engine | Weekly Distribution & Retention Tracker | Creatives Takeover",
    description:
      "Log weekly distribution experiments, score retention by product category, and track Phase 7 fundraising readiness with a deterministic Traction Score.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Traction Engine",
    heroCopy:
      "Run focused weekly distribution sprints, measure retention, and see whether your channel is producing repeatable traction.",
    updatedLabel: "April 2026",
    sections: [
      {
        heading: "What Traction Engine measures",
        copy: "Traction Engine combines consistency, channel efficiency, experiment quality, and retention health into a single weekly Traction Score so founders know whether this week created repeatable traction.",
      },
      {
        heading: "Who should use it",
        copy: "It is built for early-stage founders running one or two distribution channels who want a structured weekly log instead of guessing whether their growth efforts are working.",
      },
      {
        heading: "What it unlocks",
        copy: "Three consecutive weeks at 75 or above flag Phase 7 readiness, which gives founders a defensible traction story before walking into investor conversations.",
      },
    ],
  },
  {
    path: "/insighta",
    title: "Fundraising Tools For Startups | Insighta | Creatives Takeover",
    description:
      "Explore fundraising tools for startups, including investor search, accelerator research, outreach templates, pitch deck analysis, and readiness assessment.",
    changefreq: "weekly",
    priority: 0.85,
    heroHeading: "Fundraising tools for founders",
    heroCopy:
      "Use Insighta to discover investors, research accelerators, prepare outreach, and tighten fundraising execution.",
  },
  {
    path: "/vc-search",
    title: "Venture Capital Database & VC Search | Creatives Takeover",
    description:
      "Search a venture capital database by stage, geography, sector, and check size to build a tighter startup investor list.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Venture Capital Search",
    heroCopy:
      "Search a venture capital database by stage, geography, sector, and check size so your investor list is tighter and more relevant.",
    updatedLabel: "March 2026",
    sections: [
      {
        heading: "What VC Search helps with",
        copy: "VC Search helps founders build a more relevant investor target list by filtering venture firms based on stage, geography, sector, and check size.",
      },
      {
        heading: "Why this matters for fundraising",
        copy: "A tighter investor list improves outreach quality. Instead of sending broad cold emails, founders can focus on firms that are more likely to match the startup's actual profile.",
      },
      {
        heading: "What founders get from it",
        copy: "You get a more focused venture capital shortlist, faster research, and better preparation for outreach, pitch refinement, and follow-up.",
      },
    ],
  },
  {
    path: "/email-templates",
    title: "Fundraising Email Templates | Creatives Takeover",
    description:
      "Use fundraising email templates for investor outreach, warm intros, follow-ups, and startup updates without starting from scratch.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Fundraising Email Templates",
    heroCopy:
      "Copy, customize, and send fundraising emails for intros, outreach, follow-ups, and investor updates.",
  },
  {
    path: "/accelerator-hunt",
    title: "Startup Accelerator Database | Creatives Takeover",
    description:
      "Search a startup accelerator database by location, focus area, and funding profile to shortlist the right programs faster.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Startup Accelerator Search",
    heroCopy:
      "Search accelerator programs by location, focus area, funding, and fit to build a stronger application list.",
  },
  {
    path: "/pitch-deck-analyzer",
    title: "Pitch Deck Analyzer & Score Tool | Creatives Takeover",
    description:
      "Upload a pitch deck, get a score, and review actionable feedback on narrative, clarity, traction, business model, and fundraising readiness.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Analyze your pitch deck",
    heroCopy:
      "Get structured feedback on presentation quality, narrative strength, investor clarity, and fundraising readiness.",
    updatedLabel: "March 2026",
    sections: [
      {
        heading: "What Pitch Deck Analyzer does",
        copy: "Pitch Deck Analyzer reviews a startup deck and scores narrative clarity, traction framing, business model communication, and overall fundraising readiness.",
      },
      {
        heading: "Who should use it",
        copy: "It is useful for founders preparing for angel, pre-seed, or seed conversations who want to know what is weak before sending the deck to investors.",
      },
      {
        heading: "What the analysis returns",
        copy: "The tool returns a score and concrete recommendations so you know what to improve in the story, market explanation, traction proof, and investor clarity.",
      },
    ],
  },
  {
    path: "/insighta-test",
    title: "Fundraising Readiness Assessment | Creatives Takeover",
    description:
      "Assess fundraising readiness, identify gaps, and see what your startup needs to improve before approaching investors.",
    changefreq: "weekly",
    priority: 0.65,
    heroHeading: "Fundraising Readiness Assessment",
    heroCopy:
      "Evaluate investor readiness and identify the gaps you need to fix before fundraising.",
    updatedLabel: "March 2026",
    sections: [
      {
        heading: "What the readiness assessment measures",
        copy: "The assessment helps founders evaluate how prepared they are for fundraising by reviewing evidence, narrative quality, traction, and investor expectations.",
      },
      {
        heading: "Why founders use it before outreach",
        copy: "It is easier to fix gaps before meetings begin than after investors start saying no. This assessment is meant to surface those gaps early.",
      },
      {
        heading: "What happens after the assessment",
        copy: "You get clearer priorities on what to improve next, which can include narrative work, traction proof, deck improvements, or better investor targeting.",
      },
    ],
  },
  {
    // The guided tour of the workspace. The route keeps the /demo path it has
    // always had, but the page is the Platform Tour and is named that way
    // everywhere in code so it is never read as Demo Studio, the separate
    // founder tool for building product demos.
    path: "/demo",
    title: "Platform Tour | Creatives Takeover",
    description:
      "Walk through the founder workspace with a sample project. See the seven stage cycle, the tools and the artifact each one produces. No signup, nothing saved.",
    ogImage: `${BASE_URL}/demo-page-metadata.png`,
    ogImageWidth: 3051,
    ogImageHeight: 1265,
    changefreq: "monthly",
    priority: 0.7,
    heroHeading: "Walk the founder workspace",
    heroCopy:
      "A guided tour of Creatives Takeover using a sample founder and a sample project. You can open every stage, read the artifacts the tools produce and see what the platform holds a founder to. Nothing is saved, and no account is created.",
    sections: [
      {
        heading: "What the tour shows",
        copy:
          "The tour opens on Pulse, the assistant that reasons about one project at a time, then steps through the Startup Development Cycle stage by stage. Each tool states what it produces and what has to be true before that output counts as finished. The ICP panel renders a complete worked example rather than a screenshot.",
      },
      {
        heading: "For universities and business schools",
        copy:
          "Every student has a stage, an artifact and a decision that can be read without collecting slide decks. The seven stage cycle maps onto a semester, and each tool produces a gradeable output with a written definition of done rather than a status update.",
      },
      {
        heading: "For accelerators and incubators",
        copy:
          "One stage model across a whole batch. You screen on artifacts instead of on pitch polish, and you can see which teams are stuck at which stage before demo day rather than after it.",
      },
      {
        heading: "For investors",
        copy:
          "What already exists before the first meeting: a committed buyer with an urgent pain and a named disqualifier, a published demand capture page with a measured response, and a build, narrow, pivot or stop decision backed by independent buyer signals and a documented objection.",
      },
    ],
    faqs: [
      {
        question: "Do I need an account to use the tour?",
        answer:
          "No. The tour is open to anyone with the link. It runs on a sample founder and a sample project, so there is nothing to sign in to and nothing you do there is saved.",
      },
      {
        question: "Can I build something during the tour?",
        answer:
          "No, and that is deliberate. You can see what every tool produces and what finishing it requires, but running a tool writes a saved result against a real project, so that needs a free account.",
      },
      {
        question: "How is this different from Demo Studio?",
        answer:
          "Demo Studio is a tool inside the platform that founders use to build and publish interactive demos of their own product. The Platform Tour is a walkthrough of Creatives Takeover itself for people evaluating it.",
      },
    ],
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Platform Tour", url: "/demo" },
    ],
    relatedLinks: [
      { href: "/pricing", label: "Pricing" },
      { href: "/bizmap-ai", label: "Startup Development Cycle" },
      { href: "/about", label: "About Creatives Takeover" },
    ],
  },
];
