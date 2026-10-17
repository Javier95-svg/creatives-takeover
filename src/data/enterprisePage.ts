/**
 * Copy for /enterprise: the page for accelerators, incubators and university
 * programs (B2B2C repositioning).
 *
 * Positioning (2026-10-16): lead with the 30-day founder validation pilot.
 * 5 to 10 startups, 30 days. We provide platform access, a structured
 * validation workflow, weekly progress check-ins and a final cohort report;
 * the program provides the founders and one contact. The pilot is set up
 * around each program's size, founder focus and calendar. The ecosystem comes
 * with it. Copy stays short and the product visuals carry the page.
 *
 * Rules: promise a disciplined process and documented evidence, never
 * product-market fit, paying customers or investment readiness in 30 days.
 * The cohort report and check-ins are run by our team, not software. No
 * public prices ("talk to us"), no customer logos or testimonials until they
 * exist, every visual is labelled as an example or as the real product on
 * sample data, and the ecosystem is described only with wording verified
 * against the product (checked 2026-10-16). No counts of mentors, providers
 * or investors.
 *
 * Pure data with no imports, so node tests can read it. The SEO title and
 * description are mirrored in scripts/seo-route-config.mjs.
 */

export const ENTERPRISE_PATH = '/enterprise';

export const ENTERPRISE_SEO = {
  title: 'For Accelerators and Incubators | Creatives Takeover',
  description:
    'A 30-day founder validation pilot for accelerators and incubators: a validation plan and documented evidence for every founder, and a cohort report.',
  keywords:
    'founder validation pilot, accelerator software, incubator software, customer validation, cohort management, cohort reporting, accelerator program management',
};

export const ENTERPRISE_HERO = {
  eyebrow: '30-day founder validation pilot',
  titleLead: 'Every founder tests their idea.',
  titleAccent: 'You see the evidence.',
  // Attacks the program manager's three biggest time sinks (research,
  // 2026-10-16): chasing founders for updates, stalled teams found too late,
  // and funder reports built by hand. Progress is recorded because a stage only
  // completes when its result is complete (src/lib/founderProgress.ts); tools
  // are not locked, so never say a stage "opens" or "unlocks". Stalled teams
  // are flagged by our weekly check-ins and the report is written by our team.
  lede:
    'Stop chasing founders for updates. Our Startup Development Cycle records progress as they work, so you spot stalled teams early and get a funder-ready report.',
  // The pilot's outcomes come from stages I to III: the ideal customer
  // (Identity), the demand test (Prototype) and the evidence (Validation).
  cycle: {
    label: 'Startup Development Cycle',
    pilotStages: 3,
    pilotLabel: 'The 30-day pilot: stages I–III',
  },
  primaryCta: 'Book a pilot call',
  secondaryCta: { label: 'See the platform', href: '/demo' },
  facts: [
    { value: '30', label: 'days' },
    { value: '5–10', label: 'startups' },
    { value: 'Weekly', label: 'check-ins' },
    { value: '1', label: 'cohort report' },
  ],
  note: 'For accelerators, incubators and universities. Shaped around your program’s size, founders and calendar.',
};

// The four outcomes, in the order the 30 days produce them. `includes` lists
// what each one contains, shown as chips instead of sentences.
// Purpose (Javier, 2026-10-16): programs don't need another platform to teach
// entrepreneurship; they need what they teach to turn into action. The cycle
// is how: every stage ends in a result, and a stage only counts when that
// result is complete (src/lib/founderProgress.ts). It works alongside the
// program's teaching, never instead of it.
export const ENTERPRISE_PURPOSE = {
  eyebrow: 'What we’re for',
  statement: 'You don’t need another platform to teach entrepreneurship.',
  accent: 'You need founders to act on what you teach.',
  steps: [
    { key: 'teach', tag: 'Your program', title: 'You teach', body: 'Sessions, mentors and curriculum, run your way.' },
    { key: 'do', tag: 'Startup Development Cycle', title: 'Founders do the work', body: 'Each stage ends in a real result: a customer profile, a demand test, an evidence log.' },
    { key: 'done', tag: 'Startup Development Cycle', title: 'You see it done', body: 'A stage only counts when its result is complete.' },
  ],
};

// Written for program managers (2026-10-16): each title says what the
// program gets, not what the founder does.
export const ENTERPRISE_OUTCOMES = {
  eyebrow: 'What you get',
  title: 'What your program has after 30 days',
  items: [
    {
      key: 'plan',
      when: 'Week 1',
      title: 'A validation plan for every startup',
      includes: ['Ideal customer', 'The customer’s problem', 'Assumptions to test', 'A 30-day demand test'],
    },
    {
      key: 'evidence',
      when: 'Weeks 1–4',
      title: 'Every interview and experiment on record',
      includes: ['Interviews', 'Experiments', 'Feedback', 'Findings and decisions'],
    },
    {
      key: 'report',
      when: 'Day 30',
      title: 'A cohort report ready for your funders',
      includes: ['Participation', 'Completed activities', 'Key findings', 'Next steps per startup'],
    },
    {
      key: 'admin',
      when: 'Every week',
      title: 'Updates without chasing anyone',
      includes: ['One workflow for every startup', 'Weekly check-ins run by us', 'A weekly summary for your team'],
    },
  ],
};

