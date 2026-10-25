import type { PediaTopic, PediaTopicKey } from "./types.ts";

// Topic order is priority order: it is the order of the hub and the topic filter.
export const PEDIA_TOPICS: PediaTopic[] = [
  {
    key: "validation",
    label: "Validation & customer discovery",
    heading: "Startup validation and customer discovery",
    metaTitle: "Startup Validation & Customer Discovery | Startup Pedia",
    metaDescription:
      "How to validate a startup idea: customer interviews, waitlists, PMF surveys and the signals that separate real demand from polite interest.",
    intro:
      "Validation is the work of finding out whether a specific group of people has a problem painful enough to act on, before you spend months building. It is not asking friends whether they like the idea. It is watching what people already do: the workarounds they rely on, the money and time they spend, and whether they take a small step when you offer a better way. The entries below cover the methods founders use most, from customer interviews and waitlists to product-market fit surveys, and the signals that tell you when to keep going, narrow the idea or stop. Read them in order if you are starting out, or jump to the one that matches the decision in front of you.",
    tools: [
      { href: "/validate", label: "Validate", description: "A structured validation plan for testing demand and gathering evidence." },
      { href: "/pmf-lab", label: "PMF Lab", description: "Score the demand evidence you have collected." },
      { href: "/decision-sprint", label: "Decision Sprint", description: "Compare ideas side by side against the same criteria." },
    ],
  },
  {
    key: "customers",
    label: "Customers & positioning",
    heading: "Ideal customers, target audiences and positioning",
    metaTitle: "ICP, Target Audience & Positioning | Startup Pedia",
    metaDescription:
      "Define your ideal customer profile, find your first target audience and write positioning that makes the right people understand why it matters.",
    intro:
      "Almost every early-stage problem gets easier once you know exactly who you are building for. A clear ideal customer profile decides which interviews to run, what your landing page says, which features make the first version and where you look for your first users. Positioning then turns that clarity into a message: who it is for, what changes for them and what it replaces. These entries explain the core terms, ICP, target audience and unique selling proposition, and give you templates and examples you can fill in today. Start narrow. You can always widen the audience once one segment is clearly working.",
    tools: [
      { href: "/icp-builder", label: "ICP Builder", description: "Turn your idea into a saved ideal customer profile." },
    ],
  },
  {
    key: "product",
    label: "MVP & product",
    heading: "Minimum viable products and product-market fit",
    metaTitle: "MVP, Product-Market Fit & Tech Stack | Startup Pedia",
    metaDescription:
      "What an MVP is, how to scope one, no-code vs code, choosing a tech stack and how to tell whether you have reached product-market fit.",
    intro:
      "Your first product should answer one question as cheaply as possible: does this deliver the outcome a specific customer wants badly enough to come back? That is the job of a minimum viable product, and it is why the hardest part of building one is deciding what to leave out. This topic explains the vocabulary, MVP and product-market fit, and the practical choices that follow: which features to keep, whether to use no-code tools or write code, and how to pick a tech stack your team can maintain. The guides assume you have done some validation first. If you have not, the validation topic is the better place to begin.",
    tools: [
      { href: "/mvp-scope", label: "MVP Scope", description: "Cut a feature list down to a buildable first version." },
      { href: "/mvp-builder", label: "MVP Builder", description: "Generate and iterate on a working MVP from a description." },
      { href: "/tech-stack", label: "Tech Stack Builder", description: "Compare frameworks and tools for your product." },
    ],
  },
  {
    key: "growth",
    label: "Go-to-market & growth",
    heading: "Go-to-market strategy and getting your first users",
    metaTitle: "Go-to-Market Strategy & First Users | Startup Pedia",
    metaDescription:
      "Plan a go-to-market strategy, get your first 100 users, write cold emails that get replies and launch on Product Hunt without wasting the day.",
    intro:
      "Building the product is only half the work. The other half is reaching the people who need it, with a message they understand, through a channel where they already spend time. Early go-to-market is less about big campaigns and more about focus: one audience, one or two channels and a weekly habit of testing what works. This topic covers the go-to-market strategy itself and the tactics founders lean on for their first users, including direct outreach, cold email, launch platforms and a launch checklist that ties them together. Each guide ends with what to measure, because attention that does not turn into learning is wasted.",
    tools: [
      { href: "/go-to-market", label: "GTM Strategist", description: "Channel recommendations, messaging and a 30-day launch plan." },
      { href: "/directories", label: "Launch Directories", description: "Places to submit and promote a product launch." },
    ],
  },
  {
    key: "metrics",
    label: "Metrics & progress tracking",
    heading: "Startup metrics and progress tracking",
    metaTitle: "Startup Metrics: CAC, LTV, MRR, KPIs | Startup Pedia",
    metaDescription:
      "Plain-English explanations of the startup metrics founders and investors use: CAC, LTV, MRR, ARR, AOV, ROI, ROAS, DAU, MAU, NPS, KPIs and OKRs.",
    intro:
      "Metrics are how a startup knows whether it is making progress or just staying busy. The trouble is that the same few acronyms appear in every pitch deck, accelerator report and investor update, often used loosely. This topic defines each one in plain English, shows how to calculate it with a worked example and explains the mistakes that make the number misleading. It also covers goal-setting with KPIs and OKRs, so you can choose a small set of numbers that match your stage. A pre-launch team, a team with its first paying customers and a team scaling a channel should not be tracking the same things.",
    tools: [
      { href: "/traction-engine", label: "Traction Engine", description: "Log weekly distribution experiments and track a Traction Score." },
    ],
  },
  {
    key: "business-models",
    label: "Business models & pricing",
    heading: "Startup business models",
    metaTitle: "B2B, B2C, D2C & SaaS Business Models | Startup Pedia",
    metaDescription:
      "How B2B, B2C, D2C and SaaS business models work, how they make money and what each one means for sales, pricing and the metrics you track.",
    intro:
      "Who pays you, and how, shapes almost everything else about a startup: the length of the sales cycle, the price you can charge, the channels that work and the numbers investors will ask about. This topic explains the business model labels you will hear most, business-to-business, business-to-consumer, direct-to-consumer and software as a service, with examples of how each one earns revenue and what changes when you choose it. None of these models is better than the others. What matters is that your model matches your customer, and that you know which metrics tell you whether it is working.",
    tools: [],
  },
  {
    key: "fundraising",
    label: "Fundraising, equity & legal",
    heading: "Fundraising, equity and startup legal basics",
    metaTitle: "Startup Fundraising, Equity & Legal Basics | Startup Pedia",
    metaDescription:
      "Funding stages from pre-seed to IPO, venture capital vs private equity, pitch decks, finding investors, ESOPs, NDAs and protecting your IP.",
    intro:
      "Raising money is a project with its own vocabulary, and much of it is easy to misunderstand until you are in the middle of a round. This topic explains the funding stages from pre-seed to an initial public offering, how venture capital differs from private equity, and how to prepare: building a pitch deck, getting honest feedback on it and finding investors who actually fund your stage and sector. It also covers the equity and legal basics that come up alongside fundraising, such as employee stock option plans, NDAs and intellectual property. Nothing here is legal or financial advice, so confirm the details for your country with a qualified professional before you sign anything.",
    tools: [
      { href: "/pitch-deck-analyzer", label: "Pitch Deck Analyzer", description: "Score a deck and get feedback before investors see it." },
      { href: "/vc-search", label: "VC Search", description: "Filter venture firms by stage, sector, geography and check size." },
      { href: "/email-templates", label: "Investor Email Templates", description: "Templates for intros, outreach and follow-ups." },
    ],
  },
  {
    key: "programs",
    label: "Accelerators, incubators & mentors",
    heading: "Accelerators, incubators and startup mentoring",
    metaTitle: "Accelerators, Incubators & Mentoring | Startup Pedia",
    metaDescription:
      "How accelerators and incubators work, alternatives for founders who are not in one, and how programs and mentors track founder progress.",
    intro:
      "Accelerators, incubators, university programs and mentors all try to help founders move faster, but they work in different ways and suit different stages. This topic is written for both sides. Founders will find what these programs offer, what they ask in return and how to get similar structure without joining one. Program managers and mentors will find practical guidance on measuring founder progress, reporting outcomes and keeping work moving between sessions. The common thread is evidence: a program is most useful when it helps founders produce real customer evidence and decisions, not just attendance and slide decks.",
    tools: [
      { href: "/accelerator-hunt", label: "Accelerator Hunt", description: "Find accelerator programs matched to your startup." },
      { href: "/mentorship", label: "Mentors", description: "Reviewed startup mentors with published specialisms." },
      { href: "/enterprise", label: "For programs", description: "A 30-day founder validation pilot for accelerators and incubators." },
    ],
  },
];

export const getTopic = (key: string): PediaTopic | undefined => PEDIA_TOPICS.find((topic) => topic.key === key);

export const TOPIC_KEYS = PEDIA_TOPICS.map((topic) => topic.key) as PediaTopicKey[];
