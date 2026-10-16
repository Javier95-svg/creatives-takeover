/**
 * Copy for /enterprise: the page for accelerators, incubators and university
 * programs (B2B2C repositioning, 2026-10-16).
 *
 * Positioning: a founder CRM set up around the program, where staff track the
 * real progress of every founder (evidence, not status updates). On top of
 * that, every founder in the cohort gets the platform's tools and network just
 * for joining. Programs pay; founders join free.
 *
 * The page has to land this in the first screen, so the hero carries the
 * promise, the three things a program gets, and the product itself.
 *
 * Rules: no public prices ("talk to us"), no customer logos or testimonials
 * until they exist, every product visual is labelled as an example, and no
 * promise of investment to founders. Mentor sessions are paid separately, so
 * the cohort gets access to mentors, not free sessions.
 *
 * Pure data with no imports, so node tests can read it. The SEO title and
 * description are mirrored in scripts/seo-route-config.mjs.
 */

export const ENTERPRISE_PATH = '/enterprise';

export const ENTERPRISE_SEO = {
  title: 'Founder CRM for Accelerators | Creatives Takeover',
  description:
    'A founder CRM for accelerators and incubators: track every team’s real progress in one place, while your cohort gets our tools and network for joining.',
  keywords:
    'founder CRM, accelerator CRM, incubator software, cohort management, founder progress tracking, accelerator program management, impact report',
};

export const ENTERPRISE_HERO = {
  eyebrow: 'For accelerators, incubators and universities',
  titleLead: 'The founder CRM',
  titleAccent: 'built around your program.',
  lede:
    'Track the real progress of every founder in your cohort, backed by the work they do, not status updates. And every founder gets our tools and network just for joining.',
  primaryCta: 'Book a pilot call',
  secondaryCta: { label: 'See the platform', href: '/demo?panel=for-institutions' },
  points: ['Every founder in one pipeline', 'Progress backed by evidence', 'Tools and network for your cohort'],
  note: 'Pilots start with one cohort or one class. Founders join free.',
};

export const ENTERPRISE_OUTCOMES = [
  { value: 'Real progress', label: 'Stages move when founders do the work, not when they say they did.' },
  { value: 'Week 3, not week 10', label: 'Founders who go quiet or stay stuck are flagged while there is time to help.' },
  { value: 'Perks for every founder', label: 'Tools for every stage and a network of mentors, providers and investors.' },
];

export const ENTERPRISE_COMPARISON = {
  eyebrow: 'Why programs switch',
  title: 'Running a cohort, before and after',
  rows: [
    { topic: 'Tracking founders', before: 'Spreadsheets, check-in calls and status emails', after: 'A CRM with every founder’s live stage' },
    { topic: 'Knowing what is real', before: 'What founders say in the weekly update', after: 'Interviews, tests and decisions they logged' },
    { topic: 'Mentor time', before: 'Goes to the teams that ask loudest', after: 'Goes to the teams that need it' },
    { topic: 'Impact reporting', before: 'Weeks of chasing teams for numbers', after: 'An anonymized report when the cohort ends' },
  ],
};

export const ENTERPRISE_FEATURES = {
  eyebrow: 'The CRM',
  title: 'Everything your team needs to run the cohort',
  pipeline: {
    title: 'Founder pipeline',
    body: 'Every founder by stage, with what they have completed and how long they have been there.',
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
    title: 'Impact report',
    body: 'Stages completed, customers interviewed, demand pages published and first paying customers. Anonymized.',
  },
  privacy: {
    title: 'Progress, not private content',
    body: 'Your staff see stages, evidence and activity. Founders’ ideas, files and conversations stay theirs.',
  },
};

export const ENTERPRISE_PERKS = {
  eyebrow: 'Included for your cohort',
  title: 'What your founders get just for joining',
  copy: 'Your program gets the CRM. Every founder in it gets the full platform: the tools to do the work and the people who can help.',
  tools: {
    title: 'A tool for every stage',
    body: 'The same path for every team, from defining the customer to the first paying ones.',
  },
  network: [
    { key: 'mentors', title: 'Mentors', body: 'Startup experts founders can book for 1:1 working sessions.' },
    { key: 'providers', title: 'Service providers', body: 'Design, marketing and technology help, vetted for early-stage teams.' },
    { key: 'investors', title: 'Investors', body: 'Founders can choose to be visible to investors on the platform.' },
    { key: 'founders', title: 'Other founders', body: 'Rooms, launches and co-founder matching with builders at the same stage.' },
  ],
};

export const ENTERPRISE_STEPS = {
  eyebrow: 'How a pilot works',
  title: 'Start with one cohort',
  items: [
    { when: 'Before kickoff', title: 'Set up', body: 'We set up the CRM around your program: your cohort, your calendar and the milestones you track.' },
    { when: 'During the cohort', title: 'Run', body: 'Founders work in the platform alongside your sessions. Your staff follow the pipeline and step in where founders stall.' },
    { when: 'Cohort end', title: 'Report', body: 'You receive the anonymized impact report, ready for your funders or your university.' },
  ],
};

export const ENTERPRISE_FAQS = [
  {
    question: 'How much does it cost?',
    answer: 'It depends on the size of the cohort and the length of the program. Tell us about yours and we’ll send a proposal for a pilot. Founders don’t pay to join.',
  },
  {
    question: 'How is this different from a regular CRM?',
    answer: 'A regular CRM tracks what your staff type into it. Here, a founder’s stage moves when they do the work in the platform (interviews, demand tests, decisions), so what you see is real progress rather than a status update.',
  },
  {
    question: 'Do we have to change our curriculum?',
    answer: 'No. Founders use the platform alongside your sessions and mentoring. The stages fit most program calendars, from a six-week sprint to a full semester.',
  },
  {
    question: 'What can our staff see?',
    answer: 'Each founder’s stage, the evidence behind it, how long they have been in that stage and recent activity. Not the content of their ideas, files or messages.',
  },
  {
    question: 'Are mentor sessions included?',
    answer: 'Founders get access to the mentor network and can book sessions. Mentors set their own prices, so sessions are paid separately unless your program covers them.',
  },
  {
    question: 'What happens to founders when the program ends?',
    answer: 'They keep their account and their work. They can carry on with the free plan or choose a paid one.',
  },
];

export const ENTERPRISE_CONTACT = {
  eyebrow: 'Talk to us',
  title: 'Book a pilot call',
  copy: 'Tell us about your program and we’ll shape a pilot around your cohort size and calendar.',
  pilotIncludes: [
    'The founder CRM for one cohort',
    'Full platform access for every founder',
    'Access to our mentor and provider network',
    'An impact report when the cohort ends',
  ],
  person: {
    name: 'Javier Peña',
    role: 'Founder & CEO',
    line: 'You’ll talk to me directly. I reply within 1–2 business days.',
    email: 'javier@creatives-takeover.com',
  },
};
