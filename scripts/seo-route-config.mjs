// Node 22.18+ strips TypeScript types natively, so the build scripts can import
// the app's founder-answer content directly. Single source of truth: the same
// data renders the React pages (FounderAnswerPage.tsx) and the prerendered HTML.
import {
  founderAnswerPages,
  getRelatedFounderAnswerPages,
} from "../src/data/founderAnswerPages.ts";
import { getFounderAnswerEvidence } from "../src/data/founderAnswerEvidence.ts";
import { PRICING_FAQS } from "../src/config/pricingFaq.ts";
import { PLAN_PRICING } from "../src/config/pricing.ts";
import { SITE_IDENTITY } from "../src/config/siteIdentity.ts";
import { PLATFORM_FAQS } from "../src/config/platformFaq.ts";

export const BASE_URL = SITE_IDENTITY.baseUrl;
export const SITE_NAME = SITE_IDENTITY.name;
export const OG_IMAGE = `${BASE_URL}/og-image.png`;

// Mirror updatedLabelToIso in src/pages/FounderAnswerPage.tsx ("May 2026" -> "2026-05-01").
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

// Each answer route carries the page's real, hand-written meta and body content
// so the prerendered HTML is unique per page and matches the hydrated React page.
const FOUNDER_ANSWER_ROUTES = founderAnswerPages.map((page) => {
  const evidence = getFounderAnswerEvidence(page.cluster);
  return {
    path: `/answers/${page.slug}`,
    title: page.metaTitle,
    description: page.metaDescription.trim(),
    changefreq: "monthly",
    priority: 0.65,
    lastmod: updatedLabelToIso(page.updatedLabel),
    heroHeading: page.title,
    heroCopy: page.summary,
    updatedLabel: page.updatedLabel,
    keyword: page.keyword,
    quickAnswer: {
      title: page.keyword,
      items: page.quickAnswerItems,
    },
    sections: [
      ...page.sections.map((section) => ({
        heading: section.title,
        copy: section.description,
      })),
      {
        heading: evidence.heading,
        copy: evidence.introduction,
      },
      {
        heading: "Evidence checks and next actions",
        copy: evidence.checks
          .map((check) => `${check.signal}: ${check.evidence} Next action: ${check.nextAction}`)
          .join(" "),
      },
      {
        heading: evidence.exampleTitle,
        copy: evidence.example,
      },
      {
        heading: "Common false positives to avoid",
        copy: evidence.failureModes.join(" "),
      },
    ],
    checklist: page.checklist,
    cta: page.cta,
    faqs: page.faqs,
    sources: evidence.sources,
    relatedLinks: [
      ...getRelatedFounderAnswerPages(page).map((related) => ({
        href: `/answers/${related.slug}`,
        label: related.title,
      })),
      { href: "/answers", label: "Founder Answer Library" },
    ],
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Founder Answer Library", url: "/answers" },
      { name: page.title, url: `/answers/${page.slug}` },
    ],
  };
});

