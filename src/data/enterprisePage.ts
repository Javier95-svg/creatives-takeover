/**
 * Copy for /enterprise: the page for accelerators, incubators and university
 * programs (B2B2C repositioning).
 *
 * Positioning (2026-10-16, from the Founder CRM market research): lead with
 * the ecosystem a cohort joins, and sell the hours it gives back to the
 * program team. The three time savings are the tasks program managers lose
 * the most time on: building the network, chasing updates, and writing funder
 * reports. Verified progress is how the time is saved, not the headline, and
 * AI is not part of the pitch. Programs pay; founders join free.
 *
 * Rules: no public prices ("talk to us"), no customer logos or testimonials
 * until they exist, every product visual is labelled as an example, no
 * promise of investment to founders, no hour figures until pilots measure
 * them, and the ecosystem is described only with wording verified against
 * the product (checked 2026-10-16). No counts of mentors, providers or
 * investors.
 *
 * Pure data with no imports, so node tests can read it. The SEO title and
 * description are mirrored in scripts/seo-route-config.mjs.
 */

export const ENTERPRISE_PATH = '/enterprise';

export const ENTERPRISE_SEO = {
  title: 'For Accelerators and Incubators | Creatives Takeover',
  description:
    'Give your cohort tools for every stage, experts, providers, investors and other founders, and get your team’s hours back on networks, updates and reports.',
  keywords:
    'accelerator software, incubator software, cohort management, mentor network, founder progress tracking, funder reporting, accelerator program management',
};

export const ENTERPRISE_HERO = {
  eyebrow: 'For accelerators, incubators and universities',
  titleLead: 'A whole ecosystem for your cohort.',
  titleAccent: 'Hours back for your team.',
  lede:
    'Your founders get a tool for every stage, experts in specific fields, service providers, investors who can find them and other founders. Your team stops building networks from scratch, chasing updates and writing reports by hand.',
  primaryCta: 'Book a pilot call',
  secondaryCta: { label: 'See the platform', href: '/demo?panel=for-institutions' },
  points: ['A network you don’t build alone', 'Progress without chasing updates', 'Funder reports drafted for you'],
  note: 'Set up around your program’s length, from a few weeks to several months. Founders join free.',
};

export const ENTERPRISE_PERKS = {
  eyebrow: 'The ecosystem',
  title: 'What your founders get just for joining',
  copy: 'The tools to do the work and the people who can help, in one place. Your team no longer has to source every mentor, provider and investor contact itself.',
  tools: {
    title: 'A tool for every stage',
    body: 'The same path for every team, from defining the customer to early traction.',
    helps: 'Every team always knows its next step, without a custom plan from your staff.',
  },
  network: [
    {
      key: 'mentors',
      title: 'Mentors',
      body: 'Founders can find experts in specific fields.',
      helps: 'Your mentors stay. Founders reach further without you sourcing every expert.',
    },
    {
      key: 'providers',
      title: 'Service providers',
      body: 'Services for sales, marketing, operations, automation and technical support.',
      helps: 'Founders find help themselves instead of asking your team for contacts.',
    },
    {
      key: 'investors',
      title: 'Investors',
      body: 'Founders can choose to be visible to investors on the platform.',
      helps: 'Investor connections don’t depend only on introductions your team makes.',
    },
    {
      key: 'founders',
      title: 'Other founders',
      body: 'Rooms, launches and co-founder matching with other builders.',
      helps: 'Community reaches beyond your own cohort.',
    },
  ],
};

export const ENTERPRISE_COMPARISON = {
  eyebrow: 'Time saved',
  title: 'Where your team gets its hours back',
  rows: [
    { topic: 'Building the network', before: 'Recruit and keep every mentor, provider and investor contact yourself', after: 'Founders find experts, service providers and investors on the platform' },
    { topic: 'Knowing where teams stand', before: 'Check-in calls, status emails and spreadsheets', after: 'Progress recorded as founders do the work' },
    { topic: 'Funder reports', before: 'Chasing every team for numbers, then formatting by hand', after: 'A draft in your funder’s format, built from that progress' },
    { topic: 'Spotting who needs help', before: 'Found at the final review', after: 'Teams that stall are flagged while there is time to help' },
  ],
};

