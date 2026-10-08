/**
 * Illustrative examples for empty Community feeds. They show newcomers what a
 * good post or launch looks like. People and products are invented and drawn
 * (illustrated avatars, generated logos, never photos of real people), and the
 * page always marks them "Example" with a note that members did not write
 * them. No vote or reply counts are shown. They render only while a feed has
 * no real posts, so they step aside on their own.
 */
import type { PostKind } from './launchpad.ts';

/** An illustrated avatar, drawn in ExampleAvatar. Chosen to fit the name. */
export interface AvatarLook {
  skin: string;
  hair: string;
  style: 'short' | 'long' | 'bun' | 'curly' | 'buzz';
  beard?: boolean;
  glasses?: boolean;
  background: string;
  shirt: string;
}

export interface ExamplePerson {
  name: string;
  handle: string;
  /** What they are building, shown under the name. */
  role: string;
  look: AvatarLook;
}

export interface ExamplePost {
  id: string;
  kind: PostKind;
  /** Room slug, from LAUNCHPAD_TOPICS. */
  room: string;
  title: string;
  body: string;
  author: ExamplePerson;
  /** Startup Development Cycle stage, 1 to 7. */
  stage: number;
  /** How long ago it reads as posted, for the meta line. */
  ago: string;
}

const SKIN = { light: '#F3D2B3', fair: '#E8B98F', olive: '#D19A6A', tan: '#B87A4B', brown: '#8D5A36', deep: '#5E3A22' };
const HAIR = { black: '#1F1A17', darkBrown: '#3B2A20', brown: '#6B4423', blond: '#D6B46A', auburn: '#8E3B1F', grey: '#9A9A9A' };

const PEOPLE = {
  daniel: { name: 'Daniel Okafor', handle: 'danokafor', role: 'Solo founder, B2B SaaS', look: { skin: SKIN.deep, hair: HAIR.black, style: 'buzz', beard: true, background: '#DCE7FF', shirt: '#3157D5' } },
  laura: { name: 'Laura Méndez', handle: 'lauramendez', role: 'Founder, Nudgebay', look: { skin: SKIN.olive, hair: HAIR.darkBrown, style: 'long', background: '#FFE3D6', shirt: '#E2643A' } },
  priya: { name: 'Priya Raman', handle: 'priyaraman', role: 'First-time founder, healthcare', look: { skin: SKIN.tan, hair: HAIR.black, style: 'long', background: '#E5F5EA', shirt: '#2E8B57' } },
  tom: { name: 'Tom Becker', handle: 'tombecker', role: 'Co-founder, Pebblecast', look: { skin: SKIN.light, hair: HAIR.blond, style: 'short', glasses: true, background: '#EDE6FF', shirt: '#6D4BD8' } },
  marcus: { name: 'Marcus Reid', handle: 'marcusreid', role: 'Non-technical founder, edtech', look: { skin: SKIN.brown, hair: HAIR.black, style: 'curly', background: '#FFF1C9', shirt: '#C78A00' } },
  sofia: { name: 'Sofia Rossi', handle: 'sofiarossi', role: 'Indie maker, productivity tools', look: { skin: SKIN.fair, hair: HAIR.brown, style: 'bun', background: '#FCE1EC', shirt: '#C2417A' } },
  kenji: { name: 'Kenji Watanabe', handle: 'kenjiw', role: 'Founder, B2B sales tool', look: { skin: SKIN.fair, hair: HAIR.black, style: 'short', background: '#D9F2F4', shirt: '#13808C' } },
  hannah: { name: 'Hannah Clarke', handle: 'hannahclarke', role: 'Raising a pre-seed round', look: { skin: SKIN.light, hair: HAIR.auburn, style: 'long', background: '#E6EEF8', shirt: '#2F5D8C' } },
  omar: { name: 'Omar Haddad', handle: 'omarhaddad', role: 'Side-project founder', look: { skin: SKIN.olive, hair: HAIR.black, style: 'short', beard: true, background: '#ECEFD9', shirt: '#5F7A1E' } },
  ryan: { name: 'Ryan Doyle', handle: 'ryandoyle', role: 'Founder, Siteprice', look: { skin: SKIN.light, hair: HAIR.brown, style: 'short', beard: true, background: '#E3ECF3', shirt: '#44627A' } },
} satisfies Record<string, ExamplePerson>;

