export const BASE_URL = "https://creatives-takeover.com";
export const SITE_NAME = "Creatives Takeover";
export const OG_IMAGE = `${BASE_URL}/og-image.png`;

export const ROBOTS_DISALLOW = [
  "/admin/",
  "/auth/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/dashboard",
  "/account",
  "/messages",
  "/profile",
  "/setup-quiz",
  "/focus-funnel",
  "/core-metrics",
  "/weekly-mission",
  "/tasks",
  "/subscription-success",
  "/community/book/",
  "/community/my-bookings",
  "/community/admin/",
  "/community/co-founders/create",
  "/community/co-founders/edit/",
  "/community/angels/admin/",
  "/newspaper/admin/",
  "/stories/admin/",
  "/w/",
  "/api/",
  "/rag-test",
  "/test-phase1",
];

export const INDEXABLE_ROUTES = [
  {
    path: "/",
    title: "AI Startup Builder For Founders | Creatives Takeover",
    description:
      "Build, validate, and launch faster with AI startup tools for customer research, MVP planning, fundraising prep, and go-to-market execution.",
    changefreq: "daily",
    priority: 1.0,
    heroHeading: "Build your startup. Own your future.",
    heroCopy:
      "Creatives Takeover gives first-time founders practical AI tools, structured workflows, and founder resources to move from idea to launch.",
    sections: [
      {
        heading: "Validate before you build",
        copy: "Clarify the problem, define your ideal customer, and pressure-test demand before spending time on development.",
      },
      {
        heading: "Build with practical startup tools",
        copy: "Use founder workflows for MVP scoping, waitlist creation, pitch preparation, and go-to-market planning.",
      },
    ],
  },
  {
    path: "/about",
    title: "About Creatives Takeover",
    description:
      "Learn about Creatives Takeover, our mission to help founders go from idea to execution, and the tools we are building for startup operators.",
    changefreq: "monthly",
    priority: 0.7,
    heroHeading: "About Creatives Takeover",
    heroCopy:
      "We are building a founder-focused platform for startup validation, MVP planning, fundraising prep, and execution support.",
  },
  {
    path: "/pricing",
    title: "Pricing For AI Startup Tools | Creatives Takeover",
    description:
      "Compare pricing for Creatives Takeover's AI startup tools, founder workflows, fundraising resources, and MVP planning features.",
    changefreq: "weekly",
    priority: 0.9,
    heroHeading: "Choose your plan",
    heroCopy:
      "Compare free and paid plans for startup validation, AI builder tools, Insighta fundraising workflows, and community features.",
    sections: [
      {
        heading: "Plans for every founder stage",
        copy: "Start free, then upgrade when you need more credits, deeper tool access, and premium founder workflows.",
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
  {
    path: "/community",
    title: "Mentor Marketplace | Creatives Takeover",
    description:
      "Find startup mentors, book working sessions, and connect with experienced founders who can help you move from idea to execution.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Connect. Learn. Grow.",
    heroCopy:
      "Browse startup mentors, review expertise, and book practical sessions focused on execution, fundraising, product, and growth.",
  },
  {
    path: "/community/co-founders",
    title: "Find a Co-Founder | Creatives Takeover",
    description:
      "Meet potential startup co-founders, browse founder profiles, and discover collaborators across product, growth, design, and engineering.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Find the right co-founder",
    heroCopy:
      "Explore active founder profiles and startup ideas to find a collaborator who complements your skills and ambition.",
  },
  {
    path: "/community/angels",
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
    path: "/newspaper",
    title: "Newspaper | Creatives Takeover",
    description:
      "Read founder stories, startup lessons, fundraising insights, and practical articles for early-stage entrepreneurs.",
    changefreq: "daily",
    priority: 0.8,
    heroHeading: "Founder stories and startup insights",
    heroCopy:
      "Read articles, case studies, and lessons for founders building products, raising capital, and growing from zero.",
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
    title: "Ideal Customer Profile Builder | Creatives Takeover",
    description:
      "Define your ideal customer profile, sharpen positioning, and choose the customer segment your startup should target first.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Ideal Customer Profile Builder",
    heroCopy:
      "Define the customer segment you should target first, the pain worth solving, and the positioning that makes your startup easier to explain.",
  },
  {
    path: "/waitlist",
    title: "Startup Waitlist Page Builder | Creatives Takeover",
    description:
      "Build a startup waitlist page, capture early signups, and validate demand before spending time on development.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Startup Waitlist Page Builder",
    heroCopy:
      "Create a pre-launch page, explain your offer clearly, and collect real demand signals before you build the product.",
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
  },
  {
    path: "/directories",
    title: "Startup Launch Directories | Creatives Takeover",
    description:
      "Browse startup launch directories, communities, and listing platforms to promote your product and reach early users.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Startup Launch Directories",
    heroCopy:
      "Discover communities, launch platforms, and listing sites where founders can submit and promote new products.",
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
    path: "/insighta/vc-search",
    title: "Venture Capital Database & VC Search | Creatives Takeover",
    description:
      "Search a venture capital database by stage, geography, sector, and check size to build a tighter startup investor list.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Venture Capital Search",
    heroCopy:
      "Search a venture capital database by stage, geography, sector, and check size so your investor list is tighter and more relevant.",
  },
  {
    path: "/insighta/email-templates",
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
    path: "/insighta/accelerator-hunt",
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
    path: "/insighta/pitch-deck-analyzer",
    title: "Pitch Deck Analyzer & Score Tool | Creatives Takeover",
    description:
      "Upload a pitch deck, get a score, and review actionable feedback on narrative, clarity, traction, business model, and fundraising readiness.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Analyze your pitch deck",
    heroCopy:
      "Get structured feedback on presentation quality, narrative strength, investor clarity, and fundraising readiness.",
  },
  {
    path: "/insighta/test",
    title: "Fundraising Readiness Assessment | Creatives Takeover",
    description:
      "Assess fundraising readiness, identify gaps, and see what your startup needs to improve before approaching investors.",
    changefreq: "weekly",
    priority: 0.65,
    heroHeading: "Fundraising Readiness Assessment",
    heroCopy:
      "Evaluate investor readiness and identify the gaps you need to fix before fundraising.",
  },
  {
    path: "/demo",
    title: "Interactive Demo | Creatives Takeover",
    description:
      "Try Creatives Takeover features in an interactive demo covering startup planning, prompt workflows, fundraising tools, and community.",
    changefreq: "monthly",
    priority: 0.5,
    heroHeading: "Try the platform",
    heroCopy:
      "Explore an interactive walkthrough of key founder tools including BizMap AI, Prompt Library, Insighta, and Community.",
  },
  {
    path: "/creatives-takeover",
    title: "Creatives Takeover Studio",
    description:
      "Explore Creatives Takeover's creative studio page, services vision, and positioning around modern design and AI workflows.",
    changefreq: "monthly",
    priority: 0.45,
    heroHeading: "Creative strategy meets execution",
    heroCopy:
      "Explore the broader Creatives Takeover studio positioning around design systems, AI workflows, and creative execution.",
  },
];
