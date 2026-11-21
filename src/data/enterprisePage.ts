/** Partnership copy. Examples are not customer results. SEO mirrors scripts/seo-route-config.mjs. */
export const ENTERPRISE_PATH = '/enterprise';
export const ENTERPRISE_SEO = {
  title: 'Cohort Tracking for Accelerators | Creatives Takeover',
  description: 'Cohort visibility, founder follow-up and stakeholder reporting for accelerators, incubators and university programs. Start with a scoped 30-day pilot.',
  keywords: 'accelerator programs, incubators, university entrepreneurship, cohort reporting, founder validation',
};
/**
 * The hero's three promises, shown as a list. Kept short on purpose: Javier
 * preferred these to longer "gains" wording (2026-11-20).
 */
const HERO_PROMISES = [
  { key: 'dashboard', text: 'One dashboard' },
  { key: 'follow-up', text: 'Weekly follow-up from our team' },
  { key: 'reports', text: 'A day-30 report for your stakeholders' },
] as const;

export const ENTERPRISE_HERO = {
  eyebrow: 'For accelerators, incubators and universities',
  titleLead: 'See cohort progress.',
  titleAccent: 'Focus your support.',
  promises: HERO_PROMISES,
  /** The same three promises as one sentence, for SEO (scripts/seo-route-config.mjs). */
  lede: HERO_PROMISES.map((promise) => `${promise.text}.`).join(' '),
  primaryCta: 'Book a pilot call',
  secondaryCta: { label: 'See the sample report', href: '#report' },
  facts: [
    { value: '30', label: 'day pilot' },
    { value: '5 to 10', label: 'startups' },
    { value: '1', label: 'contact on your side' },
    { value: '1', label: 'cohort report' },
  ],
  trust: [
    // Both are in the program dashboard (src/components/cohort/ProgramDashboard.tsx): counts split
    // platform-verified from founder-reported, and an Export CSV of each week (checked 2026-11-19).
    { key: 'verified', label: 'Verified activity, not just self-reports' },
    { key: 'export', label: 'CSV export for funder reporting' },
  ],
};
export const ENTERPRISE_OUTCOMES = {
  eyebrow: 'Your program, better informed',
  title: 'What your program gets',
  copy: '',
  items: [
    { key: 'visibility', when: 'Visibility', title: 'Identify support needs', body: 'Startups that go quiet, report a blocker or ask for help are flagged, so mentor time goes where it’s needed.' },
    { key: 'time', when: 'Follow-through', title: 'Reduce manual follow-up', body: 'We follow up with founders who go quiet. You get one summary a week.' },
    { key: 'evidence', when: 'Reporting', title: 'Document cohort progress', body: 'Each startup’s activity, decisions and next steps in one report, ready for funders and boards.' },
  ],
};
export const ENTERPRISE_REPORT = {
  eyebrow: 'See the deliverable',
  title: 'Progress you can show.',
  points: [
    { key: 'cohort', title: 'A cohort-level view', body: 'Every startup’s activity and decisions on one page.' },
    { key: 'next', title: 'Practical next steps', body: 'A recommended next step for every startup.' },
    { key: 'confirmed', title: 'Clear evidence sources', body: 'What the platform recorded is shown apart from what founders report, so you know what each number rests on.' },
  ],
};
export const ENTERPRISE_PILOT = {
  eyebrow: 'How we work together',
  title: 'Your program. Our follow-through.',
  copy: '',
  steps: [
    { key: 'setup', when: 'Before day 1', owner: 'Both teams', title: 'Align on the scope', body: 'Agree dates, goals and reporting.' },
    { key: 'join', when: 'Week 1', owner: 'Our team and your founders', title: 'Founders join', body: 'We onboard your founders. Each one agrees to share progress, and their platform access is included.' },
    { key: 'track', when: 'Weeks 1 to 4', owner: 'Our team', title: 'Review progress weekly', body: 'We send the summary. You guide support.' },
    { key: 'report', when: 'Day 30', owner: 'Both teams', title: 'Decide what’s next', body: 'We present the day-30 report. You decide whether to continue.' },
  ],
  honesty: 'A structured process, not a promise of customers or funding.',
};
/** What the program holds at the end of the pilot (2026-11-20). All four come from the dashboard, the weekly summaries and the report. */
export const ENTERPRISE_DAY30 = {
  title: 'By day 30 you have',
  items: [
    { key: 'status', title: 'Each startup’s validation status', body: 'Customer profile, interviews and experiments, startup by startup.' },
    { key: 'summaries', title: 'Four weekly summaries', body: 'Who needed support each week, and why.' },
    { key: 'report', title: 'A day-30 report', body: 'With a recommended next step for every startup.' },
    { key: 'decision', title: 'A clear basis to decide', body: 'Whether to continue with your full cohort, and on what scope.' },
  ],
};
export const ENTERPRISE_DEAL = {
  eyebrow: 'The pilot',
  title: 'Start with 30 days.',
  copy: 'A proposal tailored to your cohort and reporting needs.',
  get: { title: 'We provide', items: [
    { key: 'dashboard', title: 'Dashboard and founder access', body: 'Track cohort activity and export progress data.' },
    { key: 'summary', title: 'Weekly follow-up', body: 'We follow up with founders and send you a summary every week.' },
    { key: 'report', title: 'Cohort report', body: 'Written by our team at day 30, in a format agreed at kickoff.' },
    { key: 'kickoff', title: 'Kickoff and onboarding', body: 'Our team introduces the workflow to your founders.' },
  ] },
  need: { title: 'You bring', items: [
    { title: '5 to 10 startups', body: 'Selected by you for the same 30-day period.' },
    { title: 'One program contact', body: 'To coordinate introductions and review summaries.' },
    { title: 'A kickoff session', body: 'Bring your founders together for onboarding.' },
    { title: 'About 3 hours a week per founder', body: 'For customer conversations, validation work and a short update.' },
  ] },
};
export const ENTERPRISE_AFTER = {
  title: 'Then scale together',
  copy: 'Continue with your full cohort on an agreed scope.',
};
export const ENTERPRISE_FAQS = [
  { question: 'How much does it cost?', answer: 'Pricing depends on cohort size and reporting needs, with founder access included. After the call we send a written proposal. Founders don’t pay to take part.' },
  { question: 'What if our founders don’t engage?', answer: 'The dashboard flags any startup that goes quiet, misses a weekly check-in, reports a blocker or asks for help. Our team follows up with those founders, and the weekly summary tells you who needs your attention.' },
  { question: 'How much of our team’s time does it take?', answer: 'One contact, a kickoff and a weekly review. We handle onboarding, follow-up and reporting.' },
  { question: 'What do we see, and what stays private?', answer: 'You see each startup’s stage, interviews, experiments, weekly check-ins and whether it needs attention. Founders’ files, ideas, messages and the companies they research are never shown. Each founder agrees to share progress before joining and can leave at any time.' },
  { question: 'Can the report follow our stakeholder template?', answer: 'Yes, for what the platform records. Share your template before kickoff and we confirm which sections we can fill.' },
  { question: 'Does it replace our curriculum or mentors?', answer: 'No. It supports your existing curriculum and mentor conversations.' },
  { question: 'What happens after the pilot?', answer: 'Founders keep their work and free-plan access. Continued program support is scoped separately.' },
];
export const ENTERPRISE_CONTACT = {
  eyebrow: 'Explore a partnership',
  title: 'Talk to us about a pilot',
  copy: '30 minutes to explore the fit.',
  // A quiet link to the qualifying Typeform; the form beside it is the main action.
  quizPrompt: 'Ready?',
  quizLink: 'Answer 8 quick questions',
  // What happens after "Send details": the form opens Javier's Cal page as soon as it sends.
  stepsLabel: 'How it works',
  steps: [
    { title: 'Send your details', body: 'The form takes about two minutes.' },
    { title: 'Pick a time', body: "Javier's calendar opens as soon as you send." },
    { title: 'Talk for 30 minutes', body: 'Your goals, a product walkthrough, next steps.' },
  ],
  callLabel: 'What we will cover',
  callSteps: ['Your cohort and goals.', 'A dashboard walkthrough.', 'Scope and next steps.'],
  person: { name: 'Javier Alonso', role: 'Founder (CEO & CTO)', line: 'Speak with me directly.', email: 'javier@creatives-takeover.com' },
};