export const INDEXABLE_ROUTES = [
  {
    path: "/",
    title: "The Founders Compass | Creatives Takeover",
    description:
      "Turn your idea into a validated startup through one evidence backed path for customer clarity, proof, PMF decisions, MVP building, GTM, and traction.",
    changefreq: "daily",
    priority: 1.0,
    heroHeading: "The Founders' Compass",
    heroCopy:
      "Define your ideal customer, prove demand, build your MVP, launch it, and find investment.",
    sections: [
      {
        heading: "Define the first customer before choosing features",
        copy: "Use ICP Builder to name one reachable customer, the painful situation they face, the workaround they use today, the outcome they want, and the trigger that makes the problem urgent. The output becomes the shared customer decision used by later validation, product, and launch work.",
      },
      {
        heading: "Prove demand before committing to a build",
        copy: "Turn assumptions into interview prompts, a focused demo or waitlist, and measurable evidence. PMF Lab helps separate polite interest from repeated pain, behavioral commitment, willingness to pay, and retention signals so the next decision is based on observed behavior rather than enthusiasm alone.",
      },
      {
        heading: "Scope and build the smallest useful MVP",
        copy: "Carry validated customer evidence into MVP Scope, Tech Stack Builder, and MVP Builder. Define one primary flow, one measurable outcome, explicit exclusions, and the events needed to observe activation and retained use before adding automation, secondary personas, or hypothetical scale requirements.",
      },
      {
        heading: "Launch through a measurable go-to-market system",
        copy: "GTM Strategist connects the chosen customer and promise to a first channel, launch assets, outreach, and a 30-day execution plan. Directories and email workflows support distribution, while source and activation tracking show which channel produces qualified behavior instead of temporary traffic.",
      },
      {
        heading: "Track traction with the evidence behind it",
        copy: "Traction Engine records distribution experiments, activation, retention, and the next weekly decision. The goal is not a decorative score: it is a traceable operating record showing what was tried, which cohort responded, what changed, and whether the result is strong enough to repeat.",
      },
      {
        heading: "Prepare for fundraising only when the company is ready",
        copy: "Insighta combines readiness assessment, investor and accelerator research, outreach templates, and pitch analysis. Founders can connect the customer, market, product, traction, business model, and use of funds into one evidence-backed narrative before asking relevant investors for a conversation.",
      },
      {
        heading: "Reach a useful result before creating an account",
        copy: "A visitor can launch a personalized live demo or draft an evidence-backed customer decision before signup. The lowest-friction starting point depends on the current uncertainty: define the customer, demonstrate the promise, or read a direct founder answer and continue into its linked tool.",
      },
    ],
  },
  {
    path: "/about",
    title: "About Creatives Takeover | The Founders' Compass",
    description:
      "Meet the team building Creatives Takeover, an AI-powered startup development platform that helps first-time founders move from idea to execution.",
    changefreq: "monthly",
    priority: 0.7,
    heroHeading: "About Creatives Takeover",
    heroCopy:
      "We are building a founder-focused platform for startup validation, MVP planning, fundraising prep, and execution support.",
  },
  {
    path: "/pricing",
    title: "Founder Outcomes and Pricing | Creatives Takeover",
    description:
      "Compare Rookie, Starter, Rising, and Pro by the founder outcome each plan enables, from customer clarity to expert backed fundraising.",
    changefreq: "weekly",
    priority: 0.9,
    heroHeading: "Choose the outcome you need now",
    heroCopy:
      "Every plan keeps your evidence and decisions connected as you move from clarity to validation, launch, traction, and fundraising.",
    sections: [
      {
        heading: "Transparent credits and stable entitlements",
        copy: "See the credit cost before every metered action and upgrade only when you need more capacity, expert accountability, or deeper fundraising support.",
      },
    ],
    faqs: PRICING_FAQS.map(({ question, answer }) => ({ question, answer })),
    breadcrumb: [
      { name: "Home", url: "/" },
      { name: "Pricing", url: "/pricing" },
    ],
  },
  {
    path: "/resources",
    title: "Startup Resources for First-Time Founders | Creatives Takeover",
    description:
      "Use 25 practical startup guides, evidence checklists, and connected tools for customer clarity, validation, MVP building, launch, and fundraising preparation.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Founder resources and guides",
    heroCopy:
      "Start with the question blocking progress. Each guide gives a direct answer, evidence standard, worked example, checklist, primary references, and a connected tool.",
  },
  {
    path: "/answers",
    title: "Founder Answer Library | Creatives Takeover",
    description:
      "Searchable startup guides for founders defining an ICP, validating demand, planning an MVP, launching, and preparing for fundraising.",
    changefreq: "weekly",
    priority: 0.85,
    heroHeading: "Answers founders search for before they build",
    heroCopy:
      "Browse practical startup guides for ICP clarity, validation, MVP scope, go-to-market strategy, and fundraising preparation.",
  },
  ...FOUNDER_ANSWER_ROUTES,
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
    faqs: PLATFORM_FAQS,
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
  },
  {
    path: "/co-founder",
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
    path: "/newspaper",
    title: "Startup Newspaper for Founders | Creatives Takeover",
    description:
      "Read evidence-led startup guides on customer discovery, validation, MVP building, go-to-market execution, traction, and fundraising for first-time founders.",
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
    faqs: [
      {
        question: "What does BizMap AI help founders do?",
        answer: "BizMap AI helps founders validate a startup idea, define an ideal customer, scope an MVP, test demand, and prepare for launch inside one connected workflow.",
      },
      {
        question: "Is BizMap AI better for new ideas or existing startups?",
        answer: "It is strongest for early-stage ideas and pre-launch startups, but founders with an existing product can still use it to tighten positioning, validation, and launch planning.",
      },
      {
        question: "What happens after idea validation in BizMap AI?",
        answer: "After validation, the workflow moves into customer targeting, product-market fit review, MVP planning, demand testing, and go-to-market execution so you do not restart from scratch at each step.",
      },
    ],
    faqs: [
      {
        question: "What is Creatives Takeover?",
        answer: SITE_IDENTITY.description,
      },
      {
        question: "Who is Creatives Takeover built for?",
        answer: "Creatives Takeover is built for first-time founders, solo founders, indie hackers, and early-stage teams that need a structured path from customer clarity to launch and traction.",
      },
      {
        question: "Can founders start for free?",
        answer: `Yes. The Rookie plan costs $${PLAN_PRICING.rookie.monthly} per month, requires no credit card, and includes the free ICP Builder plus monthly credits for selected AI workflows.`,
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
    faqs: [
      {
        question: "What is a good product-market fit score?",
        answer: "A higher score means your startup has stronger evidence of demand, recurring pain, and momentum. In this tool, a score of 75 or above is treated as a stronger signal that you can move into building.",
      },
      {
        question: "Can PMF Lab replace customer interviews?",
        answer: "No. PMF Lab works best when you bring real customer interviews, waitlist data, or traction evidence into the assessment. It helps interpret evidence, not invent it.",
      },
      {
        question: "Should founders use PMF Lab before building an MVP?",
        answer: "Yes. The main use case is checking whether you have enough validation evidence to justify an MVP build instead of relying on assumptions.",
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
    title: "Ideal Customer Profile Builder | Creatives Takeover",
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
    faqs: [
      {
        question: "What is an ideal customer profile for a startup?",
        answer: "An ideal customer profile is the specific type of customer most likely to need your product, feel the pain strongly, and adopt early. It is more precise than a broad persona or market category.",
      },
      {
        question: "Why does ICP definition matter before building?",
        answer: "It affects product scope, messaging, interviews, and customer acquisition. If the ICP is vague, the rest of the startup plan becomes vague too.",
      },
      {
        question: "Can ICP Builder help with positioning?",
        answer: "Yes. The tool is designed to connect customer targeting with pain point clarity and positioning so you can explain the product more clearly.",
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
    faqs: [
      {
        question: "What can founders build in Demo Studio?",
        answer: "Founders can build a clickable product demo, save up to three VSL pitch variations, and publish a launch page that combines the demo, video, and signup form.",
      },
      {
        question: "Does Demo Studio replace a waitlist page?",
        answer: "Yes. The launch page still captures signups, but it is backed by an interactive demo and founder pitch so visitors have something real to evaluate.",
      },
      {
        question: "Why record multiple VSL variations?",
        answer: "Different hooks and CTAs can change conversion. Demo Studio stores up to three variations so founders can compare the pitch angles that earn the most signups.",
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
    faqs: [
      {
        question: "What is a go-to-market strategy for an early-stage startup?",
        answer: "A go-to-market strategy is the practical plan for reaching the right customers, explaining the offer clearly, choosing channels, and turning launch activity into early traction.",
      },
      {
        question: "Does GTM Strategist recommend startup acquisition channels?",
        answer: "Yes. It is designed to recommend channels based on your product, audience, and stage so you can focus on the tactics most likely to work first.",
      },
      {
        question: "Can founders use GTM Strategist before launch?",
        answer: "Yes. Pre-launch and first-launch planning are core use cases because the tool helps structure outreach, messaging, and execution before you waste effort on scattered tactics.",
      },
    ],
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
    path: "/traction-engine",
    title: "Traction Engine | Distribution and Retention Tracker",
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
    faqs: [
      {
        question: "How does Traction Engine score traction?",
        answer: "It blends four equally weighted dimensions: consistency streak, channel efficiency, experiment quality, and retention health, benchmarked by product category.",
      },
      {
        question: "Why only two active channels at a time?",
        answer: "Early-stage founders win by going deep on a small number of channels. Traction Engine enforces a maximum of two active channel sprints to protect focus.",
      },
      {
        question: "What is Phase 7 readiness?",
        answer: "Phase 7 readiness is the signal that your traction is strong and repeatable enough to bring into a fundraising conversation, defined as three consecutive weeks at a Traction Score of 75 or higher.",
      },
    ],
  },
  {
    path: "/insighta",
    title: "Startup Fundraising Tools | Insighta | Creatives Takeover",
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
    faqs: [
      {
        question: "What is a venture capital database used for?",
        answer: "A venture capital database is used to research investors, shortlist relevant firms, and avoid wasting time pitching funds that do not match your stage, sector, or geography.",
      },
      {
        question: "How do founders build a better investor list?",
        answer: "The main improvement comes from filtering by stage, check size, geography, and sector so your list reflects actual fit rather than a random collection of VC names.",
      },
      {
        question: "Should founders research investors before outreach?",
        answer: "Yes. Better research improves targeting, messaging, and response quality, which makes outreach more efficient and credible.",
      },
    ],
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
    faqs: [
      {
        question: "What makes a pitch deck investor-ready?",
        answer: "An investor-ready deck usually explains the problem, market, solution, traction, business model, and fundraising story clearly enough that an investor can quickly understand the opportunity.",
      },
      {
        question: "Can a pitch deck analyzer improve fundraising odds?",
        answer: "It can improve the quality of the deck by surfacing weak sections and unclear messaging, which makes founder preparation and investor conversations stronger.",
      },
      {
        question: "What should founders fix first in a weak deck?",
        answer: "Usually the biggest gains come from clarifying the story, tightening the market and traction slides, and making the business model easier to understand.",
      },
    ],
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
    faqs: [
      {
        question: "What is fundraising readiness?",
        answer: "Fundraising readiness is how prepared your startup is to present a credible opportunity to investors, including story clarity, traction evidence, market understanding, and overall preparedness.",
      },
      {
        question: "Should founders assess readiness before contacting investors?",
        answer: "Yes. A readiness check helps you catch obvious gaps before you start outreach, which can improve both the deck and the fundraising narrative.",
      },
      {
        question: "What if the readiness score is low?",
        answer: "A low score usually means the startup should strengthen proof, messaging, or investor materials before pushing harder on fundraising conversations.",
      },
    ],
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
];

// Public React routes can contain substantial content that a non-JavaScript
// retriever never sees. These route-specific summaries keep the HTTP response
// useful on its own and give hubs real contextual links instead of a generic
// pricing/newspaper/community footer.
const STATIC_ROUTE_ENHANCEMENTS = {
  "/about": {
    sections: [
      { heading: "What Creatives Takeover does", copy: SITE_IDENTITY.description },
      { heading: "Who the platform serves", copy: "The platform is designed for first-time and solo founders who need a practical sequence for validating a problem, choosing a customer, building a focused product, launching, and preparing for investment. It also supports indie hackers, consultants, educators, and small founder teams creating a new product or business from scratch." },
      { heading: "Why it is called The Founders' Compass", copy: "A compass does not build the company for the founder. It helps identify the next direction when several plausible tasks compete for attention. Creatives Takeover organizes the journey around decisions and evidence so the founder can choose a useful next move without pretending uncertainty has disappeared." },
      { heading: "How the system is different", copy: "Founder decisions remain connected across tools, so customer evidence, product scope, launch assets, and traction signals can carry forward instead of being recreated in separate prompt sessions. The goal is a continuous operating record from first customer hypothesis to a product, distribution system, and credible fundraising narrative." },
      { heading: "Evidence before automation", copy: "The product emphasizes observed customer language, behavioral commitment, activation, retention, and sourced claims before a founder scales a workflow. AI helps structure research and execution, but each guide and tool is designed to make the assumption, evidence threshold, and next decision visible to the user." },
      { heading: "Content and product work together", copy: "The Founder Answer Library explains the framework, cites primary references, and shows worked examples. Connected tools turn that answer into an ICP, validation plan, MVP scope, go-to-market workflow, traction record, investor shortlist, or pitch review without asking the founder to rebuild the underlying context." },
      { heading: "Who is building it", copy: `${SITE_IDENTITY.founder.name}, Founder and CEO, leads a small team spanning product engineering, growth, business development, and founder support. The public About page identifies the team, while the Organization and Person structured data connect the company, founder, canonical website, and external profiles for search and answer engines.` },
    ],
    relatedLinks: [
      { href: "/startup-guide", label: "Read the first-time founder guide" },
      { href: "/answers", label: "Browse founder answers" },
      { href: "/pricing", label: "Compare plans and outcomes" },
    ],
  },
  "/resources": {
    sections: [
      { heading: "Customer clarity resources", copy: "Start with five guides covering ideal customer definition, target-audience research, positioning, and customer interviews. Each page explains which observed customer behaviors count as evidence and connects the framework to ICP Builder when a founder is ready to draft the decision." },
      { heading: "Validation resources", copy: "Use five guides to compare waitlists and MVPs, test whether an idea is worth building, prepare PMF questions, and distinguish compliments from commitment. Worked examples show how a smaller set of qualified actions can outweigh a larger vanity audience." },
      { heading: "MVP building resources", copy: "Build resources connect scope, feature prioritization, no-code versus code, and stack selection to the risky assumption the product must test. The guides emphasize one measurable outcome, a real feedback loop, and a documented operating limit before automation." },
      { heading: "Launch and go-to-market resources", copy: "Launch guides cover first users, Product Hunt preparation, cold outreach, channel choice, and measurement. They connect audience, promise, source, activation, and retained use so founders can judge distribution by qualified behavior rather than impressions alone." },
      { heading: "Fundraising preparation resources", copy: "Fundraising guides explain pitch structure, investor fit, seed-stage expectations, accelerator alternatives, and outreach preparation. They show how to source market claims, label projections, separate types of traction, and map the raise to a specific operating milestone." },
      { heading: "Primary references and visible evidence standards", copy: "Founder answers link to primary materials from Strategyzer, Stripe Atlas, Product Hunt, Google, and Y Combinator. Each answer also exposes the evidence checks, next actions, failure modes, and worked example in both the rendered page and the non-JavaScript response." },
      { heading: "Move from an answer into a connected action", copy: "The resource library is part of the product journey, not a detached blog. Continue into ICP Builder, Demo Studio, PMF Lab, MVP Builder, GTM Strategist, Traction Engine, or Insighta using the customer and evidence decisions made in the guide." },
    ],
    relatedLinks: [
      ...founderAnswerPages.map((page) => ({ href: `/answers/${page.slug}`, label: page.title })),
      { href: "/answers", label: "Search the Founder Answer Library" },
      { href: "/startup-guide", label: "How to Build a Startup" },
      { href: "/icp-builder", label: "Free ICP Builder" },
    ],
  },
  "/answers": {
    sections: [
      { heading: "Customer clarity", copy: "Define an ideal customer, target audience, urgent problem, and positioning before investing in a broad market or an unfocused product." },
      { heading: "Validation and product decisions", copy: "Use interviews, waitlists, demand evidence, PMF surveys, and prioritization frameworks to decide whether and what to build." },
      { heading: "Launch, traction, and fundraising", copy: "Plan the first acquisition channel, find early users, prepare launch assets, build an investor shortlist, and improve the pitch narrative." },
    ],
    relatedLinks: founderAnswerPages.map((page) => ({
      href: `/answers/${page.slug}`,
      label: page.title,
    })),
  },
  "/mentorship": {
    sections: [
      { heading: "Find relevant startup experience", copy: "Review mentor expertise across product, fundraising, growth, engineering, operations, and founder leadership before requesting a practical working session." },
      { heading: "Book around a concrete outcome", copy: "Use mentoring for a defined decision such as narrowing an ICP, reviewing an MVP, improving a pitch, choosing a channel, or removing an execution blocker." },
      { heading: "Keep advice connected to execution", copy: "Bring current evidence and platform outputs into the conversation, then carry agreed actions back into the founder journey instead of treating mentorship as a disconnected call." },
    ],
    relatedLinks: [
      { href: "/mentorship/progress", label: "Track mentorship progress" },
      { href: "/co-founder", label: "Find a co-founder" },
      { href: "/answers", label: "Prepare with founder guides" },
    ],
  },
  "/co-founder": {
    sections: [
      { heading: "Search for complementary skills", copy: "Compare founder profiles by product, engineering, growth, sales, design, industry experience, location, and the type of company they want to build." },
      { heading: "Evaluate working fit before equity", copy: "Discuss time commitment, decision-making, values, risk tolerance, responsibilities, and a short trial project before making a long-term co-founder commitment." },
      { heading: "Bring a clearer startup brief", copy: "A specific customer, validated problem, evidence, and MVP direction make it easier for the right collaborator to understand the opportunity and decide whether to engage." },
    ],
    relatedLinks: [
      { href: "/answers/customer-interview-questions", label: "Customer interview questions" },
      { href: "/answers/mvp-feature-prioritization", label: "Prioritize the MVP" },
      { href: "/mentorship", label: "Find a startup mentor" },
    ],
  },
  "/investors": {
    sections: [
      { heading: "Filter for actual investor fit", copy: "Focus the shortlist by startup stage, sector, geography, check size, thesis, portfolio, and recent activity instead of sending the same pitch to a broad list." },
      { heading: "Prepare evidence before outreach", copy: "A clear customer, credible problem, focused product, traction evidence, and realistic fundraising ask make investor conversations more useful and more likely to continue." },
      { heading: "Research before requesting an introduction", copy: "Use portfolio and thesis context to explain why the company fits, what has already been proven, and what the requested capital will make possible." },
    ],
    relatedLinks: [
      { href: "/answers/how-to-find-investors-for-startup", label: "How to find startup investors" },
      { href: "/answers/startup-pitch-deck-outline", label: "Startup pitch deck outline" },
      { href: "/insighta/vc-search", label: "Search the VC database" },
    ],
  },
  "/newspaper": {
    sections: [
      { heading: "Founder decisions explained through cases", copy: "Read practical breakdowns of how companies found demand, changed direction, acquired early customers, built distribution, raised capital, and responded when the original plan failed." },
      { heading: "Evidence for early-stage operators", copy: "Articles connect company histories and current market changes to decisions a founder can make about validation, positioning, product scope, growth, resilience, and fundraising." },
      { heading: "From story to action", copy: "Continue from each article into a related founder guide or platform workflow so inspiration becomes a testable customer, product, launch, or traction decision." },
    ],
    relatedLinks: [
      { href: "/newspaper/rss.xml", label: "Subscribe to the Newspaper RSS feed" },
      { href: "/answers", label: "Browse founder answers" },
      { href: "/startup-guide", label: "Follow the startup guide" },
    ],
  },
  "/tech-stack": {
    sections: [
      { heading: "Choose for the product you are proving", copy: "Start with the user experience, data, integrations, security, and operational requirements the first product genuinely needs rather than copying a stack designed for a later-stage company." },
      { heading: "Compare speed, cost, and maintainability", copy: "Evaluate frameworks, hosting, authentication, database, payments, analytics, email, AI services, and support tooling against team skills and expected usage." },
      { heading: "Keep the first architecture reversible", copy: "Prefer managed services and clear interfaces where they shorten the learning cycle, while documenting the scale, compliance, or performance signals that would justify a future change." },
    ],
    relatedLinks: [
      { href: "/answers/tech-stack-for-startup", label: "How to choose a startup tech stack" },
      { href: "/answers/no-code-vs-code-for-mvp", label: "No-code vs code for an MVP" },
      { href: "/mvp-builder", label: "Build the MVP" },
    ],
  },
  "/decision-sprint": {
    sections: [
      { heading: "Compare ideas against the same evidence", copy: "Score each option using customer urgency, reachability, willingness to act, founder advantage, market timing, and the cost of testing the riskiest assumption." },
      { heading: "Expose the assumption that can kill the idea", copy: "Turn enthusiasm into a falsifiable question and identify the smallest interview, landing page, outreach, or prototype test that can answer it quickly." },
      { heading: "Leave with one committed next move", copy: "The output is not a longer idea list. It is one selected direction, a documented reason, the evidence still missing, and the next validation action." },
    ],
    relatedLinks: [
      { href: "/answers/signs-your-startup-idea-is-good", label: "Signs a startup idea is strong" },
      { href: "/validate", label: "Validate in seven days" },
      { href: "/icp-builder", label: "Define the first customer" },
    ],
  },
  "/validate": {
    sections: [
      { heading: "Turn the idea into testable assumptions", copy: "Name the first customer, the painful situation, the current workaround, the promised outcome, and the behavior that would count as real demand." },
      { heading: "Collect evidence from real people", copy: "Run focused interviews and outreach, record repeated language and objections, and separate polite interest from actions such as introductions, waitlist signups, deposits, or committed trials." },
      { heading: "Make a build, iterate, or stop decision", copy: "Summarize what the evidence supports, what remains uncertain, and which result would justify an MVP instead of letting activity substitute for a decision." },
    ],
    relatedLinks: [
      { href: "/answers/how-to-validate-startup-idea", label: "How to validate a startup idea" },
      { href: "/answers/customer-interview-questions", label: "Customer interview questions" },
      { href: "/pmf-lab", label: "Review product-market-fit evidence" },
    ],
  },
  "/mvp-builder": {
    sections: [
      { heading: "Build around the riskiest assumption", copy: "Translate validated customer evidence into the smallest product experience that can test whether the target user reaches the promised outcome and wants to return." },
      { heading: "Define scope before implementation", copy: "Document the primary flow, required data, success event, excluded features, acceptance criteria, and the technical choices needed for a reliable first release." },
      { heading: "Launch a product designed to learn", copy: "Instrument activation and retention, recruit a narrow first cohort, and use observed behavior and customer conversations to decide what earns the next development cycle." },
    ],
    relatedLinks: [
      { href: "/answers/mvp-builder-for-startups", label: "MVP builder guide" },
      { href: "/answers/mvp-feature-prioritization", label: "Prioritize MVP features" },
      { href: "/tech-stack", label: "Choose the startup tech stack" },
    ],
  },
  "/mvp-scope": {
    sections: [
      { heading: "Name the single product promise", copy: "Choose one target user, one recurring painful situation, and one measurable outcome the first version must deliver before adding supporting workflows." },
      { heading: "Separate required features from attractive extras", copy: "Keep only the capabilities required to complete the primary flow, capture the success event, and safely operate the product for the first test cohort." },
      { heading: "Document what is deliberately excluded", copy: "A strong scope records deferred personas, integrations, automation, edge cases, and scale work so the team can ship without reopening every decision." },
    ],
    relatedLinks: [
      { href: "/answers/mvp-feature-prioritization", label: "How to prioritize MVP features" },
      { href: "/answers/no-code-vs-code-for-mvp", label: "Choose no-code or code" },
      { href: "/mvp-builder", label: "Build the MVP" },
    ],
  },
  "/directories": {
    sections: [
      { heading: "Choose directories by audience fit", copy: "Prioritize communities and launch platforms where the target customer already looks for products like yours rather than submitting to the longest possible list." },
      { heading: "Prepare consistent launch assets", copy: "Use one clear category, positioning statement, description, logo, screenshots, founder profile, pricing summary, and canonical link across every submission." },
      { heading: "Measure qualified outcomes", copy: "Track visits, signups, activation, conversations, and backlinks by source so future distribution work favors channels that create evidence rather than vanity traffic." },
    ],
    relatedLinks: [
      { href: "/answers/startup-launch-checklist", label: "Startup launch checklist" },
      { href: "/answers/product-hunt-launch-guide", label: "Product Hunt launch guide" },
      { href: "/traction-engine", label: "Track launch traction" },
    ],
  },
  "/insighta": {
    sections: [
      { heading: "Assess fundraising readiness", copy: "Review the clarity of the customer, problem, market, product narrative, traction evidence, business model, use of funds, and milestones before starting broad investor outreach." },
      { heading: "Research the right capital sources", copy: "Build investor and accelerator shortlists around stage, sector, geography, check size, thesis, portfolio fit, and recent activity instead of relying on generic databases." },
      { heading: "Improve the pitch and outreach system", copy: "Analyze the deck, prepare concise email variants, record responses, and refine the story using investor questions and real operating evidence." },
    ],
    relatedLinks: [
      { href: "/insighta/test", label: "Take the fundraising readiness assessment" },
      { href: "/insighta/pitch-deck-analyzer", label: "Analyze the pitch deck" },
      { href: "/insighta/vc-search", label: "Search venture capital investors" },
    ],
  },
  "/insighta/email-templates": {
    sections: [
      { heading: "Start with investor relevance", copy: "Reference a specific thesis, portfolio pattern, recent investment, or stated interest that explains why the recipient belongs on the shortlist." },
      { heading: "Make one concise, credible case", copy: "State the customer problem, what the company does, the strongest evidence, the current round, and one clear request without turning the first email into a full pitch deck." },
      { heading: "Treat templates as a research framework", copy: "Keep the structure repeatable while changing the opening, fit rationale, evidence, and ask for each recipient; then track replies and objections to improve later outreach." },
    ],
    relatedLinks: [
      { href: "/answers/cold-email-for-startups", label: "Cold email guide for startups" },
      { href: "/insighta/vc-search", label: "Research investor fit" },
      { href: "/insighta/pitch-deck-analyzer", label: "Review the pitch deck" },
    ],
  },
  "/insighta/accelerator-hunt": {
    sections: [
      { heading: "Filter by stage and program fit", copy: "Compare accelerator focus, geography, sector, cohort format, investment terms, equity, program dates, alumni outcomes, and the support the startup actually needs." },
      { heading: "Evaluate the cost beyond equity", copy: "Account for application time, relocation, cohort schedule, opportunity cost, mentor relevance, fundraising access, and whether the program changes the company's probability of success." },
      { heading: "Prepare evidence for the application", copy: "Use a clear customer, validated problem, focused product, traction signal, founder advantage, and specific reason this program can accelerate the next milestone." },
    ],
    relatedLinks: [
      { href: "/answers/accelerator-alternatives", label: "Compare accelerator alternatives" },
      { href: "/answers/startup-pitch-deck-outline", label: "Prepare the pitch outline" },
      { href: "/insighta/test", label: "Assess fundraising readiness" },
    ],
  },
  "/demo": {
    sections: [
      { heading: "See the connected founder journey", copy: "Walk through how customer clarity, validation evidence, MVP decisions, launch assets, traction, and fundraising preparation remain linked across the platform." },
      { heading: "Preview practical outputs", copy: "Review the kinds of briefs, scores, plans, checklists, research, and execution artifacts each tool creates before starting a full workspace." },
      { heading: "Choose the right first workflow", copy: "Begin with the decision that is currently blocking progress, whether that is defining the customer, validating demand, scoping a product, planning launch, or preparing for investors." },
    ],
    relatedLinks: [
      { href: "/icp-builder", label: "Build an ICP for free" },
      { href: "/startup-guide", label: "Read the startup guide" },
      { href: "/pricing", label: "Compare plans" },
    ],
  },
};

for (const route of INDEXABLE_ROUTES) {
  const enhancement = STATIC_ROUTE_ENHANCEMENTS[route.path];
  if (enhancement) Object.assign(route, enhancement);
  if (route.path !== "/" && !route.breadcrumb) {
    route.breadcrumb = [
      { name: "Home", url: "/" },
      { name: route.heroHeading || route.title, url: route.path },
    ];
  }
}
