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
 * public prices ("talk to us") except the founding offer (free pilot for the
 * first 3 programs, Javier 2026-11-18), no customer logos or testimonials
 * until they exist, every visual is labelled as an example or as the real
 * product on sample data, and the ecosystem is described only with wording
 * verified against the product (checked 2026-10-16). No counts of mentors,
 * providers or investors.
 *
 * 2026-11-18 audit (version A): about half the words, proof up front (a
 * sample day-30 report in the hero, the founding offer), and a visual in every
 * section except the FAQ. Plan: .claude/plans/i-believe-our-pulse-piped-panda.md
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

// Coherence review (2026-10-24): the headline promises visibility into who is
// doing the work, not "program impact", which a 30-day pilot with 5 to 10
// startups can't measure. The eyebrow and the lede stay in Javier's wording
// (2026-10-16): the pilot up top, then engagement, accountability, and a
// pilot shaped around each program.
export const ENTERPRISE_HERO = {
  eyebrow: '30-day founder validation pilot',
  titleLead: 'See which startups in your cohort',
  titleAccent: 'are doing the work.',
  lede:
    'We keep your cohort engaged and accountable throughout the program. Start with a 30-day pilot, then we shape it around your program’s length, size and founders.',
  // The pilot's outcomes come from stages I to III: the ideal customer
  // (Identity), the demand test (Prototype) and the evidence (Validation).
  // Plain words for a busy director: the stages founders move through, and
  // the part the pilot covers.
  cycle: {
    label: 'The stages founders work through',
    pilotStages: 3,
    pilotLabel: 'The pilot covers the first three',
  },
  primaryCta: 'Book a pilot call',
  secondaryCta: { label: 'See how the pilot works', href: '#how' },
  facts: [
    { value: '30', label: 'day pilot' },
    { value: '5–10', label: 'startups' },
    { value: 'Weekly', label: 'check-ins' },
    { value: '1', label: 'cohort report' },
  ],
  // Under the buttons (2026-11-18 audit, version A): the founding offer, then
  // two trust facts. No photo here (Javier). ISO 27001 is the infrastructure's
  // certification (Supabase), never Creatives Takeover's own.
  trust: [
    { key: 'founding', label: 'Free for our first 3 programs' },
    { key: 'consent', label: 'Founders join with consent' },
    { key: 'iso', label: 'ISO 27001 certified infrastructure' },
  ],
};

// The pilot in four steps, as a program manager lives it (2026-11-18 audit,
// version A; was seven steps). Each step says who does the work, so the
// team's time is clear. Verified against cohort mode: separate founder and
// staff invite links, consent to join, leaving at any time, the cohort plan's
// paid tools for the cohort dates, counts since joining, verified vs
// founder-reported. Reminders, the weekly summary and the report are done by
// our team (pilot playbook). `visual` names the visual shown beside the step.
const PILOT_HONESTY =
  'Thirty days won’t prove product-market fit, guarantee paying customers or make a startup investment-ready. They give every founder a disciplined process and documented evidence.';

export const ENTERPRISE_PILOT = {
  eyebrow: 'How the pilot works',
  title: 'We run it. Your team watches.',
  // The end of the title, set in the hero's accent gradient on the page.
  titleAccent: 'Your team watches.',
  copy: 'Four steps, and one contact from your team.',
  steps: [
    {
      key: 'setup',
      when: 'Before day 1',
      owner: 'Our team',
      title: 'We set up your cohort',
      body: 'Your dates, your check-in day and your report format. You get two links: one for your founders, one for your team.',
      visual: 'setup',
    },
    {
      key: 'join',
      when: 'Day 1',
      owner: 'Your founders',
      title: 'Founders join, with their consent',
      body: 'Each founder sees exactly what your program will see before agreeing, gets our paid tools free for the 30 days and can leave at any time.',
      visual: 'join',
    },
    {
      key: 'track',
      when: 'Weeks 1–4',
      owner: 'Your team',
      title: 'You see every startup on one screen',
      body: 'Stage, interviews, experiments, weekly updates and who needs a push. We follow up with anyone who goes quiet and send you a summary every week.',
      // The real dashboard is the hero visual (version B), so this step shows
      // the labelled example board on day 18.
      visual: 'board',
    },
    {
      key: 'report',
      when: 'Day 30',
      owner: 'Our team',
      title: 'You get the cohort report',
      body: 'Written from each startup’s recorded work, with a next step for every team, in your funder’s format if you share it.',
      visual: 'report',
    },
  ],
  honesty: PILOT_HONESTY,
};

// The day-30 report as its own band after the hero (version B, Javier
// 2026-11-18): what a program can show its funders, beside the sample report.
export const ENTERPRISE_REPORT = {
  eyebrow: 'What you get on day 30',
  title: 'A report your funders can read',
  points: [
    { key: 'cohort', title: 'Every startup on one page', body: 'Stage, interviews, experiments and the decision each team made.' },
    { key: 'next', title: 'A next step for every team', body: 'So your mentors know where to help after the pilot.' },
    { key: 'confirmed', title: 'Confirmed, not just reported', body: 'What the platform confirms is kept apart from what founders report.' },
  ],
};

