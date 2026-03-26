import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://creatives-takeover.com";
const OG_IMAGE = `${BASE_URL}/og-image.png`;
const DIST_DIR = path.resolve(process.cwd(), "dist");
const TEMPLATE_PATH = path.join(DIST_DIR, "index.html");

const ROUTES = [
  {
    route: "/",
    outputPath: "index.html",
    title: "Creatives Takeover",
    description:
      "Turn your creative idea into a real business. Get AI-powered planning, community support, and funding resources designed for creative entrepreneurs. Start building today.",
    canonical: `${BASE_URL}/`,
    fallbackHtml: `
      <header>
        <p>Creatives Takeover</p>
        <nav aria-label="Primary pages">
          <a href="/">Home</a> |
          <a href="/pricing">Pricing</a> |
          <a href="/community">Community</a> |
          <a href="/resources">Resources</a> |
          <a href="/newspaper">Newspaper</a>
        </nav>
      </header>
      <article>
        <section>
          <h1>Build Your Startup. Own Your Future.</h1>
          <p>Accelerators reject 98% of applicants. Consultants charge £10k for a PowerPoint. We said enough. Creatives Takeover hands first-time founders the system, the tools, and the network that used to be reserved for the well-connected. No cohort, no gatekeepers, no BS.</p>
        </section>
        <section>
          <h2>Every Founder&apos;s Journey is Unique</h2>
          <p>But some challenges are universal. Here, we highlight some of the most common obstacles founders face and how we assist to overcome them.</p>
        </section>
        <section>
          <h2>Startup Development Cycle</h2>
          <p>The Startup Development Cycle is a step-by-step roadmap designed by Creatives Takeover to guide founders from shaping an idea to building, launching, and growing a startup.</p>
        </section>
        <section>
          <h2>The Future of Work Is Here</h2>
          <p>Technology is enabling small teams to build exceptional products and business models that can successfully compete with large enterprises.</p>
        </section>
        <section>
          <h2>Creatives Takeover in a Nutshell</h2>
          <p>Everything you need, all in one place. Built on six core pillars to help solofounders validate, build, and grow a business from scratch.</p>
          <ul>
            <li>Build Your Product &amp; Validate Demand</li>
            <li>A founder-focused social network</li>
            <li>Access to VCs and Accelerators</li>
            <li>Mentorship and Angel Investor Network</li>
            <li>Success Stories + Prompt Library</li>
            <li>Customize your Experience</li>
          </ul>
        </section>
        <section>
          <h2>FAQs</h2>
          <p>Everything you need to know about Creatives Takeover.</p>
        </section>
      </article>`,
  },
  {
    route: "/pricing",
    outputPath: "pricing/index.html",
    title: "Pricing | Creatives Takeover",
    description:
      "Flexible AI solopreneur pricing plans for creative professionals. Choose from Rookie, Rising, or Pro plans with AI-powered tools and startup execution support.",
    canonical: `${BASE_URL}/pricing`,
    fallbackHtml: `
      <header>
        <p>Creatives Takeover</p>
        <nav aria-label="Primary pages">
          <a href="/">Home</a> |
          <a href="/pricing">Pricing</a> |
          <a href="/community">Community</a> |
          <a href="/resources">Resources</a>
        </nav>
      </header>
      <article>
        <section>
          <h1>Choose Your Plan</h1>
          <p>Start taking action and move your ideas forward with plans that scale as you do.</p>
        </section>
        <section>
          <h2>Rookie</h2>
          <p>Free. Start your journey and validate your idea.</p>
          <ul>
            <li>25 credits per month</li>
            <li>Dashboard: Focus Funnel, Core Metrics, Weekly Mission</li>
            <li>BizMap AI: 25 messages per month</li>
            <li>PMF Lab: read-only</li>
            <li>Prompt Library: limited access</li>
          </ul>
        </section>
        <section>
          <h2>Rising</h2>
          <p>$32.99/month or $300/year. Build your startup with AI-powered tools.</p>
          <ul>
            <li>100 credits per month</li>
            <li>Full Dashboard access</li>
            <li>BizMap AI: ICP Builder, PMF Lab, MVP Builder, Business Planner, Tech Stack Builder</li>
            <li>Insighta: VC Search, Email Templates, Pitch Deck Analyzer, Insighta Test</li>
            <li>Community: Find a Mentor, Find a Co-Founder</li>
          </ul>
        </section>
        <section>
          <h2>Pro</h2>
          <p>$74.99/month or $750/year. Scale with unlimited access and premium features.</p>
          <ul>
            <li>300 credits per month</li>
            <li>Full Dashboard access</li>
            <li>BizMap AI: All tools including GTM Strategist</li>
            <li>Insighta: Unlimited VC Search, Accelerator Hunt, Email Templates, Pitch Deck Analyzer, Insighta Test</li>
            <li>Community: Find a Mentor, Find a Co-Founder, Find your Angel</li>
          </ul>
        </section>
        <section>
          <h2>Pricing FAQs</h2>
          <p>Compare plans and choose the level of guidance, credits, and community access that fits your stage.</p>
        </section>
      </article>`,
  },
  {
    route: "/community",
    outputPath: "community/index.html",
    title: "Mentor Marketplace | Find Your Startup Mentor",
    description:
      "Connect with experienced founders and mentors who can guide you through startup execution. Book 1-on-1 sessions with proven entrepreneurs.",
    canonical: `${BASE_URL}/community`,
    fallbackHtml: `
      <header>
        <p>Creatives Takeover</p>
        <nav aria-label="Primary pages">
          <a href="/">Home</a> |
          <a href="/pricing">Pricing</a> |
          <a href="/community">Community</a> |
          <a href="/resources">Resources</a>
        </nav>
      </header>
      <article>
        <section>
          <h1>Connect. Learn. Grow.</h1>
          <p>Connect with experienced founders and mentors who can guide you through startup execution. Book 1-on-1 sessions with proven entrepreneurs.</p>
        </section>
        <section>
          <h2>Startup experts</h2>
          <p>Talk with advisors who have already shipped, raised, or coached at the earliest stages.</p>
        </section>
        <section>
          <h2>1:1 working sessions</h2>
          <p>Use each call to get closer to your business goals, not just generic advice.</p>
        </section>
        <section>
          <h2>Concrete next steps</h2>
          <p>Leave with top priorities, founder-specific feedback, and a clear execution plan.</p>
        </section>
        <section>
          <h2>Mentor marketplace</h2>
          <p>Browse mentors by expertise, coaching format, time zone, and search to find the right working session for your current stage.</p>
        </section>
      </article>`,
  },
  {
    route: "/resources",
    outputPath: "resources/index.html",
    title: "Free Creative Resources | Tutorials, Guides & Downloads",
    description:
      "Access free creative resources including tutorials, design guides, templates, and downloads. Learn creative skills with our comprehensive resource library.",
    canonical: `${BASE_URL}/resources`,
    fallbackHtml: `
      <header>
        <p>Creatives Takeover</p>
        <nav aria-label="Primary pages">
          <a href="/">Home</a> |
          <a href="/pricing">Pricing</a> |
          <a href="/community">Community</a> |
          <a href="/resources">Resources</a>
        </nav>
      </header>
      <article>
        <section>
          <h1>Creative Resources For Every Creator</h1>
          <p>Access our comprehensive library of free creative resources, including tutorials, design guides, templates, and downloads to enhance your creative skills.</p>
        </section>
        <section>
          <h2>Learn Creative Skills with Expert Tutorials</h2>
          <p>Explore free tutorials covering AI tools for designers, typography, color theory, photo editing, digital illustration, and brand identity design.</p>
        </section>
        <section>
          <h2>Comprehensive Creative Learning Guides</h2>
          <p>Study practical guides for beginners, professionals, and teams, including workflow optimization, portfolio creation, branding, and freelancing.</p>
        </section>
        <section>
          <h2>Premium Creative Downloads</h2>
          <p>Access design templates, stock images, font collections, UI kits, and other downloadable assets for creative work.</p>
        </section>
      </article>`,
  },
];

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
  let html = template;
  html = replaceTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${routeConfig.title}</title>`);
  html = replaceMetaByName(html, "description", routeConfig.description);
  html = replaceMetaByProperty(html, "og:title", routeConfig.title);
  html = replaceMetaByProperty(html, "og:description", routeConfig.description);
  html = replaceMetaByProperty(html, "og:image", OG_IMAGE);
  html = replaceMetaByName(html, "twitter:title", routeConfig.title);
  html = replaceMetaByName(html, "twitter:description", routeConfig.description);
  html = replaceMetaByName(html, "twitter:image", OG_IMAGE);
  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${routeConfig.canonical}" />`
  );
  html = replaceTag(
    html,
    /<main id="seo-fallback">[\s\S]*?<\/main>/i,
    `<main id="seo-fallback">\n${routeConfig.fallbackHtml}\n    </main>`
  );
  return html;
}

async function writeRoute(template, routeConfig) {
  const html = renderRoute(template, routeConfig);
  const outputFile = path.join(DIST_DIR, routeConfig.outputPath);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, html, "utf8");
}

async function main() {
  const template = await fs.readFile(TEMPLATE_PATH, "utf8");
  await Promise.all(ROUTES.map((routeConfig) => writeRoute(template, routeConfig)));
  console.log(`Prerendered ${ROUTES.length} public route shells with route-specific metadata.`);
}

main().catch((error) => {
  console.error("Failed to generate prerendered public pages.", error);
  process.exitCode = 1;
});
