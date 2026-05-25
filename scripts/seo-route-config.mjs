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

const FOUNDER_ANSWER_ROUTES = [
  "how-to-define-icp-for-startup",
  "ideal-customer-profile-template",
  "startup-positioning-examples",
  "how-to-validate-startup-idea",
  "waitlist-before-mvp",
  "product-market-fit-survey-questions",
  "mvp-builder-for-startups",
  "tech-stack-for-startup",
  "go-to-market-strategy-for-startup",
  "first-users-for-saas",
  "startup-launch-checklist",
  "pitch-deck-feedback-for-startups",
  "vc-search-for-startups",
  "accelerator-alternatives",
].map((slug) => ({
  path: `/answers/${slug}`,
  title: `${slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")} | Creatives Takeover`,
  description:
    "A practical founder answer guide from Creatives Takeover, mapped to ICP, validation, build, launch, or fundraising workflows.",
  changefreq: "monthly",
  priority: 0.65,
  heroHeading: "Founder answer guide",
  heroCopy:
    "A practical startup guide that helps founders move from search intent into a concrete next step.",
}));

export const INDEXABLE_ROUTES = [
  {
    path: "/",
    title: "AI Startup Builder | Creatives Takeover",
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
    path: "/waitlist",
    title: "Startup Waitlist Page Builder | Creatives Takeover",
    description:
      "Build a startup waitlist page, capture early signups, and validate demand before spending time on development.",
    changefreq: "weekly",
    priority: 0.75,
    heroHeading: "Startup Waitlist Page Builder",
    heroCopy:
      "Create a pre-launch page, explain your offer clearly, and collect real demand signals before you build the product.",
    updatedLabel: "March 2026",
    sections: [
      {
        heading: "What Waitlist Maker is for",
        copy: "Waitlist Maker helps founders launch a pre-release page that explains the offer clearly and captures early demand before product development is fully underway.",
      },
      {
        heading: "Why a waitlist matters",
        copy: "A waitlist gives you evidence. It shows whether people understand the value proposition, whether the message is working, and whether real signups exist before you invest more time.",
      },
      {
        heading: "What founders learn from it",
        copy: "You learn whether your headline, offer, and audience are strong enough to attract interest, which makes later MVP and launch decisions less risky.",
      },
    ],
    faqs: [
      {
        question: "Why should founders build a waitlist before an MVP?",
        answer: "A waitlist is a lightweight way to test demand before you build. If people will not sign up for the idea, that is an important signal to catch early.",
      },
      {
        question: "What should a startup waitlist page include?",
        answer: "It should clearly explain the problem, the offer, who it is for, and why someone should sign up now instead of waiting.",
      },
      {
        question: "Can a waitlist page help with investor conversations?",
        answer: "Yes. Even early signup interest can strengthen your story by showing that real people responded to the positioning and offer.",
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
