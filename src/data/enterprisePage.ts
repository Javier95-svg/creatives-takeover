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
};

// The pilot step by step, as a program manager lives it (2026-10-23). Each
// step says who does the work, so the team's time is clear. Verified against
// cohort mode: separate founder and staff invite links, consent to join,
// leaving at any time, the cohort's founders' plan (Rising: its tools,
// including First Customer Proof, for the cohort dates, then back to their own
// plan), counts since joining, verified vs founder-reported. Reminders, the
// weekly summary and the report are done by our team (pilot playbook).
// `visual` names the real product screen shown beside the step.
// Said once and shown in the scope section: what 30 days can't do.
const PILOT_HONESTY =
  'Thirty days won’t prove product-market fit, guarantee paying customers or make a startup investment-ready. They give every founder a disciplined process and documented evidence.';

export const ENTERPRISE_PILOT = {
  eyebrow: 'How the pilot works',
  title: 'We run it. You bring the founders.',
  // The end of the title, set in the hero's accent gradient on the page.
  titleAccent: 'You bring the founders.',
  copy: 'Seven steps, from setup to the day your founders carry on without you.',
  steps: [
    {
      key: 'setup',
      when: 'Before day 1',
      owner: 'Our team',
      title: 'We set up your cohort',
      body: 'Your dates, your check-in day and the plan your founders get. You get two links: one to share with your founders, and a private one for your team.',
    },
    {
      key: 'join',
      when: 'Day 1',
      owner: 'Your founders',
      title: 'Founders join, with their consent',
      body: 'Each founder signs up with their own account and sees exactly what your program will see before agreeing. They can leave at any time.',
      visual: 'join',
    },
    {
      key: 'work',
      when: 'Weeks 1–4',
      owner: 'Your founders',
      title: 'Founders do the validation work',
      body: 'Each founder gets a weekly plan for their stage and full access to our paid tools for the 30 days, at no cost to them. That includes a guided plan to find and contact their first buyers. Every week they send a short update in two minutes.',
      visual: 'founder',
    },
    {
      key: 'track',
      when: 'Any time',
      owner: 'Your team',
      title: 'You see every startup on one screen',
      body: 'Stage, interviews, experiments, check-ins and who needs attention. Unlike a spreadsheet or a weekly form, the numbers come from the work founders do on the platform, and what the platform can confirm is shown apart from what founders report.',
      visual: 'program',
    },
    {
      key: 'weekly',
      when: 'Every week',
      owner: 'Our team',
      title: 'We follow up. You get a summary.',
      body: 'We remind every team, follow up with anyone who goes quiet and send you a short summary: progress, highlights and where your help is needed.',
    },
    {
      key: 'report',
      when: 'Day 30',
      owner: 'Our team',
      title: 'Your cohort report',
      body: 'Written from each startup’s recorded work, with a next step for every startup. In your funder’s format if you share it.',
    },
    {
      key: 'after',
      when: 'After day 30',
      owner: 'Automatic',
      title: 'Founders keep going',
      body: 'The pilot plan ends on its own. Founders keep their account, their work and the free plan.',
    },
  ],
  youProvide: ['5 to 10 startups', 'One contact from your team', 'Your funder’s report template, if you have one'],
  honesty: PILOT_HONESTY,
};

// What the pilot includes and what it doesn't (2026-10-23), so a program
// manager can take it to leadership as is. "Not included" says what to expect
// instead, never only "no".
export const ENTERPRISE_SCOPE = {
  eyebrow: 'Scope',
  title: 'What the pilot includes, and what it doesn’t',
  included: [
    { title: 'A program dashboard for your team', body: 'Every startup’s stage, interviews, experiments, check-ins and who needs attention. Export it as a spreadsheet at any time.' },
    { title: 'Full access for every founder', body: 'Our paid tools for the 30 days, at no cost to them.' },
    { title: 'Kickoff and onboarding', body: 'We onboard your founders at kickoff.' },
    { title: 'Weekly follow-up and a summary', body: 'We remind and follow up with every team, and send your team a summary every week.' },
    { title: 'The final cohort report', body: 'Written by our team, with a next step for every startup, in your funder’s format if you share it.' },
  ],
  excluded: [
    { title: 'Founders’ private work', body: 'Files, idea details and messages stay private. A startup’s plan summary goes in your report only if its founder agrees.' },
    { title: 'Promised results', body: PILOT_HONESTY },
    { title: 'Funding or investor introductions', body: 'The pilot produces evidence of demand, not fundraising.' },
    { title: 'A replacement for your curriculum', body: 'It works alongside your sessions and mentors.' },
  ],
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
  copy: 'Alumni keep getting support from the platform, with no extra work for your team.',
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
      'Every startup gets a validation plan and a weekly routine. How many interviews and experiments each one completes depends on the founders. Your dashboard shows who is doing the work and who needs a push, and the final report records what each startup actually did.',
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
      'Yes. We build it from each team’s recorded work and can follow your funder’s or university’s template. Share the template with us at kickoff.',
  },
  {
    question: 'Does it replace our curriculum or mentors?',
    answer:
      'No, it works alongside them. Your sessions and mentors teach, and the platform helps founders turn that into finished work, one stage at a time. Founders can also find experts in specific fields and other founders on the platform.',
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
  copy: 'A short call about your program. We send you a proposal within a week.',
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
