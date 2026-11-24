// Public accelerator terms. Pure data, no "@/" imports: the prerender, the
// sitemap and the React profile page all read this file, so crawlers and
// signed-out visitors see the same summary.
//
// Every value was read on the program's own website on CHECKED_AT and is
// quoted as closely as possible. A field the official site does not state is
// left out rather than guessed. Programs whose sites state no terms, or did
// not load, are not listed: their profiles stay sign-in only and noindex.
// Re-check before editing a value, and update ACCELERATOR_TERMS_CHECKED_AT.

export const ACCELERATOR_TERMS_CHECKED_AT = "2026-11-23";

export interface AcceleratorTerms {
  slug: string;
  name: string;
  /** What kind of program this is, in a few words. */
  model: string;
  /** One or two sentences: the answer to "what are X's terms?". Used as meta description (≤160). */
  summary: string;
  investment?: string;
  equity?: string;
  fee?: string;
  duration?: string;
  location?: string;
  /** Anything a founder should know before relying on the figures. */
  note?: string;
  /** Official pages where the values above are stated. */
  sources: string[];
}

export const ACCELERATOR_TERMS: AcceleratorTerms[] = [
  {
    slug: "y-combinator",
    name: "Y Combinator",
    model: "Accelerator",
    summary:
      "Y Combinator invests $500,000: $125,000 on a post-money SAFE for 7% plus $375,000 on an uncapped SAFE with MFN. It charges no fees.",
    investment: "$500,000 standard deal: $125,000 on a post-money SAFE plus $375,000 on an uncapped SAFE with a most favored nation (MFN) provision",
    equity: "7% for the $125,000 SAFE, plus what the uncapped SAFE converts into at the next priced round",
    fee: "None",
    sources: ["https://www.ycombinator.com/deal"],
  },
  {
    slug: "techstars",
    name: "Techstars",
    model: "Accelerator",
    summary:
      "Techstars invests $220,000 ($200,000 uncapped MFN SAFE plus $20,000 for common stock) for at least 5% equity, with no program fee.",
    investment: "$220,000: a $200,000 uncapped MFN SAFE plus $20,000 for common stock; Asia-Pacific programs use different amounts",
    equity: "A minimum of 5%, plus what the uncapped SAFE converts into",
    fee: "None",
    duration: "3 months",
    sources: ["https://www.techstars.com/newsroom/investment-terms"],
  },
  {
    slug: "500-global-flagship-accelerator",
    name: "500 Global (500 Fellowship)",
    model: "Accelerator",
    summary:
      "The 500 Fellowship, 500 Global's flagship program, offers up to $50,000 at entry with potential for up to $1M more, in person in San Francisco.",
    investment: "Up to $50,000 right away, with the potential for up to $1M more as the company progresses",
    duration: "Four months (the cohort starting 30 November 2026 ends 9 April 2027)",
    location: "In person, San Francisco",
    sources: ["https://500.co/founders/flagship"],
  },
  {
    slug: "antler",
    name: "Antler",
    model: "Residency and pre-seed investor",
    summary:
      "Antler's US residency has no fee to join and an initial commitment of typically $500K–$1M. Terms and residency length vary by location.",
    investment: "US: initial commitment typically $500K–$1M, plus $650K in partner credits",
    fee: "None to join the US residency",
    duration: "US: up to 3 months; Australia: 8-week residency in February and July",
    note: "Antler publishes terms per location. Equity is not stated on the pages checked.",
    sources: ["https://www.antler.co/location/us", "https://www.antler.co/location/australia"],
  },
  {
    slug: "berkeley-skydeck",
    name: "Berkeley SkyDeck",
    model: "University accelerator",
    summary:
      "Berkeley SkyDeck's Cohort Program invests $210,000 for 7.25%, usually on a post-money SAFE, and charges a $7,500 program fee per startup.",
    investment: "$210,000 from the Berkeley SkyDeck Fund",
    equity: "7.25%, usually through a post-money SAFE",
    fee: "$7,500 per startup",
    duration: "Six months",
    location: "Berkeley, California",
    sources: ["https://skydeck.berkeley.edu/program/"],
  },
  {
    slug: "era",
    name: "ERA",
    model: "Accelerator",
    summary: "ERA invests $150,000 on a post-money SAFE for 6% of each company, in a four-month program in New York City.",
    investment: "$150,000 on a post-money SAFE",
    equity: "6%",
    duration: "Four months; programs start in January and June",
    location: "In person, New York City",
    sources: ["https://www.eranyc.com/", "https://www.eranyc.com/faq/"],
  },
  {
    slug: "startmate",
    name: "Startmate",
    model: "Accelerator",
    summary:
      "Startmate invests A$120,000 at a A$1.5M post-money valuation (8%) and charges no program fees. The program runs 14 weeks.",
    investment: "A$120,000 at a A$1.5M post-money valuation (matched terms if you have already raised A$250K or more)",
    equity: "8%, through a SAFE or a priced equity round",
    fee: "None",
    duration: "14 weeks",
    location: "Remote-first, with in-person weeks in Melbourne",
    sources: ["https://www.startmate.com/accelerator"],
  },
  {
    slug: "tinyseed",
    name: "TinySeed",
    model: "Remote accelerator for SaaS",
    summary:
      "TinySeed invests $120,000–$220,000 for 10–12% equity in SaaS companies under $1M ARR. A $7,450 per-founder fee comes out of the investment.",
    investment: "$120,000–$220,000 per company",
    equity: "10–12%",
    fee: "$7,450 per founder, taken from the investment (the offer is increased to cover it)",
    duration: "One year",
    location: "Remote, with an in-person kickoff retreat",
    note: "For revenue-generating SaaS below $1M ARR. The next applications open in 2027.",
    sources: ["https://tinyseed.com/program"],
  },
  {
    slug: "muckerlab",
    name: "MuckerLab",
    model: "Pre-seed accelerator",
    summary: "MuckerLab typically invests $100,000–$175,000 for a 10–15% equity stake. Relocation is not required.",
    investment: "Typically $100,000–$175,000",
    equity: "10–15%",
    duration: "About 12 months on average (3 to 24 months)",
    location: "No relocation required; offices in Los Angeles",
    sources: ["https://mucker.com/accelerator/"],
  },
  {
    slug: "hax",
    name: "HAX",
    model: "Hard-tech accelerator",
    summary:
      "HAX's first investment is $250,000 ($150,000 cash plus $100,000 in kind) on a post-money SAFE with no valuation cap, with a six-month residency.",
    investment: "$250,000 first investment ($150,000 cash + $100,000 in kind); up to $550,000 in initial pre-seed funding",
    equity: "Post-money SAFE with no valuation cap",
    duration: "Six-month residency",
    location: "Newark, New Jersey for most teams; also Shenzhen, Pune and Tokyo",
    sources: ["https://hax.co/faq/", "https://hax.co/program/"],
  },
  {
    slug: "hexa",
    name: "Hexa",
    model: "Venture studio",
    summary:
      "Hexa's Start track invests €700,000 for 33.33% at incorporation; its Sprint track offers €500,000 through two convertible instruments.",
    investment: "Start: €700,000 (€400,000 in support + €300,000 cash). Sprint: €500,000 through two instruments",
    equity: "Start: 33.33% at incorporation. Sprint: 4% for a €20,000 convertible, plus a €480,000 convertible note with an €8M cap",
    duration: "Start: about 12 months. Sprint: 6 months",
    location: "Paris (Start); remote-friendly (Sprint)",
    sources: ["https://www.hexa.com/start/deal", "https://www.hexa.com/faq"],
  },
  {
    slug: "carbon13",
    name: "Carbon13",
    model: "Climate venture accelerator",
    summary:
      "Carbon13 founders can pitch for €150,000–€250,000 on a SAFE targeting 4–7% equity; Phase 1 startups grant Carbon13 1% in options.",
    investment: "The chance to pitch for €150,000–€250,000 from Carbon13",
    equity: "The SAFE targets 4–7%; Phase 1 startups grant Carbon13 1% in options",
    duration: "Phase 1: 8 weeks. Phase 2: 12 months",
    location: "Phase 1 is remote; companies must be registered in the UK or EU",
    sources: ["https://carbonthirteen.com/programmes/venture-accelerator/"],
  },
  {
    slug: "founder-institute",
    name: "Founder Institute",
    model: "Pre-accelerator",
    summary:
      "Founder Institute charges an entrance fee that varies by chapter and takes a warrant for 2.5% of future equity, which activates only at a qualifying financing.",
    equity: "2.5% of future equity through a warrant, activated only by a qualifying financing; no board seat or votes",
    fee: "Entrance fee varies by chapter (for example, $349 for the Colombia cohort); teams of 2–3 pay 1.5x",
    duration: "10 sessions plus a Funding Day",
    location: "Chapters in many cities, plus online cohorts",
    sources: ["https://fi.co/equity", "https://fi.co/"],
  },
  {
    slug: "entrepreneur-first",
    name: "Entrepreneur First",
    model: "Talent investor (pre-team)",
    summary:
      "Entrepreneur First invests up to $250,000 once you form a company. You can join without an idea or a co-founder; local terms vary.",
    investment: "Up to $250,000 once you form a company; local terms vary",
    duration: "12 weeks in a local hub (FORM), then 12 weeks in San Francisco (LAUNCH)",
    location: "In person: London, Bangalore, San Francisco",
    sources: ["https://www.joinef.com/", "https://www.joinef.com/faqs/"],
  },
  {
    slug: "creative-destruction-lab",
    name: "Creative Destruction Lab",
    model: "Objectives-based program for deep tech",
    summary: "Creative Destruction Lab takes no equity and charges no fees. There is no guaranteed investment.",
    investment: "No guaranteed investment",
    equity: "None",
    fee: "None",
    duration: "Objective-setting sessions roughly every two months",
    location: "Many locations, in person and online",
    sources: ["https://creativedestructionlab.com/faq/"],
  },
  {
    slug: "startx",
    name: "StartX",
    model: "Stanford founder community",
    summary: "StartX takes no equity and charges no fees. It is open to Stanford founders.",
    equity: "None",
    fee: "None",
    note: "Open to Stanford founders.",
    sources: ["https://web.startx.com/"],
  },
  {
    slug: "foundersboost",
    name: "FoundersBoost",
    model: "Pre-accelerator",
    summary: "FoundersBoost runs a six-week pre-accelerator for pre-seed tech startups with no equity and no fees.",
    equity: "None",
    fee: "None",
    duration: "Six weeks",
    location: "City chapters",
    sources: ["https://foundersboost.com/pre-accelerator"],
  },
  {
    slug: "mit-delta-v",
    name: "MIT delta v",
    model: "University accelerator",
    summary: "MIT delta v gives teams $75,000 in equity-free funding over a summer program in Cambridge, Massachusetts.",
    investment: "$75,000 equity-free funding",
    equity: "None",
    duration: "Summer (2026: 1 June to 11 September)",
    location: "Cambridge, Massachusetts",
    sources: ["https://entrepreneurship.mit.edu/accelerator/program/"],
  },
  {
    slug: "start-up-chile",
    name: "Start-Up Chile",
    model: "Government-backed accelerator",
    summary: "Start-Up Chile provides equity-free funding to tech-based startups at any stage. Amounts are set in each call's terms.",
    investment: "Equity-free funding; amounts are set in each call's terms",
    equity: "None",
    location: "Chile",
    sources: ["https://startupchile.org/"],
  },
  {
    slug: "google-for-startups-accelerator",
    name: "Google for Startups Accelerator",
    model: "Corporate accelerator",
    summary: "Google for Startups Accelerator is equity-free. Startups receive product credits and support, ideally between seed and Series A.",
    investment: "No cash investment; eligible startups receive product credits",
    equity: "None",
    location: "Regional programs, mixing remote and in-person sessions",
    sources: ["https://startup.google.com/programs/accelerator/"],
  },
  {
    slug: "google-for-startups-black-founders-fund",
    name: "Google for Startups Black Founders Fund",
    model: "Non-dilutive fund",
    summary: "The Google for Startups Black Founders Fund provides cash awards without taking equity.",
    investment: "Cash awards",
    equity: "None",
    sources: ["https://startup.google.com/programs/black-founders-fund/"],
  },
  {
    slug: "plug-and-play",
    name: "Plug and Play",
    model: "Corporate innovation platform",
    summary: "Plug and Play's accelerator programs do not require equity. They are customised three-month programs built around corporate partners.",
    equity: "None required for the accelerator programs",
    duration: "Customised 3-month programs",
    sources: ["https://www.plugandplaytechcenter.com/innovation-services/startups/accelerator-programs"],
  },
  {
    slug: "parallel18",
    name: "Parallel18",
    model: "Accelerator",
    summary: "Parallel18 invests $100,000 via a SAFE in early-stage startups, with a 16-week program in Puerto Rico.",
    investment: "$100,000 via a SAFE",
    equity: "SAFE (percentage not published)",
    duration: "16 weeks, plus a 4-week virtual Phase Zero",
    location: "In person in Puerto Rico (required for the team leader)",
    note: "Applications were closed when checked.",
    sources: ["https://parallel18.com/p18/"],
  },
  {
    slug: "gener8tor",
    name: "gener8tor",
    model: "Accelerator",
    summary: "gener8tor's investment accelerators invest $100,000 for equity over 12 weeks; its gBETA accelerators are free 7-week programs.",
    investment: "$100,000 in its investment accelerators",
    equity: "Equity (percentage not published)",
    fee: "None for gBETA, its no-cost 7-week accelerator",
    duration: "12 weeks",
    sources: ["https://www.gener8tor.com/investment-accelerators", "https://www.gener8tor.com/faqs"],
  },
  {
    slug: "launch-accelerator",
    name: "LAUNCH Accelerator",
    model: "Accelerator",
    summary: "LAUNCH Accelerator offers $125,000 in funding and 14 weeks of building.",
    investment: "$125,000",
    duration: "14 weeks",
    sources: ["https://launchaccelerator.co/"],
  },
  {
    slug: "angelpad",
    name: "AngelPad",
    model: "Accelerator",
    summary: "AngelPad invests $120,000 in each company over a three-month program in New York and San Francisco. Applications are closed.",
    investment: "$120,000 per company",
    duration: "Three months",
    location: "New York City and San Francisco",
    note: "Applications were closed when checked.",
    sources: ["https://angelpad.com/"],
  },
  {
    slug: "fledge",
    name: "Fledge",
    model: "Impact accelerator",
    summary: "Fledge invests $15,000–$20,000 (€15,000 in Europe) using revenue-based equity that the company later buys back, over two months.",
    investment: "$15,000 (Peru), €15,000 (Europe) or $20,000 (US)",
    equity: "Revenue-based equity: shares the company buys back over time",
    duration: "Two months",
    sources: ["https://fledge.co/", "https://www.fledge.co/about/startups/"],
  },
  {
    slug: "founderfuel",
    name: "FounderFuel",
    model: "Accelerator",
    summary: "FounderFuel's published terms are CA$120,000: a CA$100,000 SAFE plus CA$20,000 for 5% in founder shares, over 16 weeks in Montreal.",
    investment: "CA$120,000: a CA$100,000 SAFE (20% discount, CA$4M post-money cap) plus CA$20,000 equity investment",
    equity: "5% in founder shares for the CA$20,000, plus the SAFE",
    duration: "16 weeks",
    location: "Montreal",
    note: "These terms come from FounderFuel's 2023 program FAQ; confirm current terms before applying.",
    sources: ["https://founderfuel.com/about/"],
  },
  {
    slug: "alchemist-accelerator",
    name: "Alchemist Accelerator",
    model: "Accelerator for technical founders",
    summary: "Alchemist invests $60,000 to $1 million in pre-seed and seed startups with deeply technical founders.",
    investment: "$60,000 to $1 million",
    location: "San Francisco",
    sources: ["https://www.alchemist.vc/"],
  },
  {
    slug: "catalyst-fund",
    name: "Catalyst Fund",
    model: "Accelerator and pre-seed fund",
    summary: "Catalyst Fund invests $200,000 in pre-seed climate adaptation and resilience startups in Africa, with follow-on at seed and Series A.",
    investment: "$200,000, with follow-on at seed and Series A",
    duration: "About six months",
    sources: ["https://www.thecatalystfund.com/"],
  },
  {
    slug: "dreamit-ventures",
    name: "Dreamit Ventures",
    model: "Venture fund with a growth program",
    summary: "Dreamit initially invests $500,000–$1.5M in pre-Series A US companies for a small amount of equity, and reserves similar amounts for follow-ons.",
    investment: "$500,000–$1.5M initially, with similar amounts reserved for follow-ons",
    equity: "A small amount of equity (percentage not published)",
    note: "For pre-Series A companies with early revenue or pilots; a US C-Corp is required.",
    sources: ["https://www.dreamit.com/faq"],
  },
  {
    slug: "zinc",
    name: "Zinc",
    model: "Venture builder for science-for-impact",
    summary: "Zinc makes an initial investment of up to £250,000 in early-stage UK science-for-impact ventures.",
    investment: "Up to £250,000 initial investment",
    location: "United Kingdom",
    sources: ["https://www.zinc.vc/programmes/pre-seed-investment/"],
  },
  {
    slug: "1871-accelerator",
    name: "1871",
    model: "Membership incubator",
    summary: "1871 is a Chicago membership incubator: $200 a month for individuals or $500 a month for teams, with 14-week program tracks.",
    fee: "Individual: $200/month or $2,000/year. Team: $500/month or $5,000/year",
    duration: "14-week tracks, rolling entry",
    location: "Chicago, plus remote programming",
    sources: ["https://1871.com/membership/early-stage/"],
  },
  {
    slug: "seedcamp",
    name: "Seedcamp",
    model: "Seed fund",
    summary: "Seedcamp is a seed fund, not a cohort accelerator. Its first cheque is usually $350K–$1.25M, through a convertible or an equity round.",
    investment: "First cheque usually $350K–$1.25M",
    equity: "Convertible or equity structure",
    sources: ["https://seedcamp.com/faqs/"],
  },
  {
    slug: "wayra",
    name: "Wayra",
    model: "Corporate venture investor",
    summary: "Wayra invests €150K to €5M in qualified rounds alongside VCs, taking minority stakes as a strategic investor.",
    investment: "€150K to €5M, alongside VCs",
    equity: "Minority stakes",
    sources: ["https://wayra.com/investment"],
  },
  {
    slug: "the-venture-city",
    name: "TheVentureCity",
    model: "Series A fund",
    summary: "TheVentureCity invests $2.5–4M in Series A companies with evidence of product-market fit. It is a fund, not an early-stage accelerator.",
    investment: "$2.5–4M for Series A companies",
    sources: ["https://www.theventure.city/how-we-invest"],
  },
];

