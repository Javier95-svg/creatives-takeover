/**
 * Copy for the founder and investor pages (/for-founders, /for-investors),
 * kept in one place so positioning edits stay in one file. The programs page
 * became its own design at /enterprise (src/data/enterprisePage.ts).
 *
 * B2B2C repositioning, 2026-10-15: programs and investors pay to put the
 * platform in front of their founders; founders keep using it free to start.
 *
 * Copy rules (product positioning):
 * - never promise or imply investment to a founder;
 * - founder-facing copy never calls the platform an accelerator (naming
 *   accelerators as an audience is fine);
 * - no stock startup phrasing ("from idea to launch", "step by step");
 * - the dashboard and report previews are examples and are labelled as such.
 *
 * Pure data with no imports, so node tests can read it directly. The SEO
 * title and description are mirrored in scripts/seo-route-config.mjs for the
 * prerendered HTML; tests/audience-pages.test.ts keeps the two in step.
 */

export type AudienceKey = 'founders' | 'investors';

export type AudienceIcon =
  | 'dashboard'
  | 'report'
  | 'workspace'
  | 'sponsor'
  | 'match'
  | 'evidence'
  | 'tools'
  | 'people';

export type AudienceCta =
  | { label: string; kind: 'link'; href: string }
  | { label: string; kind: 'scroll'; target: string }
  | { label: string; kind: 'signup'; accountType: 'investor' | 'founder' };

export interface AudienceCard {
  title: string;
  body: string;
  icon?: AudienceIcon;
}

export interface AudienceSection {
  badge: string;
  title: string;
  copy?: string;
}

export interface AudiencePageContent {
  key: AudienceKey;
  path: string;
  navLabel: string;
  seo: { title: string; description: string; keywords: string };
  badge: string;
  titleLead: string;
  titleAccent: string;
  lede: string;
  primaryCta: AudienceCta;
  secondaryCta: AudienceCta;
  problem: AudienceSection & { items: AudienceCard[] };
  offer: AudienceSection & { items: AudienceCard[] };
  steps: AudienceSection & { items: AudienceCard[] };
  preview: AudienceSection;
  trust: { title: string; body: string };
  crossLink?: { text: string; label: string; href: string };
  faqs: Array<{ question: string; answer: string }>;
  contact?: {
    title: string;
    copy: string;
    defaultOrgType: InstitutionOrgType;
    submitLabel: string;
  };
  closing?: { title: string; copy: string; cta: AudienceCta };
}

export type InstitutionOrgType =
  | 'incubator'
  | 'accelerator'
  | 'university'
  | 'vc'
  | 'family_office'
  | 'other';

/** Labels for the contact form, and the role value the contact function stores. */
export const INSTITUTION_ORG_TYPES: ReadonlyArray<{ value: InstitutionOrgType; label: string; role: string }> = [
  { value: 'incubator', label: 'Incubator', role: 'accelerator' },
  { value: 'accelerator', label: 'Accelerator', role: 'accelerator' },
  { value: 'university', label: 'University or business school program', role: 'university' },
  { value: 'vc', label: 'Venture capital fund', role: 'vc' },
  { value: 'family_office', label: 'Family office', role: 'family_office' },
  { value: 'other', label: 'Other', role: 'other' },
];

export const INSTITUTION_SIZES = ['Under 10 teams', '10 to 25 teams', '25 to 50 teams', 'More than 50 teams', 'Not sure yet'] as const;

