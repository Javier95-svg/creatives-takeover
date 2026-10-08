/**
 * Illustrative examples for empty Community feeds. They show newcomers what a
 * good post or launch looks like, and they are always presented as examples:
 * labelled, attributed to a kind of founder rather than a named person, with
 * no photos and no vote counts. They render only while a feed has no real
 * posts, so they step aside on their own as soon as people start posting.
 */
import type { PostKind } from './launchpad.ts';

export interface ExamplePost {
  id: string;
  kind: PostKind;
  /** Room slug, from LAUNCHPAD_TOPICS. */
  room: string;
  title: string;
  body: string;
  /** Who would write this, described by role. Never a name. */
  author: string;
  /** Startup Development Cycle stage, 1 to 7. */
  stage: number;
}

export const EXAMPLE_POSTS: readonly ExamplePost[] = [
  {
    id: 'ex-pricing-reviewer',
    kind: 'feedback',
    room: 'pricing',
    title: 'Would you pay $19/month for a pitch-deck reviewer?',
    body: 'It scores each slide against the questions angels actually ask and tells you which one loses them. Two founders I interviewed said they would pay; one said it should be free with a paid "fix it for me" tier. Which would you pick, and why?',
    author: 'Solo founder, B2B SaaS',
    stage: 3,
  },
  {
    id: 'ex-customers-first-ten',
    kind: 'milestone',
    room: 'customers',
    title: 'First 10 paying customers, 41 days after launch',
    body: 'What worked: replying to people who had already complained about the problem in forums, then offering a 20-minute setup call. What did not: two directories (lots of visits, zero signups) and a cold email batch with a 1% reply rate. Happy to share the message I used.',
    author: 'Founder of a scheduling tool for small clinics',
    stage: 5,
  },
  {
    id: 'ex-validation-interviews',
    kind: 'idea',
    room: 'validation',
    title: 'Physio clinics lose 6 hours a week to no-shows. Worth building for?',
    body: '14 interviews in. Every clinic owner named no-shows as a top-three problem, but only 3 already pay for reminders. Is "they already pay for something" the better signal, or the pain itself? What would you test next before writing code?',
    author: 'First-time founder, healthcare',
    stage: 3,
  },
  {
    id: 'ex-product-landing',
    kind: 'feedback',
    room: 'product',
    title: 'Landing page check: is it clear what we do in five seconds?',
    body: 'Testers keep describing us as "an invoicing app", but we are a cash-flow forecast for freelancers. Link and screenshot below. What do you think we do, and what made you think that?',
    author: 'Two-person team, fintech',
    stage: 4,
  },
  {
    id: 'ex-building-nocode',
    kind: 'discussion',
    room: 'building',
    title: 'No-code or code for a two-sided marketplace MVP?',
    body: 'Tutors on one side, parents on the other, payments in the middle. I can ship a no-code version in three weeks or a coded one in eight. If you built a marketplace, what broke first on no-code, and when did you rebuild?',
    author: 'Non-technical founder, edtech',
    stage: 4,
  },
  {
    id: 'ex-launch-directories',
    kind: 'milestone',
    room: 'launch',
    title: 'Launch week numbers: 3 directories, 1,240 visits, 61 waitlist signups',
    body: 'Biggest surprise: the smallest directory sent the best visitors (12% signup rate vs 3%). Posting the full breakdown and the copy I changed halfway through the week, in case it helps anyone launching next.',
    author: 'Indie maker, productivity tools',
    stage: 5,
  },
  {
    id: 'ex-traction-channels',
    kind: 'discussion',
    room: 'traction',
    title: 'Cold email vs LinkedIn for B2B: 200 sends each',
    body: 'Email: 4% replies, 2 demos. LinkedIn: 11% replies, 1 demo. More replies on LinkedIn, but they were mostly polite no\'s. Is anyone measuring a channel by demos booked rather than replies? Curious what your bar is before you double down.',
    author: 'Founder, B2B sales tool',
    stage: 6,
  },
  {
    id: 'ex-fundraising-market',
    kind: 'feedback',
    room: 'fundraising',
    title: 'Pre-seed deck: every investor asks about market size. Is my slide the problem?',
    body: 'I show a top-down TAM from an industry report. Three calls in a row, the first question was "how did you get that number?" Should I switch to bottom-up (clinics × price) even though it looks smaller?',
    author: 'Founder raising a pre-seed round',
    stage: 7,
  },
  {
    id: 'ex-founder-life-job',
    kind: 'discussion',
    room: 'founder-life',
    title: 'How do you protect build time with a full-time job?',
    body: 'I get two good evenings a week and they keep disappearing into email and "quick" admin. What routine actually worked for you while employed? Mornings, weekends, one long day?',
    author: 'Side-project founder',
    stage: 2,
  },
];

export interface ExampleLaunch {
  id: string;
  name: string;
  headline: string;
  category: string;
  author: string;
}

/** Fictional products, to show how a round reads before anyone has entered. */
export const EXAMPLE_LAUNCHES: readonly ExampleLaunch[] = [
  { id: 'ex-launch-clinic', name: 'Clinic reminders', headline: 'Text-message reminders that cut no-shows for small physio clinics.', category: 'HealthTech', author: 'Solo founder' },
  { id: 'ex-launch-forecast', name: 'Freelancer forecast', headline: 'See your cash for the next 90 days from the invoices you already send.', category: 'FinTech', author: 'Two-person team' },
  { id: 'ex-launch-quotes', name: 'Site-visit quotes', headline: 'Turn a site visit into a priced quote before you leave the driveway.', category: 'SaaS', author: 'Founder, trades software' },
];

export function examplesForRoom(room: string | null | undefined): readonly ExamplePost[] {
  return room ? EXAMPLE_POSTS.filter((post) => post.room === room) : EXAMPLE_POSTS;
}
