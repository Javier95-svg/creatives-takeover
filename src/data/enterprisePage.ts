/** Partnership copy. Examples are not customer results. SEO mirrors scripts/seo-route-config.mjs. */
export const ENTERPRISE_PATH = '/enterprise';
export const ENTERPRISE_SEO = {
  title: 'For Startup Programs | Creatives Takeover',
  description: 'Cohort visibility, founder follow-up and stakeholder reporting for accelerators, incubators and university programs. Start with a scoped 30-day pilot.',
  keywords: 'accelerator programs, incubators, university entrepreneurship, cohort reporting, founder validation',
};
export const ENTERPRISE_HERO = {
  eyebrow: 'A partner for your startup program',
  titleLead: 'Know where your cohort stands—',
  titleAccent: 'and where to help next.',
  lede: 'Give your program team a clear view of founder progress, structured weekly follow-up, and a cohort report for stakeholder updates. Built for accelerators, incubators, and university programs.',
  primaryCta: 'Book a pilot call',
  secondaryCta: { label: 'See the sample report', href: '#report' },
  facts: [
    { value: '30', label: 'day pilot' },
    { value: '5–10', label: 'startups' },
    { value: 'Weekly', label: 'check-ins' },
    { value: '1', label: 'cohort report' },
  ],
  trust: [
    { key: 'contact', label: 'One program contact' },
    { key: 'consent', label: 'Founders choose to share progress' },
  ],
};
export const ENTERPRISE_OUTCOMES = {
  eyebrow: 'Your program, better informed',
  title: 'Clear progress. Focused support.',
  copy: 'A shared view of the cohort, with our team supporting the follow-through.',
  items: [
    { key: 'visibility', when: 'Visibility', title: 'Identify support needs', body: 'See stages, activity and reported blockers together, so you can focus mentor time where it is needed.' },
    { key: 'time', when: 'Follow-through', title: 'Reduce manual follow-up', body: 'Our team follows up with founders and prepares a weekly summary for your program contact.' },
    { key: 'evidence', when: 'Reporting', title: 'Document cohort progress', body: 'Use a team-prepared report to discuss recorded activity, founder decisions and next steps with stakeholders.' },
  ],
};
export const ENTERPRISE_REPORT = {
  eyebrow: 'See the deliverable',
  title: 'Turn cohort activity into clear stakeholder reporting.',
  points: [
    { key: 'cohort', title: 'A cohort-level view', body: 'Stages, interviews, experiments and founder decisions in one report.' },
    { key: 'next', title: 'Practical next steps', body: 'A starting point for your next conversation with each team.' },
    { key: 'confirmed', title: 'Clear evidence sources', body: 'Platform-recorded activity is distinguished from founder-reported totals. Neither independently verifies customer demand or business results.' },
  ],
};
export const ENTERPRISE_PILOT = {
  eyebrow: 'How we work together',
  title: 'We coordinate delivery. You guide the program.',
  copy: 'A focused engagement alongside your curriculum and mentors.',
  steps: [
    { key: 'setup', when: 'Before day 1', owner: 'Our team', title: 'Align on the scope', body: 'Together, we agree cohort dates, goals, check-ins and reporting requirements before kickoff.' },
    { key: 'join', when: 'Week 1', owner: 'Your founders', title: 'Onboard the cohort', body: 'We lead onboarding. Founders see what is shared before agreeing to join; platform access is included for the pilot.' },
    { key: 'track', when: 'Weeks 1–4', owner: 'Our team', title: 'Review progress weekly', body: 'We follow up and send a summary. Your team uses the dashboard to guide support and mentor conversations.' },
    { key: 'report', when: 'Day 30', owner: 'Our team', title: 'Report and agree next steps', body: 'We prepare the cohort report and review what a continued partnership would involve.' },
  ],
  honesty: 'The pilot provides a structured process and documented activity. It won’t prove product-market fit or promise customers, funding or investment readiness.',
};
export const ENTERPRISE_DEAL = {
  eyebrow: 'Start with a scoped pilot',
  title: '30 days. 5–10 startups. A clear scope.',
  copy: 'Pricing follows the agreed scope. We send a proposal after discussing your cohort and reporting needs.',
  get: { title: 'Included in the engagement', items: [
    { key: 'dashboard', title: 'Program dashboard and founder access', body: 'Track cohort activity and export progress data.' },
    { key: 'summary', title: 'Weekly follow-up and summary', body: 'Coordinated and prepared by our team.' },
    { key: 'report', title: 'A final cohort report', body: 'Reporting requirements and any template adaptation agreed at kickoff.' },
    { key: 'kickoff', title: 'Kickoff and onboarding', body: 'Our team introduces the workflow to your founders.' },
  ] },
  need: { title: 'Your program contributes', items: [
    { title: '5 to 10 startups', body: 'Selected by you for the same 30-day period.' },
    { title: 'One program contact', body: 'To coordinate introductions and review summaries.' },
    { title: 'A kickoff session', body: 'Bring your founders together for onboarding.' },
    { title: 'About 3 hours a week per founder', body: 'For customer conversations, validation work and a short update.' },
  ] },
};
export const ENTERPRISE_AFTER = {
  title: 'Continue on an agreed scope',
  copy: 'At the end of the pilot, we review the engagement together and discuss support for your full cohort and program calendar.',
};
export const ENTERPRISE_FAQS = [
  { question: 'How much does it cost?', answer: 'Pricing depends on cohort size and the agreed delivery and reporting scope. After discussing your program, we send a proposal. Founder access is included in the engagement.' },
  { question: 'How much of our team’s time does it take?', answer: 'One program contact coordinates introductions, attends kickoff and reviews the weekly summary. We handle onboarding, weekly follow-up and report preparation. We agree the working rhythm before starting.' },
  { question: 'What do we see, and what stays private?', answer: 'Your team sees cohort progress, including stages, activity counts and check-ins. Founders’ files, idea details and messages stay private. Every founder agrees to share progress before joining and can leave at any time.' },
  { question: 'Can the report follow our stakeholder template?', answer: 'Share your funder’s or university’s template before kickoff. We agree which requirements the recorded activity can support and include the adaptation in the engagement scope.' },
  { question: 'Does it replace our curriculum or mentors?', answer: 'No. The workflow supports your existing program. Your mentors and team guide founders; the dashboard and weekly summaries help inform those conversations.' },
  { question: 'What happens after the pilot?', answer: 'Founders keep their accounts and work, with access under the free plan. Continued program support is scoped separately around your cohort, goals and calendar.' },
];
export const ENTERPRISE_CONTACT = {
  eyebrow: 'Explore a partnership',
  title: 'Book a pilot call',
  copy: 'A 30-minute conversation to assess fit and define the starting scope.',
  callLabel: 'What we will cover',
  callSteps: ['Your cohort, program goals and reporting needs.', 'The dashboard and our delivery workflow.', 'The scope and next steps for a proposal.'],
  person: { name: 'Javier Alonso', role: 'Founder & CEO', line: 'You’ll speak with me directly about your program.', email: 'javier@creatives-takeover.com' },
};