export const EXAMPLE_POSTS: readonly ExamplePost[] = [
  {
    id: 'ex-pricing-reviewer', kind: 'feedback', room: 'pricing', author: PEOPLE.daniel, stage: 3, ago: '3h',
    title: 'Would you pay $19/month for a pitch-deck reviewer?',
    body: 'It scores each slide against the questions angels actually ask and tells you which one loses them. Two founders I interviewed said they would pay; one said it should be free with a paid "fix it for me" tier. Which would you pick, and why?',
  },
  {
    id: 'ex-customers-first-ten', kind: 'milestone', room: 'customers', author: PEOPLE.laura, stage: 5, ago: '7h',
    title: 'First 10 paying customers, 41 days after launch',
    body: 'What worked: replying to people who had already complained about no-shows in clinic forums, then offering a 20-minute setup call. What did not: two directories (lots of visits, zero signups) and a cold email batch with a 1% reply rate. Happy to share the message I used.',
  },
  {
    id: 'ex-validation-interviews', kind: 'idea', room: 'validation', author: PEOPLE.priya, stage: 3, ago: '1d',
    title: 'Physio clinics lose 6 hours a week to no-shows. Worth building for?',
    body: '14 interviews in. Every clinic owner named no-shows as a top-three problem, but only 3 already pay for reminders. Is "they already pay for something" the better signal, or the pain itself? What would you test next before writing code?',
  },
  {
    id: 'ex-product-landing', kind: 'feedback', room: 'product', author: PEOPLE.tom, stage: 4, ago: '1d',
    title: 'Landing page check: is it clear what we do in five seconds?',
    body: 'Testers keep describing Pebblecast as "an invoicing app", but it is a cash-flow forecast for freelancers. Link and screenshot below. What do you think we do, and what made you think that?',
  },
  {
    id: 'ex-building-nocode', kind: 'discussion', room: 'building', author: PEOPLE.marcus, stage: 4, ago: '2d',
    title: 'No-code or code for a two-sided marketplace MVP?',
    body: 'Tutors on one side, parents on the other, payments in the middle. I can ship a no-code version in three weeks or a coded one in eight. If you built a marketplace, what broke first on no-code, and when did you rebuild?',
  },
  {
    id: 'ex-launch-directories', kind: 'milestone', room: 'launch', author: PEOPLE.sofia, stage: 5, ago: '2d',
    title: 'Launch week numbers: 3 directories, 1,240 visits, 61 waitlist signups',
    body: 'Biggest surprise: the smallest directory sent the best visitors (12% signup rate vs 3%). Posting the full breakdown and the copy I changed halfway through the week, in case it helps anyone launching next.',
  },
  {
    id: 'ex-traction-channels', kind: 'discussion', room: 'traction', author: PEOPLE.kenji, stage: 6, ago: '3d',
    title: 'Cold email vs LinkedIn for B2B: 200 sends each',
    body: 'Email: 4% replies, 2 demos. LinkedIn: 11% replies, 1 demo. More replies on LinkedIn, but they were mostly polite no\'s. Is anyone measuring a channel by demos booked rather than replies? Curious what your bar is before you double down.',
  },
  {
    id: 'ex-fundraising-market', kind: 'feedback', room: 'fundraising', author: PEOPLE.hannah, stage: 7, ago: '4d',
    title: 'Pre-seed deck: every investor asks about market size. Is my slide the problem?',
    body: 'I show a top-down TAM from an industry report. Three calls in a row, the first question was "how did you get that number?" Should I switch to bottom-up (clinics × price) even though it looks smaller?',
  },
  {
    id: 'ex-founder-life-job', kind: 'discussion', room: 'founder-life', author: PEOPLE.omar, stage: 2, ago: '5d',
    title: 'How do you protect build time with a full-time job?',
    body: 'I get two good evenings a week and they keep disappearing into email and "quick" admin. What routine actually worked for you while employed? Mornings, weekends, one long day?',
  },
];

/** A generated app-icon logo: a gradient tile with a glyph. */
export interface LogoSpec {
  glyph: 'bell' | 'pebble' | 'ruler';
  from: string;
  to: string;
}

export interface ExampleLaunch {
  id: string;
  name: string;
  headline: string;
  category: string;
  maker: ExamplePerson;
  logo: LogoSpec;
}

/** Invented products, to show how a round reads before anyone has entered. */
export const EXAMPLE_LAUNCHES: readonly ExampleLaunch[] = [
  { id: 'ex-launch-nudgebay', name: 'Nudgebay', headline: 'Text-message reminders that cut no-shows for small physio clinics.', category: 'HealthTech', maker: PEOPLE.laura, logo: { glyph: 'bell', from: '#FF8A5B', to: '#E2453A' } },
  { id: 'ex-launch-pebblecast', name: 'Pebblecast', headline: 'See your cash for the next 90 days from the invoices you already send.', category: 'FinTech', maker: PEOPLE.tom, logo: { glyph: 'pebble', from: '#8B6CFF', to: '#4B3BD1' } },
  { id: 'ex-launch-siteprice', name: 'Siteprice', headline: 'Turn a site visit into a priced quote before you leave the driveway.', category: 'SaaS', maker: PEOPLE.ryan, logo: { glyph: 'ruler', from: '#2BC4A9', to: '#11806F' } },
];

export function examplesForRoom(room: string | null | undefined): readonly ExamplePost[] {
  return room ? EXAMPLE_POSTS.filter((post) => post.room === room) : EXAMPLE_POSTS;
}
