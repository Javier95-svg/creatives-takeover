export type DirectoryCategory =
  | 'aggregator'
  | 'community'
  | 'newsletter'
  | 'review'
  | 'social'
  | 'vc-platform';

export type CostType = 'free' | 'freemium' | 'paid';

export interface LaunchDirectory {
  name: string;
  url: string;
  cost: string;
  costType: CostType;
  category: DirectoryCategory;
  description: string;
  recommendation: string;
  bestFor: string;
}

export const CATEGORY_LABELS: Record<DirectoryCategory, string> = {
  aggregator: 'Aggregator',
  community: 'Community',
  newsletter: 'Newsletter',
  review: 'Review Site',
  social: 'Social',
  'vc-platform': 'VC / Investor',
};

export const LAUNCH_DIRECTORIES: LaunchDirectory[] = [
  // ── Aggregators ──────────────────────────────────────────────────
  {
    name: 'Product Hunt',
    url: 'https://www.producthunt.com/posts/new',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'The most prominent daily leaderboard for new products. Makers submit, the community upvotes, and top products get massive visibility on launch day.',
    recommendation:
      'Schedule your launch for a Tuesday–Thursday, line up hunters and supporters in advance, and post at 12:01 AM PT.',
    bestFor: 'SaaS, dev tools, consumer apps, Chrome extensions',
  },
  {
    name: 'BetaList',
    url: 'https://betalist.com/startups/new',
    cost: 'Free (2–4 week queue) / $129 featured',
    costType: 'freemium',
    category: 'aggregator',
    description:
      'Curated directory of upcoming startups and products in beta. Great for collecting early waitlist signups before your public launch.',
    recommendation:
      'Submit early — the free queue takes weeks. Pay $129 to skip the queue if you have a hard launch date.',
    bestFor: 'Pre-launch waitlists, early adopters, B2C and B2B SaaS',
  },
  {
    name: 'Peerpush',
    url: 'https://peerpush.net',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Peer-driven product launch platform where makers upvote each other's launches. Smaller audience than Product Hunt but higher reciprocity.',
    recommendation:
      'Best used alongside Product Hunt — cross-promote on the same day to stack discovery.',
    bestFor: 'Indie makers, side projects, SaaS tools',
  },
  {
    name: 'Dev Hunt',
    url: 'https://devhunt.org',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Product Hunt for developer tools. Weekly leaderboard focused exclusively on dev-facing products.',
    recommendation:
      'If your tool targets developers, this is a must-submit. The audience is highly technical and conversion-ready.',
    bestFor: 'Dev tools, APIs, CLIs, developer productivity',
  },
  {
    name: 'SaaSHub',
    url: 'https://www.saashub.com/suggest',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Software discovery platform that aggregates SaaS tools and their alternatives. Getting listed improves SEO through "alternative to X" searches.',
    recommendation:
      'Submit your product and add the tools you replace as alternatives to capture intent-based search traffic.',
    bestFor: 'B2B SaaS with established competitors',
  },
  {
    name: 'Launching.rocks',
    url: 'https://launching.rocks',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Weekly curated list of new product launches sent to a newsletter audience of early adopters.',
    recommendation:
      'Submit the week before or during your launch to time the newsletter mention with your Product Hunt day.',
    bestFor: 'Any category — especially SaaS and productivity tools',
  },
  {
    name: 'Microlaunch',
    url: 'https://microlaunch.net',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Daily directory of micro-SaaS and indie products. Good SEO value and a community of builders who support each other.',
    recommendation:
      'Great for bootstrapped products — the audience skews indie maker and early adopter.',
    bestFor: 'Micro-SaaS, solo founder products, bootstrapped startups',
  },
  {
    name: 'Uneed',
    url: 'https://www.uneed.best',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Daily product listing site with a voting system. Smaller than Product Hunt but has a loyal and engaged community.',
    recommendation:
      'Submit on your Product Hunt launch day to capture additional votes and visibility across platforms.',
    bestFor: 'Productivity tools, no-code, SaaS',
  },
  {
    name: 'StartupBuffer',
    url: 'https://startupbuffer.com',
    cost: 'Free / $19 featured',
    costType: 'freemium',
    category: 'aggregator',
    description:
      'Directory of new startups with social sharing features. Submissions are tweeted to their audience.',
    recommendation:
      'The $19 featured placement gets you a tweet and front-page spot — good value for the launch week.',
    bestFor: 'Early-stage startups, any category',
  },
  {
    name: 'Pitchwall',
    url: 'https://pitchwall.co',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Community-curated wall of startup pitches. Users vote on pitches and give feedback, making it useful for early validation.',
    recommendation:
      'Use Pitchwall before your public launch to practice your pitch and gather feedback from a startup-savvy audience.',
    bestFor: 'Pre-launch validation, refining your pitch',
  },
  {
    name: 'Erlibird',
    url: 'https://erlibird.com',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Platform for launching and discovering early-stage products. Users sign up to test beta products.',
    recommendation:
      'Good for collecting beta testers and early feedback before a full public launch.',
    bestFor: 'Beta testing, early adopter acquisition',
  },
  {
    name: 'StartupRanking',
    url: 'https://www.startupranking.com',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Global ranking directory of startups. Listing improves web presence and is indexed by search engines.',
    recommendation:
      'Submit for the SEO backlink — it won't drive traffic directly but helps your domain authority.',
    bestFor: 'Any startup looking to improve SEO presence',
  },
  {
    name: 'EU-Startups',
    url: 'https://www.eu-startups.com/submit-your-startup/',
    cost: 'Free',
    costType: 'free',
    category: 'aggregator',
    description:
      'Leading media and directory for European startups. Submission can lead to editorial coverage.',
    recommendation:
      'If you're based in Europe or targeting the EU market, this is one of the most credible platforms to be listed on.',
    bestFor: 'European startups, B2B SaaS, fintech, healthtech',
  },
  {
    name: 'AppSumo',
    url: 'https://partners.appsumo.com',
    cost: 'Revenue share (typically 70/30 after fees)',
    costType: 'freemium',
    category: 'aggregator',
    description:
      'Marketplace for lifetime software deals. Running an AppSumo deal brings a massive burst of paying customers in exchange for a discounted lifetime price.',
    recommendation:
      'Only consider AppSumo once your product is stable. The deal brings volume but also heavy support load — set clear limits on seats/LTD.',
    bestFor: 'B2B SaaS with a stable product and strong support capacity',
  },

  // ── Communities ───────────────────────────────────────────────────
  {
    name: 'Hacker News (Show HN)',
    url: 'https://news.ycombinator.com/submit',
    cost: 'Free',
    costType: 'free',
    category: 'community',
    description:
      'The most influential tech community in the world. A "Show HN" post lets you share what you've built directly with engineers, founders, and investors.',
    recommendation:
      'Write a one-sentence "Show HN: [what it is]" title, engage every comment personally, and post between 9–11 AM ET on a weekday.',
    bestFor: 'Dev tools, technical SaaS, open-source, APIs',
  },
  {
    name: 'Indie Hackers',
    url: 'https://www.indiehackers.com/products',
    cost: 'Free',
    costType: 'free',
    category: 'community',
    description:
      'Community of bootstrapped founders sharing revenue numbers, lessons, and product updates. Listing your product here and posting milestones builds an ongoing audience.',
    recommendation:
      'Be transparent with numbers — the community responds best to honest revenue updates and lessons learned.',
    bestFor: 'Bootstrapped SaaS, solo founders, indie makers',
  },
  {
    name: 'Peerlist',
    url: 'https://peerlist.io',
    cost: 'Free',
    costType: 'free',
    category: 'community',
    description:
      'Professional network for tech builders and makers. Weekly "Launch Week" feature gives your product coordinated exposure across the platform.',
    recommendation:
      'Participate in Peerlist Launch Week for a structured launch with community support — coordinate with other makers to cross-promote.',
    bestFor: 'Dev tools, SaaS, open-source, design tools',
  },
  {
    name: 'DEV.to',
    url: 'https://dev.to/new',
    cost: 'Free',
    costType: 'free',
    category: 'community',
    description:
      'Developer community and blogging platform. Writing a detailed "how I built X" post around your launch drives qualified developer traffic.',
    recommendation:
      'Publish a technical deep-dive or tutorial that naturally introduces your product — hard pitches don't work here.',
    bestFor: 'Developer tools, open-source, APIs, technical SaaS',
  },
  {
    name: 'Lobsters',
    url: 'https://lobste.rs',
    cost: 'Free (invite only)',
    costType: 'free',
    category: 'community',
    description:
      'Invite-only link aggregator for the technical community. High signal-to-noise ratio and deeply technical audience.',
    recommendation:
      'Only relevant if your product is highly technical. Get an invite from a current member before launch.',
    bestFor: 'Open-source tools, developer utilities, security software',
  },

  // ── Social ────────────────────────────────────────────────────────
  {
    name: 'Reddit (r/startups, r/SaaS, r/entrepreneur)',
    url: 'https://www.reddit.com/r/startups/submit',
    cost: 'Free',
    costType: 'free',
    category: 'social',
    description:
      'Multiple subreddits cover different aspects of building a startup. r/startups for building stories, r/SaaS for product launches, r/entrepreneur for general founder topics.',
    recommendation:
      'Lead with value — share what you learned, not just what you built. Read each subreddit's rules before posting. Avoid overt promotion.',
    bestFor: 'B2B SaaS, bootstrapped startups, founder stories',
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com',
    cost: 'Free',
    costType: 'free',
    category: 'social',
    description:
      'The most effective organic channel for B2B founders. Personal posts from the founder consistently outperform company page posts.',
    recommendation:
      'Post a launch announcement from your personal profile with a hook, story, and CTA. Tag relevant people and reply to every comment within the first hour.',
    bestFor: 'B2B SaaS, enterprise software, professional tools',
  },
  {
    name: 'Twitter / X',
    url: 'https://twitter.com',
    cost: 'Free',
    costType: 'free',
    category: 'social',
    description:
      'Still a primary channel for startup and tech announcements. Threads about your build journey or launch day perform especially well.',
    recommendation:
      'Use a launch thread with screenshots or a demo GIF. Tag Product Hunt, relevant influencers, and use #buildinpublic.',
    bestFor: 'Consumer apps, developer tools, AI products, B2C SaaS',
  },

  // ── Newsletters ───────────────────────────────────────────────────
  {
    name: 'HackerNoon',
    url: 'https://hackernoon.com/start-blogging',
    cost: 'Free',
    costType: 'free',
    category: 'newsletter',
    description:
      'Tech publication with 4M+ monthly readers. Publishing a story about your product or startup journey reaches a large tech-savvy audience.',
    recommendation:
      'Write an educational or story-driven article — not a press release. Mention your product naturally within the content.',
    bestFor: 'Tech products, developer tools, AI/ML startups',
  },

  // ── Review Sites ──────────────────────────────────────────────────
  {
    name: 'G2',
    url: 'https://sell.g2.com/claim-your-profile',
    cost: 'Free (basic profile)',
    costType: 'freemium',
    category: 'review',
    description:
      'The leading B2B software review platform. A G2 profile with reviews improves credibility and captures buyers actively comparing tools.',
    recommendation:
      'Claim your free profile early. Ask your first 5–10 customers to leave a review — even a few reviews puts you on the comparison radar.',
    bestFor: 'B2B SaaS targeting SMB or enterprise buyers',
  },
  {
    name: 'Capterra',
    url: 'https://www.capterra.com/vendors/sign-up',
    cost: 'Free (basic profile) / Paid PPC',
    costType: 'freemium',
    category: 'review',
    description:
      'Software comparison site owned by Gartner. Especially strong for SMB buyers in specific verticals like HR, legal, healthcare.',
    recommendation:
      'Claim your listing for the backlink and social proof. PPC ads on Capterra are expensive but can work at scale for the right niche.',
    bestFor: 'Vertical SaaS, SMB-focused tools, HR/legal/finance software',
  },
  {
    name: 'AlternativeTo',
    url: 'https://alternativeto.net/list-software/',
    cost: 'Free',
    costType: 'free',
    category: 'review',
    description:
      'Directory where users list and vote on software alternatives. Being listed as an alternative to popular tools drives intent-based search traffic.',
    recommendation:
      'Add your product as an alternative to your 3–5 top competitors. People searching "alternative to [competitor]" are high-intent buyers.',
    bestFor: 'Any SaaS with established competitors',
  },

  // ── VC / Investor ─────────────────────────────────────────────────
  {
    name: 'Wellfound (AngelList)',
    url: 'https://wellfound.com/company/signup',
    cost: 'Free',
    costType: 'free',
    category: 'vc-platform',
    description:
      'Primary platform for startup hiring and investor discovery. A strong Wellfound profile is expected by investors and early hires alike.',
    recommendation:
      'Keep your profile updated with traction metrics. Investors and candidates check Wellfound before reaching out.',
    bestFor: 'VC-backed or fundraising startups, hiring early team members',
  },
  {
    name: 'Crunchbase',
    url: 'https://www.crunchbase.com/add-new-entity',
    cost: 'Free (basic profile)',
    costType: 'freemium',
    category: 'vc-platform',
    description:
      'The standard database for startup funding, team, and news. Investors and journalists rely on Crunchbase to vet companies.',
    recommendation:
      'Claim your profile and keep funding rounds updated. An incomplete Crunchbase page creates doubt — fill in founders, launch date, and description.',
    bestFor: 'Any startup seeking investment or press coverage',
  },
  {
    name: 'F6S',
    url: 'https://www.f6s.com/company/profile',
    cost: 'Free',
    costType: 'free',
    category: 'vc-platform',
    description:
      'Global platform for startup programs, accelerators, and grants. Lists thousands of programs founders can apply to.',
    recommendation:
      'Use F6S primarily to discover and apply to accelerator programs and grants — not for direct product launch traffic.',
    bestFor: 'Startups actively applying to accelerators or seeking grants',
  },
];
