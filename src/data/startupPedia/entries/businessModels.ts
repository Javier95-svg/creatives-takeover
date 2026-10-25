import type { PediaEntry } from "../types.ts";

export const businessModelEntries: PediaEntry[] = [
  {
    slug: "b2b-b2c-d2c",
    kind: "term",
    topic: "business-models",
    audiences: ["founder", "builder", "investor", "service-provider"],
    title: "B2B vs B2C vs D2C: Business Models Explained",
    metaTitle: "B2B vs B2C vs D2C: Meaning, Examples and Differences",
    metaDescription:
      "B2B sells to businesses, B2C sells to consumers and D2C sells to consumers without middlemen. How each works, with examples and what changes for a startup.",
    acronyms: ["B2B", "B2C", "D2C", "DTC", "B2B2C"],
    aliases: ["business to business", "business to consumer", "direct to consumer", "b2b vs b2c"],
    answer:
      "B2B (business-to-business) companies sell to other businesses. B2C (business-to-consumer) companies sell to individual people. D2C, or DTC (direct-to-consumer), is a type of B2C where the brand sells straight to consumers through its own channels instead of through retailers or other intermediaries.",
    sections: [
      {
        id: "b2b",
        heading: "B2B: business-to-business",
        body: "The customer is an organisation. Examples include accounting software, industrial equipment and recruitment services.\n\n- **Fewer customers, higher prices.** A single contract can be worth thousands or millions.\n- **Several decision-makers.** The user, the budget holder and IT or legal may all need to agree.\n- **Longer sales cycles.** Weeks to months, often with demos, trials and procurement.\n- **Relationships matter.** Retention and expansion within accounts drive growth.",
      },
      {
        id: "b2c",
        heading: "B2C: business-to-consumer",
        body: "The customer is an individual buying for themselves. Examples include streaming services, mobile games and clothing.\n\n- **Many customers, lower prices.** Growth depends on volume.\n- **One decision-maker,** often deciding quickly and emotionally.\n- **Brand and distribution matter,** because attention is expensive.\n- **Metrics to watch:** [CAC](/startup-pedia/customer-acquisition-cost), retention, [average order value](/startup-pedia/average-order-value) and [DAU/MAU](/startup-pedia/dau-and-mau).",
      },
      {
        id: "d2c",
        heading: "D2C: direct-to-consumer",
        body: "D2C brands make or source their own products and sell them through their own website, app or stores, rather than through retailers or marketplaces. This keeps more margin and gives the brand direct customer data and relationships. In exchange, the brand pays for all its own customer acquisition, fulfilment and service, which is why rising advertising costs hit D2C companies hard.",
      },
      {
        id: "hybrids",
        heading: "Hybrids: B2B2C and marketplaces",
        body: "- **B2B2C:** you sell to a business that delivers your product to its own consumers, such as a payments provider inside an online shop, or a platform that a university offers to its students.\n- **Marketplaces:** connect two sides, such as buyers and sellers, and take a fee. They can be B2C, B2B or consumer-to-consumer.",
      },
      {
        id: "choosing",
        heading: "What changes for a startup",
        body: "Your model shapes your [go-to-market](/startup-pedia/go-to-market-strategy). B2B startups usually start with founder-led sales, a narrow [ICP](/startup-pedia/ideal-customer-profile) and a handful of design partners. B2C and D2C startups need a channel that reaches many people cheaply, such as content, community or referrals, because individual sales calls do not scale at low prices.",
      },
    ],
    roleNotes: {
      investor: "Check that the metrics a founder reports match the model: account expansion and sales cycle for B2B, acquisition cost and retention for B2C.",
      "service-provider": "Most service providers sell B2B. Knowing whether your client sells B2B or B2C changes the marketing advice you give them.",
    },
    faqs: [
      {
        question: "What is the difference between B2B and B2C?",
        answer: "B2B companies sell to businesses, usually with higher prices, several decision-makers and longer sales cycles. B2C companies sell to individuals, usually in higher volumes at lower prices.",
      },
      {
        question: "What is the difference between B2C and D2C?",
        answer: "B2C covers any sale to consumers, including through retailers. D2C means the brand sells directly to consumers through its own channels.",
      },
      {
        question: "Is B2B or B2C better for a startup?",
        answer: "Neither is better in general. B2B can reach revenue with fewer customers. B2C can grow faster once a cheap channel works. Choose the model that fits your customer and problem.",
      },
    ],
    sources: [],
    relatedSlugs: ["saas", "go-to-market-strategy", "customer-acquisition-cost", "average-order-value"],
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "saas",
    kind: "term",
    topic: "business-models",
    audiences: ["founder", "builder", "investor"],
    title: "SaaS (Software as a Service): Meaning and How It Works",
    metaTitle: "What Is SaaS (Software as a Service)? How It Makes Money",
    metaDescription:
      "SaaS (software as a service) is software you access online for a subscription. How the model works, how SaaS companies make money and the metrics they track.",
    acronyms: ["SaaS"],
    aliases: ["software as a service", "saas meaning", "saas business model", "micro saas"],
    answer:
      "SaaS (software as a service) is software that customers use over the internet, usually through a browser, and pay for with a recurring subscription instead of buying and installing it. The provider hosts, maintains and updates the software for everyone.",
    sections: [
      {
        id: "how-it-works",
        heading: "How SaaS works",
        body: "The provider runs one version of the software on its own servers or cloud infrastructure. Customers sign in and use it, and every customer gets updates at the same time. Examples include email, project management, accounting and customer support tools.\n\nThis differs from traditional licensed software, where customers paid once and installed it themselves, and from infrastructure services, where customers rent computing resources to run their own software.",
      },
      {
        id: "pricing",
        heading: "How SaaS companies make money",
        body: "- **Per seat:** a price per user per month.\n- **Tiered:** plans with increasing features or limits.\n- **Usage-based:** pay for what you use, such as messages sent, credits consumed or data stored.\n- **Freemium:** a free plan with paid upgrades.\n- **Hybrid:** a base subscription plus usage charges.\n\nMost SaaS companies offer monthly and annual billing, often with a discount for paying annually.",
      },
      {
        id: "metrics",
        heading: "The metrics SaaS companies track",
        body: "- [MRR and ARR](/startup-pedia/mrr-and-arr): recurring revenue.\n- **Churn:** the share of customers or revenue lost each month.\n- **Net revenue retention:** revenue from existing customers after upgrades, downgrades and churn.\n- [CAC](/startup-pedia/customer-acquisition-cost) and [LTV](/startup-pedia/customer-lifetime-value): the economics of winning customers.\n- **Activation:** the share of new sign-ups who reach the first meaningful outcome.",
      },
      {
        id: "pros-cons",
        heading: "Why founders choose it, and the trade-offs",
        body: "**Advantages:** predictable recurring revenue, high gross margins once built, and the ability to improve the product continuously for every customer.\n\n**Trade-offs:** revenue builds slowly, one subscription at a time. Customers can cancel easily, so retention matters as much as acquisition. Hosting, security and support are ongoing costs.\n\nA **micro SaaS** is a small SaaS business, often run by one or two people, that serves a narrow niche.",
      },
      {
        id: "example",
        heading: "Example",
        body: "A founder builds scheduling software for dance studios. Studios pay $49 a month for up to three instructors and $99 for unlimited instructors. With 200 studios, half on each plan, MRR is $14,800. The founder's focus is activation (studios importing their timetable in the first week) and churn, because a studio that stays three years is worth far more than one that leaves after three months.",
      },
    ],
    roleNotes: {
      builder: "Many solo builders start with a micro SaaS: one narrow problem, one customer type, a simple subscription.",
      investor: "For SaaS, net revenue retention and churn by cohort often tell you more than headline growth.",
    },
    faqs: [
      {
        question: "What does SaaS stand for?",
        answer: "SaaS stands for software as a service: software accessed online and paid for with a subscription.",
      },
      {
        question: "What is an example of SaaS?",
        answer: "Web-based email, project management, accounting and customer support tools are common examples. You sign in through a browser and pay monthly or annually.",
      },
      {
        question: "Is SaaS B2B or B2C?",
        answer: "It can be either. Most SaaS revenue comes from businesses, but many consumer apps also use subscription software models.",
      },
    ],
    sources: [
      { title: "What is SaaS?", publisher: "Amazon Web Services", url: "https://aws.amazon.com/what-is/saas/" },
      { title: "SaaS Metrics 2.0", publisher: "David Skok, For Entrepreneurs", url: "https://www.forentrepreneurs.com/saas-metrics-2/" },
    ],
    relatedSlugs: ["mrr-and-arr", "b2b-b2c-d2c", "customer-lifetime-value", "how-to-get-your-first-100-users"],
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
  {
    slug: "mrr-and-arr",
    kind: "term",
    topic: "business-models",
    audiences: ["founder", "investor", "mentor", "program"],
    title: "MRR and ARR: Monthly and Annual Recurring Revenue",
    metaTitle: "MRR vs ARR: How to Calculate Recurring Revenue",
    metaDescription:
      "MRR is monthly recurring revenue and ARR is annual recurring revenue. How to calculate both, what to include and leave out, and how to read MRR growth.",
    acronyms: ["MRR", "ARR"],
    aliases: ["monthly recurring revenue", "annual recurring revenue", "run rate", "mrr vs arr", "net new mrr"],
    answer:
      "Monthly recurring revenue (MRR) is the predictable subscription revenue a business earns each month. Annual recurring revenue (ARR) is the same figure on a yearly basis, usually MRR × 12. Both count only recurring subscription revenue, not one-off fees.",
    formulas: [
      { label: "MRR", expression: "Sum of all active subscriptions' monthly value" },
      { label: "ARR", expression: "MRR × 12" },
      { label: "Net new MRR", expression: "New MRR + Expansion MRR − Contraction MRR − Churned MRR" },
    ],
    sections: [
      {
        id: "mrr",
        heading: "MRR: monthly recurring revenue",
        body: "Add up the monthly value of every active subscription. Annual plans are divided by 12, so a $1,200 annual plan adds $100 to MRR. Discounts reduce MRR to what the customer actually pays.",
      },
      {
        id: "arr",
        heading: "ARR: annual recurring revenue",
        body: "ARR is MRR multiplied by 12. Companies with annual contracts, especially in B2B, often prefer to report ARR. Note that ARR is a snapshot of the current run rate, not a forecast or last year's actual revenue.",
      },
      {
        id: "exclude",
        heading: "What not to count",
        body: "- One-off setup or implementation fees\n- Consulting and services revenue\n- Usage charges that vary a lot month to month (track them separately)\n- Free trials and customers who have not paid yet\n- Signed contracts that have not started\n\nCounting these inflates MRR and misleads investors and your own planning.",
      },
      {
        id: "movements",
        heading: "MRR movements",
        body: "Break monthly change into its parts:\n\n- **New MRR:** from new customers.\n- **Expansion MRR:** existing customers upgrading or adding seats.\n- **Contraction MRR:** downgrades.\n- **Churned MRR:** cancellations.\n\nTwo companies can grow at the same rate for very different reasons. Growth driven by expansion with low churn is far healthier than growth that relies on replacing customers who leave.",
      },
      {
        id: "example",
        heading: "Worked example",
        body: "A SaaS startup starts the month at $20,000 MRR. It adds $3,000 from new customers and $1,000 from upgrades, loses $400 to downgrades and $1,600 to cancellations.\n\nNet new MRR = $3,000 + $1,000 − $400 − $1,600 = **$2,000**. MRR ends at **$22,000**, a 10% monthly increase, and ARR is **$264,000**.",
      },
    ],
    roleNotes: {
      investor: "Ask for the MRR bridge (new, expansion, contraction, churn) rather than the headline number.",
      program: "For teams with subscriptions, MRR reported the same way every month is one of the clearest progress measures a program can collect.",
    },
    faqs: [
      {
        question: "What is the difference between MRR and ARR?",
        answer: "MRR is recurring revenue per month. ARR is the annual equivalent, usually MRR multiplied by 12.",
      },
      {
        question: "Do one-time fees count in MRR?",
        answer: "No. MRR includes only recurring subscription revenue. Setup fees, services and one-off sales are tracked separately.",
      },
      {
        question: "Is ARR the same as annual revenue?",
        answer: "No. ARR is the current recurring run rate. Annual revenue is what you actually earned over a year, including one-off income.",
      },
    ],
    sources: [
      { title: "SaaS Metrics 2.0", publisher: "David Skok, For Entrepreneurs", url: "https://www.forentrepreneurs.com/saas-metrics-2/" },
      { title: "16 Startup Metrics", publisher: "Andreessen Horowitz", url: "https://a16z.com/16-startup-metrics/" },
    ],
    relatedSlugs: ["saas", "customer-lifetime-value", "kpis-and-okrs", "customer-acquisition-cost"],
    publishedAt: "2026-10-25",
    modifiedAt: "2026-10-25",
  },
];