export const FOR_INVESTORS: AudiencePageContent = {
  key: 'investors',
  path: '/for-investors',
  navLabel: 'For investors',
  seo: {
    title: 'For VCs and Family Offices | Creatives Takeover',
    description: 'Sponsor a founder cohort in your thesis area, or get matched with early founders who chose to share their progress with investors.',
    keywords: 'pre-seed deal flow, sponsored founder cohort, family office deal flow, early stage startup sourcing, founder progress, investor matching',
  },
  badge: 'For VCs and family offices',
  titleLead: 'Meet founders',
  titleAccent: 'while they’re still building.',
  lede: 'Creatives Takeover is where early founders test and build their ideas. Sponsor a cohort in your thesis area, or create an investor account and get matched with teams whose progress you can read.',
  primaryCta: { label: 'Sponsor a cohort', kind: 'scroll', target: 'talk' },
  secondaryCta: { label: 'Create an investor account', kind: 'signup', accountType: 'investor' },
  problem: {
    badge: 'The gap',
    title: 'Early teams are hard to read',
    copy: 'At pre-seed, most of what you see is the pitch. What a team has actually tested is much harder to find.',
    items: [
      {
        title: 'Polish isn’t progress',
        body: 'Early decks look alike. Whether a team has spoken to buyers or tested demand rarely shows on a slide.',
      },
      {
        title: 'Good teams are found late',
        body: 'By the time a strong team is visible to everyone, its round is already crowded.',
      },
      {
        title: 'Every first call starts from zero',
        body: 'The first meeting goes on rebuilding what the team has already done, instead of what comes next.',
      },
    ],
  },
  offer: {
    badge: 'Two ways in',
    title: 'Sponsor a cohort, or find teams on your own',
    items: [
      {
        icon: 'sponsor',
        title: 'Sponsored cohort',
        body: 'Fund a cohort under your brand, by thesis area, region or university. Founders use the platform free, and you follow the teams that choose to share their progress with you.',
      },
      {
        icon: 'match',
        title: 'Investor account',
        body: 'Set the sectors and stages you invest in and get matched with founders who opted in to be visible to investors.',
      },
      {
        icon: 'evidence',
        title: 'Progress you can read',
        body: 'A team’s customer definition, demand test, validation decision and first customers are recorded as they happen, dated and in the founder’s own words.',
      },
    ],
  },
  steps: {
    badge: 'How a sponsored cohort works',
    title: 'Your focus, our workspace',
    items: [
      {
        title: 'Choose the focus',
        body: 'A thesis area, a region or a university you want to be close to. We agree the size and length together.',
      },
      {
        title: 'The cohort opens under your brand',
        body: 'Founders join free of charge and work through the same stages and tools as every team on the platform.',
      },
      {
        title: 'Follow the teams that execute',
        body: 'See the progress of the founders who opted in, and reach out when the timing is right for both sides.',
      },
    ],
  },
  preview: {
    badge: 'What you can see',
    title: 'One team’s progress, dated',
    copy: 'An example with a fictional team. You only see founders who chose to share their progress with investors.',
  },
  trust: {
    title: 'Founders decide what you see.',
    body: 'Visibility is opt-in, founder by founder. No one is shared with you without their consent, and sponsoring a cohort doesn’t commit you, or the founders, to an investment.',
  },
  faqs: [
    {
      question: 'Do I need to sponsor a cohort to use the platform?',
      answer: 'No. You can create an investor account on your own and get matched with founders who opted in. Sponsoring is for funds and family offices that want a cohort in their focus area.',
    },
    {
      question: 'What does a sponsored cohort cost?',
      answer: 'It depends on the size and length of the cohort. Tell us what you have in mind and we’ll send a proposal.',
    },
    {
      question: 'Which founders will I see?',
      answer: 'Only founders who chose to be visible to investors, matched on the sectors and stages you set.',
    },
    {
      question: 'Does sponsoring mean investing in the teams?',
      answer: 'No. Sponsoring pays for the founders’ cohort. Whether you invest later is between you and each team.',
    },
  ],
  contact: {
    title: 'Talk to us about a sponsored cohort',
    copy: 'Tell us about your fund and the founders you want to be close to. We’ll reply with how a cohort could work.',
    defaultOrgType: 'vc',
    submitLabel: 'Send',
  },
};

