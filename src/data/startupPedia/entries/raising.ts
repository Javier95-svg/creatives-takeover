import type { PediaEntry } from "../types.ts";

// Fundraising questions from the Oct–Nov 2026 Reddit report: investors
// ghosting or saying "not a fit", raising from angels (including for
// marketing), and what VCs actually look for.

const PG_FR = "https://paulgraham.com/fr.html";
const PG_GROWTH = "https://paulgraham.com/growth.html";
const SEQUOIA_PLAN = "https://www.sequoiacap.com/article/writing-a-business-plan/";
const SEC_ACCREDITED = "https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/accredited-investors";
const ACA_FAQ = "https://www.angelcapitalassociation.org/faqs/";
const YC_SAFE = "https://www.ycombinator.com/documents";

export const raisingEntries: PediaEntry[] = [
  {
    slug: "why-investors-say-no",
    kind: "guide",
    topic: "fundraising",
    audiences: ["founder", "investor", "mentor"],
    title: "Why Investors Say No (or Just Stop Replying)",
    metaTitle: "Why Investors Say No or Ghost You, and What to Do",
    metaDescription:
      "The real reasons investors pass on startups, what \"not a fit\" usually means, why many never reply, and what to change before you go back to them.",
    aliases: ["investor rejection", "investors ghosting", "not a fit", "vc said no", "why vcs pass", "investor feedback"],
    answer:
      "Investors usually say no because of fit or evidence: your stage, sector or round size is outside what they invest in, the market looks too small for the returns they need, there is not yet enough proof of demand, or they doubt the team. Many never say no at all; they stop replying. Treat silence as a no, keep sending progress and change what the noes have in common.",
    sections: [
      {
        id: "reasons",
        heading: "The common reasons",
        body: "- **Not in their mandate:** wrong stage, sector, geography or check size. \"Not a fit\" often means exactly this, and no amount of pitching changes it.\n- **Market too small:** venture funds need some investments to become very large companies. A good business that can reach a few million in revenue may not be venture-scale.\n- **Not enough evidence:** no users, no revenue or no growth yet, so the risk is too high for them.\n- **Team questions:** missing skills (often technical), part-time founders or unclear roles.\n- **Timing and competition:** a competitor already in their portfolio, or a fund that is not actively investing.\n- **The pitch:** the investor did not understand what you do or why now. See [pitch deck outline](/startup-pedia/pitch-deck-outline).",
      },
      {
        id: "what-vc-is-for",
        heading: "What venture capital is actually for",
        body: "Paul Graham defines a startup as \"a company designed to grow fast\", and writes that growth is why VCs want to invest in startups. Venture capital suits companies that can grow very large very quickly. Many good businesses are not like that, and they are better funded by revenue, loans, grants or angels. Being told you are not venture-scale is not the same as being told your business is bad. [What VCs look for](/startup-pedia/what-vcs-look-for) explains the criteria.",
      },
      {
        id: "ghosting",
        heading: "Why investors ghost, and what to do about it",
        body: "In \"How to Raise Money\", Paul Graham notes that some investors \"never actually do say no; they just stop replying to your emails\", because saying no closes a door they might want open later. His advice is to treat investors as saying no until they make a definite offer with no contingencies.\n\nIn practice: follow up once, about a week later, with something new (a customer, a metric, a hire). If there is still no answer, mark it as a no and keep them on your monthly update list. Investors who passed sometimes come back when the numbers change.",
      },
      {
        id: "feedback",
        heading: "How to get useful feedback",
        body: "Most investors will not volunteer reasons. Ask one specific question that is easy to answer: \"What would you need to see to take a second meeting?\" Look for patterns across several noes rather than reacting to one. If five investors mention the same concern, that is your next milestone.",
      },
      {
        id: "marketing-money",
        heading: "Raising money just for marketing",
        body: "Founders stuck in a cold start often ask whether they can raise money only for marketing. Investors fund marketing when you can show that money in turns into customers out: a channel that works at small scale, a known [customer acquisition cost](/startup-pedia/customer-acquisition-cost) and a [customer lifetime value](/startup-pedia/customer-lifetime-value) well above it. Without that evidence, run small experiments with your own budget first; the results become the pitch.",
      },
    ],
    roleNotes: {
      founder: "Keep a simple log of every investor conversation and the reason given. Patterns across noes are more useful than any single answer.",
      investor: "A one-line honest reason costs little and builds goodwill with founders who may come back stronger.",
      mentor: "Help founders separate \"not in our mandate\" noes from noes about the business. Only the second kind should change the plan.",
    },
    faqs: [
      {
        question: "What does \"not a fit\" mean from an investor?",
        answer: "Often that your stage, sector, location or round size is outside what the fund invests in. Check their portfolio and stated focus before contacting them.",
      },
      {
        question: "Why do investors ghost founders?",
        answer: "Saying no closes a door they might want open later, so some simply stop replying. Treat silence as a no, follow up once with news and move on.",
      },
      {
        question: "Can I raise angel money just for marketing?",
        answer: "Yes, if you can show that marketing spend reliably turns into customers: a working channel, a known acquisition cost and lifetime value well above it.",
      },
    ],
    sources: [
      { title: "How to Raise Money", publisher: "Paul Graham", url: PG_FR },
      { title: "Startup = Growth", publisher: "Paul Graham", url: PG_GROWTH },
    ],
    relatedSlugs: ["what-vcs-look-for", "how-to-raise-from-angels", "how-to-find-investors", "pitch-deck-outline"],
    cta: {
      label: "Review your pitch deck",
      href: "/pitch-deck-analyzer",
      description: "Pitch Deck Analyzer reviews your deck slide by slide and flags the gaps investors ask about.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "how-to-raise-from-angels",
    kind: "guide",
    topic: "fundraising",
    audiences: ["founder", "investor", "mentor"],
    title: "How to Raise Money From Angel Investors",
    metaTitle: "How to Raise Money From Angel Investors",
    metaDescription:
      "Who angel investors are, where to find them, what they look for, how a round built from several angel checks works and the SAFE most early rounds use.",
    aliases: ["angel investors", "angel round", "raise angel money", "find angel investors", "angel groups", "accredited investor"],
    answer:
      "Angel investors are individuals who invest their own money in early-stage startups, often before any fund will. Find them through founders they have backed, angel groups and people in your industry; raise on a standard instrument such as a post-money SAFE; and build the round from several smaller checks. In the US, most angels must be accredited investors.",
    sections: [
      {
        id: "who",
        heading: "Who angel investors are",
        body: "The Angel Capital Association defines an angel as a high-net-worth individual who invests personal funds in start-up companies. Many are former founders or executives who invest in industries they know, and some add advice and introductions. Because it is their own money, an angel can decide quickly, sometimes after one or two meetings.\n\nMany angels also invest together in **angel groups**, which share deal flow and due diligence. The Angel Capital Association notes that many groups co-invest to make investments of $500,000 to $2 million per round.",
      },
      {
        id: "accredited",
        heading: "Accredited investors (United States)",
        body: "In the US, most private startup rounds are offered only to accredited investors. The SEC's criteria for individuals include a net worth over $1 million excluding their primary residence, or income over $200,000 ($300,000 with a spouse or partner) in each of the prior two years. Other countries have their own rules, so check before accepting money from friends, family or contacts.",
      },
      {
        id: "where",
        heading: "Where to find angels",
        body: "- **Founders they backed:** ask founders a stage or two ahead of you who invested in them. A founder's introduction is the warmest route.\n- **Your industry:** former executives and operators in your field understand the problem fastest.\n- **Angel groups and networks:** most cities have one; many accept applications.\n- **Platforms and databases:** filter by stage and sector. See [how to find investors](/startup-pedia/how-to-find-investors).\n- **Your users:** a customer who loves the product is sometimes an investor too.",
      },
      {
        id: "terms",
        heading: "How an angel round works",
        body: "Most early angel rounds use a standard document rather than negotiated share purchases. Y Combinator publishes its SAFE forms free and says the post-money SAFE has been its standard since 2018; with it, each investor's eventual percentage can be calculated up front. Rounds are usually built over several weeks from several checks, closing with each investor as they commit rather than waiting for everyone.\n\nThe first commitment is the hardest. Paul Graham's advice applies here too: treat every investor as a no until they make a definite offer, and keep talking to others until the money is in the bank.",
      },
      {
        id: "pitch",
        heading: "What angels look for",
        body: "Angels at pre-seed invest mostly in the team and early evidence: why you are the right people, proof that customers want this (interviews, a waitlist, a pilot, first revenue) and what the money will achieve. Be specific about the milestone: \"$300,000 to reach 50 paying customers and $20,000 in monthly revenue in 12 months\" is easier to back than \"18 months of runway\". If you plan to spend most of it on marketing, show the channel already works at small scale.",
      },
    ],
    roleNotes: {
      founder: "Ask for introductions to angels from founders, not from strangers. One warm introduction is worth dozens of cold messages.",
      investor: "Publish what you invest in and your typical check size. It saves founders and you a lot of time.",
      mentor: "Introductions are the most valuable thing you can give a founder raising from angels. Make them when you can vouch for the team.",
    },
    faqs: [
      {
        question: "How much do angel investors usually invest?",
        answer: "It varies widely by person and country. Individual checks are often small, while angel groups that co-invest can put $500,000 to $2 million into a round, according to the Angel Capital Association.",
      },
      {
        question: "Do angel investors need to be accredited?",
        answer: "In the US, most private startup offerings are limited to accredited investors, defined by income or net worth thresholds. Other countries have different rules.",
      },
      {
        question: "Should I raise from angels or VCs first?",
        answer: "At pre-seed, most founders start with angels, who decide faster and invest smaller amounts. Venture funds usually come in once there is more evidence.",
      },
    ],
    sources: [
      { title: "Angel Investing FAQs", publisher: "Angel Capital Association", url: ACA_FAQ },
      { title: "Accredited Investors", publisher: "U.S. Securities and Exchange Commission", url: SEC_ACCREDITED },
      { title: "The SAFE", publisher: "Y Combinator", url: YC_SAFE },
      { title: "How to Raise Money", publisher: "Paul Graham", url: PG_FR },
    ],
    relatedSlugs: ["how-to-find-investors", "pre-seed-vs-seed-funding", "why-investors-say-no", "startup-funding-stages"],
    cta: {
      label: "Find angel investors",
      href: "/vc-search",
      description: "VC Search lets you filter reviewed angel and institutional investors by stage and thesis.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
  {
    slug: "what-vcs-look-for",
    kind: "guide",
    topic: "fundraising",
    audiences: ["founder", "investor", "program"],
    title: "What Do VCs Look For in a Startup?",
    metaTitle: "What Do VCs Look For in a Startup?",
    metaDescription:
      "What venture capital investors look for before they invest: a large market, a strong team, evidence of demand and growth, a reason why now and a scalable model.",
    aliases: ["how to convince a vc", "what investors want", "vc criteria", "venture capital criteria", "what makes a startup investable"],
    answer:
      "VCs look for companies that could become very large: a big and growing market, a team that can build and sell, evidence that customers want the product (ideally growth), a clear reason this is possible now, and a business model that scales. You do not convince a VC with persuasion; you show evidence on each of these.",
    sections: [
      {
        id: "why-big",
        heading: "Why VCs need big outcomes",
        body: "A venture fund invests in many early companies knowing most will return little. The fund works only if a few become very large, so every investment has to have that potential. That is why a VC may pass on a profitable, steady business: it is a good company but not a fit for the model. Paul Graham writes that growth is why VCs want to invest in startups. [Venture capital vs private equity](/startup-pedia/venture-capital-vs-private-equity) explains how this differs from other investors.",
      },
      {
        id: "checklist",
        heading: "What a VC wants you to answer",
        body: "Sequoia Capital's guidance on writing a business plan lists the topics it wants founders to cover:\n\n1. Company purpose, in a single declarative sentence\n2. Problem\n3. Solution\n4. Why now\n5. Market potential\n6. Competition and alternatives\n7. Business model\n8. Team\n9. Financials\n10. Vision\n\nThe same list makes a good structure for a pitch deck. See [pitch deck outline](/startup-pedia/pitch-deck-outline).",
      },
      {
        id: "evidence",
        heading: "Evidence at each stage",
        body: "What counts as evidence changes with stage:\n\n- **Pre-seed:** a team with the right skills, a clear problem backed by customer conversations, and early signals such as a waitlist, pilots or first users.\n- **Seed:** a product people use repeatedly, first revenue and a growth trend.\n- **Series A:** a repeatable way to acquire customers and clear [unit economics](/startup-pedia/customer-acquisition-cost).\n\nFor reference, Paul Graham writes that a good growth rate during Y Combinator is 5–7% a week, and 10% a week is exceptional. See [startup funding stages](/startup-pedia/startup-funding-stages).",
      },
      {
        id: "team",
        heading: "The team",
        body: "At the earliest stages the team is often most of the decision, because there is little else to judge. Investors look for founders who know the problem well, can build the product (a technical founder for a technology company), can sell it and have shown they make fast progress. Full-time commitment and a clean [co-founder equity split](/startup-pedia/cofounder-equity-split) with vesting reduce doubts.",
      },
      {
        id: "market",
        heading: "Market and why now",
        body: "Show a market large enough to support a big company, sized from the bottom up rather than as a percentage of a huge number. [TAM, SAM and SOM](/startup-pedia/tam-sam-som) shows how. Then explain why now: a change in technology, regulation or behaviour that makes your approach possible today when it was not before.",
      },
    ],
    roleNotes: {
      founder: "Before each meeting, write one line of evidence for each item on Sequoia's list. The gaps are what the investor will ask about.",
      investor: "Founders prepare better when you publish what you look for at each stage. It also improves the quality of inbound pitches.",
      program: "Map each founder's evidence against these criteria before demo day. It shows where coaching will matter most.",
    },
    faqs: [
      {
        question: "How do you convince a VC to invest?",
        answer: "With evidence rather than persuasion: a large market, a strong team, proof that customers want the product, a reason why now and a model that scales. Match investors to your stage and sector first.",
      },
      {
        question: "What is the most important thing VCs look for?",
        answer: "At the earliest stages, usually the team and early evidence of demand. Later, growth and repeatable customer acquisition matter most.",
      },
      {
        question: "Why would a VC pass on a profitable startup?",
        answer: "Because venture funds need a few investments to become very large. A steady, profitable business may not have that potential, even if it is a good company.",
      },
    ],
    sources: [
      { title: "Writing a Business Plan", publisher: "Sequoia Capital", url: SEQUOIA_PLAN },
      { title: "Startup = Growth", publisher: "Paul Graham", url: PG_GROWTH },
      { title: "How to Raise Money", publisher: "Paul Graham", url: PG_FR },
    ],
    relatedSlugs: ["why-investors-say-no", "pitch-deck-outline", "how-to-find-investors", "tam-sam-som"],
    cta: {
      label: "Review your pitch deck",
      href: "/pitch-deck-analyzer",
      description: "Pitch Deck Analyzer reviews your deck slide by slide and flags the gaps investors ask about.",
    },
    publishedAt: "2026-11-23",
    modifiedAt: "2026-11-23",
  },
];