// What the program gets and what it provides, in one panel (2026-11-18; it
// replaces the scope, requirements, "built around your program" and
// post-program sections). Kept to four short lines a side.
export const ENTERPRISE_DEAL = {
  eyebrow: 'The pilot',
  title: 'What you get, and what we need from you',
  get: {
    title: 'Your program gets',
    items: [
      { key: 'dashboard', title: 'A dashboard of every startup', body: 'Stage, interviews, experiments and check-ins. Export it whenever you need.' },
      { key: 'summary', title: 'A weekly summary', body: 'Progress, highlights and where your help is needed, from our team.' },
      { key: 'report', title: 'A day-30 cohort report', body: 'A next step for every startup, in your funder’s format.' },
      { key: 'after', title: 'Founders who keep going', body: 'Their account, their work and the free plan stay theirs after day 30.' },
    ],
  },
  need: {
    title: 'We need from you',
    items: [
      { title: '5 to 10 startups', body: 'Chosen by you, all in the same 30 days.' },
      { title: 'One contact from your team', body: 'To introduce the pilot and read the weekly summary.' },
      { title: 'A kickoff session in week 1', body: 'So we can onboard every startup together.' },
      { title: 'About 3 hours a week per founder', body: 'Mostly talking to potential customers, plus a two-minute update.' },
    ],
  },
};

// After day 30: the stages founders worked on with the program, then the ones
// they carry on with alone (the free plan keeps the stage tools).
export const ENTERPRISE_AFTER = {
  title: 'And after day 30',
  duringLabel: 'With your program',
  endLabel: 'Pilot ends',
  afterLabel: 'On their own, with the platform',
};

// Founding offer (Javier, 2026-11-18): the first 3 programs run the pilot at no
// cost, for honest feedback and permission to publish a case study. The one
// exception to "no public prices"; after these three, a proposal per cohort.
export const ENTERPRISE_FOUNDING = {
  eyebrow: 'Founding programs',
  title: 'Be one of our first three programs. The pilot is free.',
  titleAccent: 'The pilot is free.',
  copy: 'We are running the 30-day pilot at no cost for three programs. In return we ask for honest feedback and permission to publish what happened as a case study.',
  places: 3,
  terms: [
    { key: 'pilot', title: 'The full pilot, free', body: 'Setup, weekly follow-up and the day-30 report.' },
    { key: 'feedback', title: 'Your honest feedback', body: 'What worked for your team and what didn’t.' },
    { key: 'case', title: 'A published case study', body: 'What happened in your cohort, shared with your permission.' },
  ],
  note: 'Founders never pay to take part.',
};

// Written for program managers (2026-11-18), in the order they ask: cost,
// their team's time, what they see and what stays private, reporting, fit with
// their curriculum, and what comes next.
export const ENTERPRISE_FAQS = [
  {
    question: 'How much does it cost?',
    answer:
      'Free for our first three programs. After that, we send a proposal based on the number of startups. Founders never pay to take part.',
  },
  {
    question: 'How much of our team’s time does it take?',
    answer:
      'One contact on your side, to introduce the pilot to your founders and read the weekly summary. We onboard founders at kickoff, follow up every week and write the final report.',
  },
  {
    question: 'What do we see, and what stays private?',
    answer:
      'Each startup’s stage, interviews, experiments, check-ins and whether it needs attention. Founders’ files, idea details and messages stay private. Every founder agrees to share progress before joining and can leave at any time.',
  },
  {
    question: 'Can the final report follow our funder’s format?',
    answer:
      'Yes. We build it from each team’s recorded work and can follow your funder’s or university’s template. Share it with us at kickoff.',
  },
  {
    question: 'Does it replace our curriculum or mentors?',
    answer:
      'No, it works alongside them. Your sessions and mentors teach, and the platform helps founders turn that into finished work, one stage at a time.',
  },
  {
    question: 'What happens after the pilot?',
    answer:
      'Founders keep their accounts, their work and the free plan. If the pilot meets your goals, we set it up for your full cohort and your program’s calendar, from a few weeks to several months.',
  },
];

export const ENTERPRISE_CONTACT = {
  eyebrow: 'Talk to us',
  title: 'Book a pilot call',
  copy: 'A 30-minute call about your program.',
  callLabel: 'What happens on the call',
  callSteps: [
    'You tell us about your cohort and what your funders ask for.',
    'We walk you through the pilot and the program dashboard.',
    'We send you a proposal within a week.',
  ],
  person: {
    name: 'Javier Alonso',
    role: 'Founder & CEO',
    line: 'You’ll talk to me directly. I reply within 1–2 business days.',
    email: 'javier@creatives-takeover.com',
  },
};
