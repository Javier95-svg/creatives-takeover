// The entries the homepage and /resources teaser features, with only the fields
// it shows. Importing the full library for five links put the whole Startup
// Pedia dataset (~72KB gz) on the homepage. tests/startup-pedia.test.ts keeps
// these in sync with the entries themselves.
export interface FeaturedPediaEntry {
  slug: string;
  title: string;
  topicLabel: string;
  /** Topic key, for the topic page link. */
  topic: string;
  kind: "term" | "guide";
  /** The entry's one- or two-sentence answer, word for word. */
  answer: string;
}

export const FEATURED_PEDIA_ENTRIES: FeaturedPediaEntry[] = [
  {
    slug: "ideal-customer-profile",
    title: "Ideal Customer Profile (ICP): What It Is and How to Define One",
    topicLabel: "Customers & positioning",
    topic: "customers",
    kind: "term",
    answer: "An ideal customer profile (ICP) is a description of the type of customer who gets the most value from your product and is most likely to buy it first. For an early startup, it is the narrow segment with the sharpest pain that you can reach today.",
  },
  {
    slug: "how-to-validate-a-startup-idea",
    title: "How to Validate a Startup Idea Before You Build",
    topicLabel: "Validation & customer discovery",
    topic: "validation",
    kind: "guide",
    answer: "To validate a startup idea, pick one specific customer, confirm they already struggle with the problem, and get them to take a small action, such as booking a call, joining a waitlist or paying a deposit, before you build. Validation is evidence of behavior, not opinions about your idea.",
  },
  {
    slug: "minimum-viable-product",
    title: "Minimum Viable Product (MVP): Meaning and Examples",
    topicLabel: "MVP & product",
    topic: "product",
    kind: "term",
    answer: "A minimum viable product (MVP) is the simplest version of a product that delivers its core value to real users, so you can learn whether they want it with the least time and money. It is a learning tool, not a smaller copy of the final product.",
  },
  {
    slug: "go-to-market-strategy",
    title: "Go-to-Market (GTM) Strategy: What It Is and How to Build One",
    topicLabel: "Go-to-market & growth",
    topic: "growth",
    kind: "term",
    answer: "A go-to-market (GTM) strategy is the plan for how a product reaches its customers: who you target, what you say to them, which channels you use, how they buy and how you measure progress. For an early startup, it should fit on one page and focus on one customer and one or two channels.",
  },
  {
    slug: "pitch-deck-outline",
    title: "Pitch Deck Outline: What to Put on Each Slide",
    topicLabel: "Fundraising, equity & legal",
    topic: "fundraising",
    kind: "guide",
    answer: "A strong startup pitch deck tells one story in about 10 to 15 slides: the problem, your solution, why now, the market, your traction, the business model, the competition, the team and a specific ask. Each slide should make one point and set up the next.",
  },
];
