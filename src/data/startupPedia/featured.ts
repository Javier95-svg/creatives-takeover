// The entries the homepage and /resources teaser features, with only the fields
// it shows. Importing the full library for five links put the whole Startup
// Pedia dataset (~72KB gz) on the homepage. tests/startup-pedia.test.ts keeps
// these in sync with the entries themselves.
export interface FeaturedPediaEntry {
  slug: string;
  title: string;
  topicLabel: string;
}

export const FEATURED_PEDIA_ENTRIES: FeaturedPediaEntry[] = [
  { slug: "ideal-customer-profile", title: "Ideal Customer Profile (ICP): What It Is and How to Define One", topicLabel: "Customers & positioning" },
  { slug: "how-to-validate-a-startup-idea", title: "How to Validate a Startup Idea Before You Build", topicLabel: "Validation & customer discovery" },
  { slug: "minimum-viable-product", title: "Minimum Viable Product (MVP): Meaning and Examples", topicLabel: "MVP & product" },
  { slug: "go-to-market-strategy", title: "Go-to-Market (GTM) Strategy: What It Is and How to Build One", topicLabel: "Go-to-market & growth" },
  { slug: "pitch-deck-outline", title: "Pitch Deck Outline: What to Put on Each Slide", topicLabel: "Fundraising, equity & legal" },
];