export const ACCELERATOR_PROFILE_BASE = "/insighta/accelerator";
export const acceleratorProfilePath = (slug: string) => `${ACCELERATOR_PROFILE_BASE}/${slug}`;

export const getAcceleratorTerms = (slug?: string | null) =>
  slug ? ACCELERATOR_TERMS.find((terms) => terms.slug === slug) : undefined;

/** <title> for a public profile, 60 characters or fewer. */
export const acceleratorTermsTitle = (terms: AcceleratorTerms) => {
  const long = `${terms.name}: Investment, Equity & Fees`;
  return long.length <= 60 ? long : `${terms.name}: Terms`;
};

/** "Techstars'" / "ERA's", for "checked against X's own website". */
export const possessiveName = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

/** "23 November 2026", for "checked on" lines. */
export const formatCheckedAt = (iso: string = ACCELERATOR_TERMS_CHECKED_AT) => {
  const [year, month, day] = iso.split("-").map(Number);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${day} ${months[month - 1]} ${year}`;
};

/** The labelled rows shown on the page and in the crawler HTML, in display order. */
export const acceleratorTermRows = (terms: AcceleratorTerms) =>
  (
    [
      ["Type", terms.model],
      ["Investment", terms.investment],
      ["Equity", terms.equity],
      ["Program fee", terms.fee],
      ["Length", terms.duration],
      ["Location", terms.location],
    ] as Array<[string, string | undefined]>
  ).filter((row): row is [string, string] => Boolean(row[1]));
