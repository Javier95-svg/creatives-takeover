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
  titleLead: 'Measure your program impact',
  titleAccent: 'with evidence.',
  // Javier's wording (2026-10-16): engagement and accountability, and that it
  // adapts (weekly check-ins and stage results are how). Programs
  // don't all last 30 days, so the 30 days is the pilot, not the program.
  lede:
    'We keep your cohort engaged and accountable throughout the program. Start with a 30-day pilot, then we shape it around your program’s length, size and founders.',
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
    { value: '30', label: 'day pilot' },
    { value: '5–10', label: 'startups' },
    { value: 'Weekly', label: 'check-ins' },
    { value: '1', label: 'cohort report' },
  ],
};

// The four outcomes, in the order the 30 days produce them. `includes` lists
// what each one contains, shown as chips instead of sentences.
// Written for program managers (2026-10-16): each title says what the
// program gets, not what the founder does.
export const ENTERPRISE_OUTCOMES = {
  eyebrow: 'What you get',
  title: 'A unified system to measure your cohort progress and outcomes.',
  // The end of the title, set in the hero's accent gradient on the page.
  titleAccent: 'cohort progress and outcomes.',
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
  // The end of the title, set in the hero's accent gradient on the page.
  titleAccent: 'You bring the founders.',
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

// Written for program managers (2026-10-16), in the order they ask:
// expectations, their team's time, cost, visibility, reporting, fit with their
// curriculum, sector, and what comes next. Every promise here is delivered by
// our team during the pilot (onboarding, weekly summary, report), or verified
// in the product (founders keep account, work and the free plan).
export const ENTERPRISE_FAQS = [
  {
    question: 'What can we realistically expect from the pilot?',
    answer:
      'Every startup finishes with a validation plan, documented customer interviews and experiments, and a recommended next step. Thirty days won’t prove product-market fit or make a startup investment-ready. They give your cohort a disciplined process and evidence you can review.',
  },
  {
    question: 'How much of our team’s time does it take?',
    answer:
      'One contact on your side, to introduce the pilot to your founders and receive the weekly summary. We onboard founders at kickoff, run the weekly check-ins and write the final report.',
  },
  {
    question: 'How much does the pilot cost?',
    answer:
      'It depends on the number of startups. After a short call about your program, we send you a proposal. Founders don’t pay to take part.',
  },
  {
    question: 'What will we see during the pilot?',
    answer:
      'A weekly summary for every team: its current stage, interviews logged, experiments run, decisions made and whether it needs attention. Founders’ files and messages stay private.',
  },
  {
    question: 'Can the final report follow our funder’s format?',
    answer:
      'Yes. We build it from each team’s recorded work and can follow your funder’s or university’s template, including milestone reports for public grants. Share the template with us at kickoff.',
  },
  {
    question: 'Does it replace our curriculum or mentors?',
    answer:
      'No, it works alongside them. Your sessions and mentors teach; the Startup Development Cycle helps founders turn that into finished work, stage by stage. Founders can also find experts in specific fields and other founders on the platform.',
  },
  {
    question: 'Our founders are all in one sector. Does that work?',
    answer:
      'Yes. Whether your cohort is fintech, health, climate or mixed, we tailor the check-ins and the final report to your founders’ sector.',
  },
  {
    question: 'What happens after the pilot?',
    answer:
      'Founders keep their accounts, their work and the free plan. If the pilot meets your goals, we extend it to your full cohort and set it up around your program’s calendar, from a few weeks to several months.',
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
