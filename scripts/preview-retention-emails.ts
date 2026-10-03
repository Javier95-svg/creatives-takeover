// Renders every retention email for three example founders into one HTML page
// for copy review. Template copy only: the AI opener needs a live API call.
//
//   node --experimental-strip-types scripts/preview-retention-emails.ts
//
// Writes docs/retention-email-preview.html.
import { writeFileSync } from 'node:fs';

import { escapeHtml, renderPlainEmail } from '../supabase/functions/_shared/email-voice.ts';
import { EMPTY_FACTS, type ProjectFacts } from '../supabase/functions/_shared/retention-project-facts.ts';
import { buildSequenceCopy, finalizeCopy, SEQUENCE_TYPES, type ActivationIntent, type SequenceHints } from '../supabase/functions/_shared/retention-sequence-copy.ts';

const founders: Array<{ label: string; facts: ProjectFacts; hints: SequenceHints }> = [
  {
    label: 'Idea only, no project facts yet',
    facts: { ...EMPTY_FACTS, firstName: 'Pedro', daysAway: 12 },
    hints: {},
  },
  {
    label: 'Customer profile done, routine set up',
    facts: {
      ...EMPTY_FACTS,
      firstName: 'Ana',
      projectTitle: 'Tutorly',
      ideaSummary: 'Matching parents with vetted maths tutors',
      customer: 'parents of secondary school students who struggle with maths',
      routineGoal: 'validate your idea',
      routineHabit: 'Interview one parent',
      todayTask: 'Send the survey to the parents group',
      daysAway: 4,
    },
    hints: { mentorName: 'Lucia Gomez', savedMentorCount: 2, unreadMessageCount: 1 },
  },
  {
    label: 'Launched, with a go-to-market plan',
    facts: {
      ...EMPTY_FACTS,
      firstName: 'Erik',
      projectTitle: 'Fleetpay',
      ideaSummary: 'Expense tracking for small delivery fleets',
      customer: 'owners of delivery fleets with 5 to 20 vans',
      gtmPlanTitle: 'Fleet owner outreach',
      routineGoal: 'launch your product',
      routineHabit: 'Post one product update',
      todayTask: 'Call the three fleet owners from Tuesday',
      daysAway: 33,
    },
    hints: {
      mentorName: 'Mark de Vries',
      weeklyCommitment: 'Get 3 fleet owners onto the paid plan',
      weeklyOutcome: 'Missed, 1 of 3',
      weeklyOutcomeState: 'missed',
      activeDaysLast14: 5,
      suggestedFocus: 'Ask the one paying customer for two introductions.',
      lastStep: 'You reached pricing review in GTM Strategist.',
    },
  },
];

const intentsFor = (sequence: string): Array<ActivationIntent | undefined> =>
  sequence.startsWith('activation_day') ? ['run_icp', 'save_mentor', 'send_message', 'build_demo', 'book_call'] : [undefined];

const cards: string[] = [];
for (const sequence of SEQUENCE_TYPES) {
  for (const intent of intentsFor(sequence)) {
    const columns = founders.map(({ label, facts, hints }) => {
      const copy = finalizeCopy(buildSequenceCopy(sequence, facts, { ...hints, intent }));
      const email = renderPlainEmail({
        greeting: `Hi ${facts.firstName},`,
        paragraphs: [copy.opener, ...copy.followUp],
        ctaLabel: copy.defaultCtaLabel,
        ctaUrl: 'https://creatives-takeover.com/dashboard',
        preferencesUrl: 'https://creatives-takeover.com/account#notification-preferences',
        unsubscribeUrl: 'https://creatives-takeover.com/unsubscribe',
      });
      return `<div class="email"><div class="who">${escapeHtml(label)}</div><div class="subject">${escapeHtml(copy.subject)}</div><div class="from">Javier from Creatives Takeover</div>${email.html}</div>`;
    });
    cards.push(`<section><h2>${sequence}${intent ? ` <small>${intent}</small>` : ''}</h2><div class="row">${columns.join('')}</div></section>`);
  }
}

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Retention Email Preview</title>
<style>
body{margin:0;padding:24px 16px;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a}
h1{font-size:22px;margin:0 0 4px}p.note{margin:0 0 24px;color:#475569}
h2{font-size:15px;margin:28px 0 10px;font-family:ui-monospace,monospace}h2 small{color:#64748b;font-weight:400}
.row{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.email{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px;min-width:0}
.who{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:8px}
.subject{font-weight:700;font-size:15px}.from{font-size:12px;color:#64748b;margin:2px 0 14px}
</style></head><body>
<h1>Retention email preview</h1>
<p class="note">Template copy for every sequence, for three example founders. With RETENTION_AI_COPY on, the opening paragraph and subject may be rewritten by the model from the same facts.</p>
${cards.join('\n')}
</body></html>`;

writeFileSync(new URL('../docs/retention-email-preview.html', import.meta.url), page);
console.log(`Wrote docs/retention-email-preview.html (${cards.length} emails x ${founders.length} founders)`);
