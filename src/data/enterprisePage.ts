/**
 * Copy for /enterprise: the page for incubators, accelerators and university
 * programs (B2B2C repositioning, 2026-10-16). Programs pay to put the
 * platform in front of their cohorts; founders join free under the program.
 *
 * The page has to land its value proposition in the first screen, so the
 * hero carries the promise, the three things a program gets, and the product
 * itself. Everything below supports a decision already half made.
 *
 * Rules: no public prices ("talk to us"), no customer logos or testimonials
 * until they exist, and every product visual is labelled as an example.
 *
 * Pure data with no imports, so node tests can read it. The SEO title and
 * description are mirrored in scripts/seo-route-config.mjs.
 */

export const ENTERPRISE_PATH = '/enterprise';

export const ENTERPRISE_SEO = {
  title: 'For Incubators and Accelerators | Creatives Takeover',
  description:
    'Give your cohort one workspace to test and build their ideas, and see every team’s stage, progress and stalls in one view, with an impact report at the end.',
  keywords:
    'cohort management, incubator software, accelerator program management, university entrepreneurship program, founder progress tracking, impact report',
};

export const ENTERPRISE_HERO = {
  eyebrow: 'For incubators, accelerators and universities',
  titleLead: 'Know which teams are moving',
  titleAccent: 'and which are stuck.',
  lede:
    'Your founders get one workspace to test and build their ideas. Your team gets a live view of every team’s stage, evidence and stalls, and an impact report when the cohort ends.',
  primaryCta: 'Book a pilot call',
  secondaryCta: { label: 'See the platform', href: '/demo?panel=for-institutions' },
  points: ['Live cohort dashboard', 'Alerts when a team stalls', 'Funder-ready impact report'],
  note: 'Pilots start with one cohort or one class. Founders join free.',
};

export const ENTERPRISE_OUTCOMES = [
  { value: 'One view', label: 'Stage, completed tools and last activity for every team in the cohort.' },
  { value: 'Week 3, not week 10', label: 'Teams that go quiet or stay stuck are flagged while there is time to help.' },
  { value: 'No more chasing', label: 'The impact report is assembled from the work teams already did.' },
];

export const ENTERPRISE_COMPARISON = {
  eyebrow: 'Why programs switch',
  title: 'Running a cohort, before and after',
  rows: [
    { topic: 'Knowing who is stuck', before: 'Check-in calls and status emails', after: 'A live stage for every team, with stall alerts' },
    { topic: 'Mentor time', before: 'Goes to the teams that ask loudest', after: 'Goes to the teams that need it' },
    { topic: 'Impact reporting', before: 'Weeks of chasing teams for numbers', after: 'An anonymized report when the cohort ends' },
    { topic: 'Founder tools', before: 'Templates and scattered docs', after: 'One workspace with a tool for every stage' },
  ],
};

export const ENTERPRISE_FEATURES = {
  eyebrow: 'What your team gets',
  title: 'Built for the people running the program',
  dashboard: {
    title: 'Cohort dashboard',
    body: 'Every team’s current stage, what it has completed and how long it has been there, in one view.',
  },
  alerts: {
    title: 'Stall alerts',
    body: 'Teams that go quiet or stay in a stage too long are flagged, so support reaches them early.',
  },
  report: {
    title: 'Impact report',
    body: 'Stages completed, customers interviewed, demand pages published and first paying customers. Anonymized.',
  },
  workspace: {
    title: 'A workspace for every founder',
    body: 'Every team uses the same stages and tools, so progress is comparable across the batch and nobody reports by hand.',
  },
  privacy: {
    title: 'Progress, not private content',
    body: 'Your staff see stages, completed tools and activity. Founders’ ideas, files and conversations stay theirs.',
  },
};

export const ENTERPRISE_STEPS = {
  eyebrow: 'How a pilot works',
  title: 'Start with one cohort',
  items: [
    { when: 'Before kickoff', title: 'Set up', body: 'Tell us about your program. We set up your cohort and invite your founders.' },
    { when: 'During the cohort', title: 'Run', body: 'Teams work alongside your sessions. Your staff check the dashboard weekly and step in where teams stall.' },
    { when: 'Cohort end', title: 'Report', body: 'You receive the anonymized impact report, ready for your funders or your university.' },
  ],
};

export const ENTERPRISE_FAQS = [
  {
    question: 'How much does it cost?',
    answer: 'It depends on the size of the cohort and the length of the program. Tell us about yours and we’ll send a proposal for a pilot.',
  },
  {
    question: 'Do we have to change our curriculum?',
    answer: 'No. Teams use the workspace alongside your sessions and mentoring. The stages fit most program calendars, from a six-week sprint to a full semester.',
  },
  {
    question: 'What can our staff see?',
    answer: 'Each team’s stage, the tools it has completed, how long it has been in its current stage and recent activity. Not the content of their ideas, files or messages.',
  },
  {
    question: 'Can we start small?',
    answer: 'Yes. Most programs start with a pilot: one cohort, or one class in a university course.',
  },
  {
    question: 'What happens to founders when the program ends?',
    answer: 'They keep their account and their work. They can carry on with the free plan or choose a paid one.',
  },
];

export const ENTERPRISE_CONTACT = {
  eyebrow: 'Talk to us',
  title: 'Start with one cohort',
  copy: 'Tell us about your program. We’ll reply with a pilot proposal for your cohort size and calendar.',
  next: [
    'We reply with a few questions about your cohort.',
    'We agree the scope on a short call.',
    'You get a pilot proposal for one cohort or one class.',
  ],
};
