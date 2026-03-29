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
    title: "Creatives Takeover | AI Startup Builder For Founders",
    description:
      "Build, validate, and launch your startup with AI-powered tools for founder planning, MVP scoping, fundraising prep, and go-to-market execution.",
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
    title: "Pricing | Creatives Takeover",
    description:
      "Compare Creatives Takeover pricing plans for AI founder tools, startup workflows, fundraising resources, and community access.",
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
    title: "BizMap AI | Creatives Takeover",
    description:
      "Use BizMap AI to turn a startup idea into a structured execution plan across validation, building, and launch stages.",
    changefreq: "weekly",
    priority: 0.9,
    heroHeading: "Your AI startup co-founder",
    heroCopy:
      "BizMap AI helps founders move from scattered thinking to structured execution with stage-based workflows and practical tools.",
  },
  {
    path: "/pmf-lab",
    title: "PMF Lab | Creatives Takeover",
    description:
      "Analyze customer evidence, score product-market fit readiness, and identify what still needs validation before building.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Measure product-market fit readiness",
    heroCopy:
      "Submit validation evidence, review your readiness score, and see what still needs work before committing to an MVP.",
  },
  {
    path: "/tech-stack",
    title: "Tech Stack Builder | Creatives Takeover",
    description:
      "Compare frameworks, platforms, and startup tooling to choose the right tech stack for your product and budget.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Choose a practical tech stack",
    heroCopy:
      "Get guidance on tools, frameworks, and platforms that match your startup's stage, goals, and constraints.",
  },
  {
    path: "/icp-builder",
    title: "ICP Builder | Creatives Takeover",
    description:
      "Define your ideal customer profile, sharpen positioning, and get clearer on who you should target first.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Define your ideal customer",
    heroCopy:
      "Clarify your target market, pain points, buying triggers, and founder positioning before you build or launch.",
  },
  {
    path: "/waitlist",
    title: "Waitlist Maker | Creatives Takeover",
    description:
      "Create a startup waitlist page, validate demand, and collect early signups before building the full product.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Launch a waitlist before you build",
    heroCopy:
      "Create a landing page, capture real demand, and gather early traction signals before writing production code.",
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
    title: "MVP Builder | Creatives Takeover",
    description:
      "Describe your product, generate a working MVP, and iterate with live preview and code updates inside the builder.",
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
    title: "GTM Strategist | Creatives Takeover",
    description:
      "Generate go-to-market strategy, messaging, channels, and a 30-day action plan tailored to your startup.",
    changefreq: "weekly",
    priority: 0.8,
    heroHeading: "Plan how you will get customers",
    heroCopy:
      "Get channel recommendations, positioning, messaging, and launch priorities designed for early-stage execution.",
  },
  {
    path: "/directories",
    title: "Launch Directories | Creatives Takeover",
    description:
      "Browse startup launch directories, communities, review sites, and listing platforms to promote your product launch.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Find places to launch",
    heroCopy:
      "Discover communities, aggregators, and launch platforms where founders can submit and promote new products.",
  },
  {
    path: "/insighta",
    title: "Insighta | Creatives Takeover",
    description:
      "Explore fundraising tools, investor discovery resources, accelerator research, and founder outreach workflows in Insighta.",
    changefreq: "weekly",
    priority: 0.85,
    heroHeading: "Fundraising tools for founders",
    heroCopy:
      "Use Insighta to discover investors, research accelerators, prepare outreach, and tighten fundraising execution.",
  },
  {
    path: "/insighta/vc-search",
    title: "VC Search | Creatives Takeover",
    description:
      "Search venture capital firms by stage, check size, geography, and industry to build a stronger investor list.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Search venture capital firms",
    heroCopy:
      "Filter investor profiles by stage, industry, and location so your outreach list is tighter and more relevant.",
  },
  {
    path: "/insighta/email-templates",
    title: "Fundraising Email Templates | Creatives Takeover",
    description:
      "Use ready-to-customize fundraising email templates for investor outreach, follow-ups, intros, and updates.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Fundraising emails you can actually send",
    heroCopy:
      "Use templates for cold outreach, warm intros, investor updates, and follow-ups without starting from a blank page.",
  },
  {
    path: "/insighta/accelerator-hunt",
    title: "Accelerator Hunt | Creatives Takeover",
    description:
      "Find startup accelerators by location, focus, funding, and fit so you can shortlist the right programs faster.",
    changefreq: "weekly",
    priority: 0.7,
    heroHeading: "Find accelerators that fit",
    heroCopy:
      "Search startup accelerators by geography, focus area, and funding profile to build a more relevant application list.",
  },
  {
    path: "/insighta/pitch-deck-analyzer",
    title: "Pitch Deck Analyzer | Creatives Takeover",
    description:
      "Upload a pitch deck, score it, and get actionable feedback on story, clarity, traction, business model, and fundraising readiness.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Analyze your pitch deck",
    heroCopy:
      "Get structured feedback on presentation quality, narrative strength, investor clarity, and fundraising readiness.",
  },
  {
    path: "/insighta/test",
    title: "Fundraising Readiness Test | Creatives Takeover",
    description:
      "Assess fundraising readiness, spot gaps, and understand what to improve before approaching investors.",
    changefreq: "weekly",
    priority: 0.65,
    heroHeading: "Measure fundraising readiness",
    heroCopy:
      "Use a structured self-assessment to identify what is missing before you start investor outreach.",
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
