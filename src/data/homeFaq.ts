// The homepage FAQ. HomeFAQ.tsx renders it and the build turns it into the
// homepage FAQPage JSON-LD (scripts/generate-prerendered-pages.mjs), so the
// structured data always matches the visible questions.
// `link` renders under the answer only; the JSON-LD uses the answer text.
export const HOME_FAQS: Array<{ question: string; answer: string; link?: { label: string; href: string } }> = [
  {
    question: "What is Creatives Takeover?",
    answer: "Creatives Takeover is where founders and builders start a project and test whether people want it. You work out who your customer is, put a demo in front of real people and decide what to build next, with your tasks, evidence and progress in one workspace.\n\nMentors, service providers, cofounders and investors are on the same platform, and incubators and accelerators use it to run cohorts. The Rookie plan is free; some tools use monthly credits."
  },
  {
    question: "Is Creatives Takeover only for tech startups?",
    answer: "No. We built this for founders, indie hackers, and creative builders in general, not just traditional venture backed startups.\n\nFreelancers, creators, consultants, educators, SaaS founders, service businesses, marketplace ideas, niche products, local businesses, and solo internet businesses can all use the platform."
  },
  {
    question: "I run an incubator or accelerator. How does it work for a cohort?",
    answer: "Start with a 30-day validation pilot for 5 to 10 startups. We set up your cohort, founders join with their own accounts and consent, and your team sees every startup's stage, interviews and check-ins on one screen.\n\nWe follow up with anyone who goes quiet, and at day 30 you get a cohort report written from their recorded work. Founders keep their account and the free plan afterwards.",
    link: { label: "See how the pilot works", href: "/enterprise" }
  },
  {
    question: "How does the Startup Development Cycle work?",
    answer: "It splits the work of building a startup into seven stages: Identity, Prototyping, Validation, Building, Launch, Traction and Fundraising. Each stage has a clear goal and the tools for it, for example ICP Builder for Identity, PMF Lab for Validation, MVP Builder for Building, and GTM Strategist and Traction Engine for Launch and Traction.\n\nYou don't have to follow it in order. Start at the stage that matches where your project is; your dashboard keeps the tasks and progress for each one."
  },
  {
    question: "I don't have a clear business idea yet. Can this platform still help me?",
    answer: "Yes. You can start with a rough idea. Describe it in the box at the top of this page and ICP Builder gives you a first assessment of who it could serve, before you create an account.\n\nYou can also explore business directions in the Prompt Library, work through a first plan with BizMap AI, and read the Newspaper to see how others started."
  },
  {
    question: "Is my business idea safe?",
    answer: "Yes. Your workspace is private by default, and we take idea confidentiality seriously.\n\nYour data is protected with secure infrastructure, encryption, and access controls. We do not sell your idea, share it with other founders, or expose your private startup work unless you choose to share something yourself. We also do not use your private startup data as public showcase material for other users.\n\nAnd to calm the bigger fear: startups are rarely won because someone heard an idea. They are won through execution, customer understanding, speed, and consistency. Our job is to help you move faster while keeping your work private."
  },
  {
    question: "Will I be working on my own?",
    answer: "No. Besides the tools, the platform connects you with people: experts in specific fields, a cofounder marketplace, service providers for sales, marketing, operations and tech support, and Rooms and Launchpad to work next to other founders. On Pro, Find Your Angel connects you with angel investors.\n\nYour Founder ID gives you a public page to share your progress with all of them."
  },
  {
    question: "What tools help me validate my startup idea?",
    answer: "ICP Builder helps you define exactly who you are building for and what pain points matter most. Demo Studio gives people something to try and collects the emails of those who want early access. PMF Lab turns what you learn into a Build, Narrow, Pivot or Stop decision. BizMap AI helps you challenge your assumptions through conversation and turn research into action.\n\nTogether, these tools help you move from 'this sounds interesting' to 'there is real evidence worth building on.'"
  },
  {
    question: "How much does it cost and what do I get?",
    answer: "Rookie is free forever with 50 credits per month, 3 directory visits, and investor and accelerator browsing.\n\nStarter is $9/month or $79/year with 100 credits per month. It adds the PROVE workspace, Email Templates, 5 VC profiles, 5 accelerator profiles, and 10 directory visits a month.\n\nRising is $29/month or $239/year with 250 credits per month. It adds the complete First Customer Proof workflow, full Prompt Library and exports, and expanded research quotas.\n\nPro is $65/month or $589/year with 600 credits per month. It adds Find Your Angel and unlimited VC profiles, accelerator profiles, and directory visits. Core founder tools are available across plans and use credits where noted. Mentor marketplace access is also shared; mentor services are priced and paid separately."
  },
  {
    question: "How can I discover investors and funding opportunities?",
    answer: "Insighta groups the fundraising tools.\n\nVC Search lets you browse and filter venture capital firms by industry, stage, location and check size. Every plan can browse; opening full profiles takes a paid plan: 5 a month on Starter, 10 on Rising, unlimited on Pro. Accelerator Hunt works the same way.\n\nPitch Deck Analyzer and Insighta Test help you prepare before you reach out, and Find Your Angel, on Pro, connects you with angel investors. We can't promise investment; these tools help you find the right people and prepare for the conversation."
  },
  {
    question: "Who is behind Creatives Takeover and why should I trust the service?",
    answer: "We're a small team of founders, builders, and growth people.\n\nJavier Alonso (Founder and CEO) started this to give people building their first business one place to start and test it. Domagoj Markota (Fractional CTO) leads the technical and AI work behind the platform. Daniela Hägg (Growth Associate) focuses on helping startups grow with clear priorities and better distribution.\n\nWe're Creatives Takeover Ltd, a company registered in England and Wales (Company No. 16741912).\n\nGot questions? Write to javier@creatives-takeover.com or admin@creatives-takeover.com anytime."
  }
];