export const FOR_FOUNDERS: AudiencePageContent = {
  key: 'founders',
  path: '/for-founders',
  navLabel: 'For founders',
  seo: {
    title: 'For Founders and Builders | Creatives Takeover',
    description: 'Start and test your project in one workspace: a tool for every stage, plus mentors, service providers, investors and other founders. Free to start, no equity.',
    keywords: 'startup idea validation, founder workspace, MVP builder, ICP builder, startup mentors, early stage founder tools',
  },
  badge: 'For founders and builders',
  titleLead: 'Start and test',
  titleAccent: 'your project here.',
  lede: 'Define who you are building for, put your idea in front of real buyers and build what they ask for, with mentors, service providers, investors and other founders in the same place.',
  primaryCta: { label: 'Start free', kind: 'link', href: '/#get-started' },
  secondaryCta: { label: 'See how it works', kind: 'link', href: '/demo' },
  problem: {
    badge: 'Why founders get stuck',
    title: 'Most projects stall in the same places',
    items: [
      {
        title: 'Building before anyone asked',
        body: 'Months go into a product before a single buyer has seen it.',
      },
      {
        title: 'Advice that doesn’t know your project',
        body: 'Templates, threads and videos, but nothing that knows which stage you are in or what you have already tried.',
      },
      {
        title: 'Finding the right people',
        body: 'A mentor, a developer or an investor each becomes a project of its own.',
      },
    ],
  },
  offer: {
    badge: 'What you get',
    title: 'Your project, your tools and your people in one place',
    items: [
      {
        icon: 'tools',
        title: 'A tool for every stage',
        body: 'ICP Builder, Demo Studio, PMF Lab, MVP Builder, GTM Strategist and Traction Engine, each ending in something you can show.',
      },
      {
        icon: 'people',
        title: 'People who can help',
        body: 'Mentors, service providers, investors and other founders, next to your work instead of in another tab.',
      },
      {
        icon: 'evidence',
        title: 'Your evidence, saved',
        body: 'Decisions, interviews and test results stay with your project, ready when a mentor, a program or an investor asks.',
      },
    ],
  },
  steps: {
    badge: 'How it works',
    title: 'Three moves to get going',
    items: [
      {
        title: 'Create your project',
        body: 'Describe your idea or your product. It’s free to start.',
      },
      {
        title: 'Use the tool for where you are',
        body: 'Your dashboard shows your current stage and the next thing worth doing.',
      },
      {
        title: 'Bring people in',
        body: 'Book a mentor, hire a provider, or let investors see your progress when you choose to.',
      },
    ],
  },
  preview: {
    badge: 'The stages',
    title: 'A tool for each stage of your project',
    copy: 'Fundraising tools are there too, for when you decide to raise.',
  },
  trust: {
    title: 'Free to start. No equity.',
    body: 'Create an account without applying. We can’t promise investment: you choose whether investors can see your progress, and they decide whom to contact.',
  },
  crossLink: {
    text: 'In an incubator, accelerator or university program?',
    label: 'Show them how it works for programs',
    href: '/enterprise',
  },
  faqs: [
    {
      question: 'Is it free?',
      answer: 'Yes. You can start on the free plan. Paid plans add more credits and tools when you need them.',
    },
    {
      question: 'Do I need to apply?',
      answer: 'No. Create an account and start today.',
    },
    {
      question: 'Does Creatives Takeover take equity?',
      answer: 'No.',
    },
    {
      question: 'Will I find investors here?',
      answer: 'Investors are on the platform, but we can’t promise investment. You choose whether to be visible to them, and they decide whom to contact.',
    },
  ],
  closing: {
    title: 'Start your project today',
    copy: 'Describe your idea and get a first read on its viability.',
    cta: { label: 'Start free', kind: 'link', href: '/#get-started' },
  },
};

export const AUDIENCE_PAGES: Record<AudienceKey, AudiencePageContent> = {
  founders: FOR_FOUNDERS,
  investors: FOR_INVESTORS,
};