export const ENTERPRISE_FEATURES = {
  eyebrow: 'The program view',
  title: 'See every team without chasing anyone',
  pipeline: {
    title: 'Founder pipeline',
    body: 'Every founder by stage, updated as they work, with what they have completed and how long they have been there.',
  },
  alerts: {
    title: 'Stall alerts',
    body: 'Founders who go quiet or stay in a stage too long are flagged, so support reaches them early.',
  },
  record: {
    title: 'Founder records',
    body: 'Each record shows the evidence behind the stage: interviews logged, demand tested, decisions made.',
  },
  report: {
    title: 'Funder reports',
    body: 'Stages completed, customers interviewed, demand pages published and first paying customers. Anonymized and drafted in your funder’s format.',
  },
  privacy: {
    title: 'Progress, not private content',
    body: 'Your staff see stages, evidence and activity. Founders’ ideas, files and conversations stay theirs.',
  },
};

export const ENTERPRISE_STEPS = {
  eyebrow: 'How a pilot works',
  title: 'Start with one cohort',
  copy: 'Every program runs on its own clock. We adapt to yours, whether it lasts a few weeks or several months.',
  items: [
    { when: 'Before kickoff', title: 'Set up', body: 'We set up your cohort around your program’s length and calendar. Your founders join with their own accounts and get the whole ecosystem.' },
    { when: 'During the cohort', title: 'Run', body: 'Founders work and find help on the platform alongside your sessions. Your staff follow progress and step in where founders stall.' },
    { when: 'Cohort end', title: 'Report', body: 'You receive the anonymized report, drafted in your funder’s or your university’s format.' },
  ],
};

export const ENTERPRISE_FAQS = [
  {
    question: 'How much does it cost?',
    answer: 'It depends on the size of the cohort and the length of the program. Tell us about yours and we’ll send a proposal for a pilot. Founders don’t pay to join.',
  },
  {
    question: 'Where exactly does my team save time?',
    answer: 'In three places. Founders find experts, service providers and investors on the platform, so your team doesn’t source every contact. Progress is recorded as founders work, so nobody chases status updates. And funder reports are drafted from that progress instead of assembled by hand. In the pilot we measure the hours against how your team works today.',
  },
  {
    question: 'Does the ecosystem replace our own mentors?',
    answer: 'No. Your mentors and partners stay. The platform adds experts in specific fields, service providers, investors and other founders, so your network reaches further without your team building it alone.',
  },
  {
    question: 'Can reports follow our funder’s format?',
    answer: 'Yes. In the pilot we shape the report to your funder’s template, for example ProInnóvate milestone reports for programs in Peru.',
  },
  {
    question: 'Our program is shorter or longer than most. Does that work?',
    answer: 'Yes. Not every accelerator runs for the same number of weeks or months, so we adapt to the timing of your program and set the cohort up around your calendar.',
  },
  {
    question: 'What can our staff see?',
    answer: 'Each founder’s stage, the evidence behind it, how long they have been in that stage and recent activity. Not the content of their ideas, files or messages.',
  },
  {
    question: 'What happens to founders when the program ends?',
    answer: 'They keep their account and their work, and can keep using the platform on the free plan or a paid one.',
  },
];

export const ENTERPRISE_CONTACT = {
  eyebrow: 'Talk to us',
  title: 'Book a pilot call',
  copy: 'Tell us about your program and we’ll shape a pilot around your cohort, your calendar and your funder’s reporting.',
  pilotIncludes: [
    'The ecosystem for every founder in one cohort',
    'A program view of every team’s progress',
    'Funder report drafts in your format',
    'Setup around your program’s length',
  ],
  person: {
    name: 'Javier Peña',
    role: 'Founder & CEO',
    line: 'You’ll talk to me directly. I reply within 1–2 business days.',
    email: 'javier@creatives-takeover.com',
  },
};