export const ENTERPRISE_PILOT = {
  eyebrow: 'How the pilot works',
  title: 'We run it. You bring the founders.',
  track: [
    { when: 'Day 1', label: 'Kickoff' },
    { when: 'Week 1', label: 'Check-in' },
    { when: 'Week 2', label: 'Check-in' },
    { when: 'Week 3', label: 'Check-in' },
    { when: 'Week 4', label: 'Check-in' },
    { when: 'Day 30', label: 'Cohort report' },
  ],
  weProvide: ['Platform access for every founder', 'A structured validation workflow', 'Weekly check-ins with every team', 'The final cohort report'],
  youProvide: ['5 to 10 startups', 'One contact from your team'],
  honesty:
    'Thirty days won’t prove product-market fit, guarantee paying customers or make a startup investment-ready. They give every founder a disciplined process and documented evidence.',
};

export const ENTERPRISE_ADAPT = {
  eyebrow: 'Built around your program',
  title: 'Your size, your founders, your calendar',
  items: [
    { key: 'size', title: 'Cohort size', body: 'Start with 5 to 10 startups, then bring the rest of the cohort.' },
    { key: 'focus', title: 'Founder focus', body: 'Fintech, health, climate or mixed: the check-ins and the report follow your founders’ sector.' },
    { key: 'length', title: 'Program length', body: 'After the pilot, the setup follows your calendar, from a few weeks to several months.' },
  ],
};

// Post-program support (Javier, 2026-10-16): founders keep their account,
// their work and the free plan (Rookie, 50 monthly credits) after the program,
// so alumni keep getting support without the program team. Only what the free
// plan keeps open is named (src/config/planPermissions.ts): the angels
// community and First Customer Proof need paid plans, so investors and
// providers are not promised here.
export const ENTERPRISE_AFTER = {
  eyebrow: 'Post-program support',
  title: 'Your founders keep going after the program ends',
  copy: 'They keep their account, their work and the free plan, with no extra work for your team.',
  duringLabel: 'With your program',
  endLabel: 'Program ends',
  afterLabel: 'On their own, with the platform',
  keeps: [
    { key: 'work', title: 'Their account and work', body: 'Everything they built stays theirs.' },
    { key: 'tools', title: 'The stage tools', body: 'On the free plan, with monthly credits.' },
    { key: 'mentors', title: 'Mentors', body: 'Experts in specific fields.' },
    { key: 'founders', title: 'Other founders', body: 'Rooms, launches and co-founder matching.' },
  ],
  note: 'Paid plans add more credits and features.',
};

// The questions a program manager asks first: cost, their team's time, what
// they can report, and what they see.
export const ENTERPRISE_FAQS = [
  {
    question: 'How much does the pilot cost?',
    answer: 'It depends on the number of startups. Tell us about your program and we’ll send a proposal. Founders don’t pay to join.',
  },
  {
    question: 'How much of our team’s time does it take?',
    answer: 'You name one contact. We run the validation workflow, the weekly check-ins and the final report.',
  },
  {
    question: 'Can the report follow our funder’s format?',
    answer: 'Yes. We can shape the final report to your funder’s template, for example ProInnóvate milestone reports in Peru.',
  },
  {
    question: 'What do we see during the pilot?',
    answer: 'A weekly summary of every team: its stage, interviews logged, experiments run and decisions made. Founders’ files and messages are not shared.',
  },
  {
    question: 'Our founders are all in one sector. Does that work?',
    answer: 'Yes. Tell us who your founders are, for example fintech, and we set up the check-ins and the report around them.',
  },
  {
    question: 'Does it replace our mentors or sessions?',
    answer: 'No. It runs alongside your sessions and mentors. Founders also get experts in specific fields, service providers, investors and other founders on the platform.',
  },
  {
    question: 'What happens after the 30 days?',
    answer: 'Founders keep their accounts and their work. If the pilot works for you, we set up your next cohort around your program’s calendar.',
  },
];

export const ENTERPRISE_CONTACT = {
  eyebrow: 'Talk to us',
  title: 'Book a pilot call',
  copy: 'Tell us about your program and we’ll shape the pilot around your founders and your calendar.',
  pilotIncludes: [
    'Platform access for 5 to 10 startups',
    'A structured validation workflow',
    'Weekly progress check-ins',
    'A final cohort report',
  ],
  person: {
    name: 'Javier Peña',
    role: 'Founder & CEO',
    line: 'You’ll talk to me directly. I reply within 1–2 business days.',
    email: 'javier@creatives-takeover.com',
  },
};
