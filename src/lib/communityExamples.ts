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
  chloe: { name: 'Chloé Martin', handle: 'chloemartin', role: 'Founder, Petpatch', look: { skin: SKIN.light, hair: HAIR.blond, style: 'bun', background: '#FFEAD6', shirt: '#E07A2E' } },
  mateus: { name: 'Mateus Silva', handle: 'mateussilva', role: 'Founder, Fieldbook', look: { skin: SKIN.tan, hair: HAIR.darkBrown, style: 'curly', background: '#DFF3E2', shirt: '#2D8A3E' } },
  linh: { name: 'Linh Tran', handle: 'linhtran', role: 'Founder, Menuwise', look: { skin: SKIN.fair, hair: HAIR.black, style: 'long', glasses: true, background: '#FFE1E4', shirt: '#C23A4A' } },
  jakub: { name: 'Jakub Nowak', handle: 'jakubnowak', role: 'Founder, Flatsplit', look: { skin: SKIN.light, hair: HAIR.brown, style: 'buzz', background: '#E2E8FF', shirt: '#3D55C8' } },
  zara: { name: 'Zara Ahmed', handle: 'zaraahmed', role: 'Founder, Gigshelf', look: { skin: SKIN.tan, hair: HAIR.black, style: 'long', background: '#EFE3FF', shirt: '#6B32C8' } },
} satisfies Record<string, ExamplePerson>;

export const EXAMPLE_POSTS: readonly ExamplePost[] = [
  {
    id: 'ex-pricing-reviewer', kind: 'feedback', room: 'pricing', author: PEOPLE.daniel, stage: 3, ago: '3h',
    title: 'Is $19/mo too cheap for a pitch deck review tool? Or is monthly just wrong?',
    body: `Been building Deckpulse nights and weekends for ~4 months. It reads your deck and flags the slides where angels usually check out, trained on ~300 decks I tagged by hand plus what came up in my own raise last year.

Talked to 11 founders this month:
- 2 said they'd pay $19/mo without blinking
- 5 said they'd only need it for 2-3 weeks before a raise, so a subscription feels weird
- 4 said "cool" and never replied again 😅

I'm leaning towards a one-off $49 "raise pass" (30 days) instead. Has anyone priced something people only need occasionally? What did you land on, and did it hurt revenue?`,
  },
  {
    id: 'ex-customers-first-ten', kind: 'milestone', room: 'customers', author: PEOPLE.laura, stage: 5, ago: '7h',
    title: '10 paying clinics, 41 days after launch. What worked and what was a waste of time',
    body: `Nudgebay sends text reminders so physio clinics stop losing slots to no-shows. €39/mo per clinic.

What worked:
1. Searching physio Facebook groups for "no-show" and replying to people who were already complaining. 6 of the 10 came from that.
2. Offering a 20-min setup call instead of a free trial. Everyone who took the call converted except one.
3. Asking each new clinic "who else do you know dealing with this?" → 2 referrals.

What didn't:
- Two startup directories. ~900 visits, 0 clinics. Wrong audience entirely.
- Cold email to 150 clinics. 1% reply rate, 0 sales.

Next goal is 25 by end of the quarter. If you've sold to small healthcare practices, how did you handle "I need to check with our receptionist"?`,
  },
  {
    id: 'ex-validation-interviews', kind: 'idea', room: 'validation', author: PEOPLE.priya, stage: 3, ago: '1d',
    title: '14 interviews with clinic owners. Is "they already pay for something" a better signal than "it hurts"?',
    body: `Context: I'm a physio and I've been toying with building something for appointment no-shows.

After 14 interviews:
- 14/14 said no-shows are a top-3 problem
- 9/14 estimated they lose 4-8 hours a week
- only 3/14 pay for anything today (SMS reminders bundled into their booking system)

Part of me reads that as "huge gap, nobody's solved it". The other part reads it as "they complain but won't pay".

For those who validated in a niche like this: what test actually told you people would pay? I'm thinking a fake-door "book a demo" page with the price on it before I write any code.`,
  },
  {
    id: 'ex-product-landing', kind: 'feedback', room: 'product', author: PEOPLE.tom, stage: 4, ago: '1d',
    title: 'Roast my landing page: people think we are an invoicing app (we are not)',
    body: `Pebblecast shows freelancers how much cash they'll have over the next 90 days, using the invoices they've already sent. That's it.

I watched 6 people land on the homepage for the first time (Zoom, screen share). 4 of them described it back to me as "an invoicing tool". Which… makes sense, because the hero screenshot is literally an invoice list. 🤦‍♂️

What I'm considering:
- swap the hero image for the 90-day cash chart
- change the headline from "Get paid on time, plan with confidence" to "Know your cash for the next 90 days"

Blunt feedback welcome. From the headline alone, what do you think it does?`,
  },
  {
    id: 'ex-building-nocode', kind: 'discussion', room: 'building', author: PEOPLE.marcus, stage: 4, ago: '2d',
    title: 'Non-technical founder: no-code MVP for a two-sided marketplace, or wait and build it properly?',
    body: `I'm building a tutoring marketplace (parents ↔ vetted maths tutors, payments in the middle). I can't code.

Option A: Softr + Airtable + Stripe Connect. I can have something live in ~3 weeks myself.
Option B: pay a freelance dev. ~8 weeks and most of my savings.

My worry with A is that payouts get messy fast and I'll have to rebuild exactly when things start working. My worry with B is spending 8 weeks building something nobody books.

If you launched a marketplace on no-code: what broke first, and how many transactions did you get to before you rebuilt?`,
  },
  {
    id: 'ex-launch-directories', kind: 'milestone', room: 'launch', author: PEOPLE.sofia, stage: 5, ago: '2d',
    title: 'Launch week recap: 3 directories, 1,240 visits, 61 waitlist signups. The smallest one won',
    body: `Launched Kilnly (bookings + firing schedules for community pottery studios) last week. Sharing numbers because posts like this helped me a lot before launching.

Big general directory: 780 visits → 19 signups (2.4%)
Maker/indie directory: 310 visits → 21 signups (6.8%)
Tiny crafts newsletter: 150 visits → 21 signups (14%)

Biggest lesson: niche beats big, by a mile. I also changed the headline on Wednesday from "Studio management, simplified" to "Stop running your kiln schedule in a spreadsheet" and the signup rate roughly doubled for the rest of the week.

Happy to share the exact copy if you're launching soon.`,
  },
  {
    id: 'ex-traction-channels', kind: 'discussion', room: 'traction', author: PEOPLE.kenji, stage: 6, ago: '3d',
    title: 'Cold email vs LinkedIn DMs for B2B: 200 sends each, results inside',
    body: `Ran a small two-week test for Leadlane (we sell to sales teams at 20-100 person SaaS companies).

Email, 200 sends: 8 replies (4%), 2 demos booked
LinkedIn, 200 connection requests + 1 follow-up: 22 replies (11%), 1 demo booked

LinkedIn "won" on replies, but most were polite "not right now". Email replies were fewer but far more qualified.

I'm now judging channels purely on demos booked per 100 sends. What metric do you use before deciding to double down on a channel? Replies feel like a vanity number in hindsight.`,
  },
  {
    id: 'ex-fundraising-market', kind: 'feedback', room: 'fundraising', author: PEOPLE.hannah, stage: 7, ago: '4d',
    title: 'Pre-seed: 3 calls in a row, the first question was "how did you get that market size?"',
    body: `My market slide uses a top-down number from an industry report (€4.2B "clinic software market"). Every investor so far has poked at it within five minutes, and the rest of the call I'm on the back foot.

I rebuilt it bottom-up last night: ~38,000 independent clinics in our 4 launch countries × €468/yr = €17.8M serviceable today. Much smaller, but I can defend every number.

Is it a mistake to show the smaller number at pre-seed? Or do I lead with bottom-up and keep the big market for the expansion story? Would really appreciate input from anyone who raised recently.`,
  },
  {
    id: 'ex-founder-life-job', kind: 'discussion', room: 'founder-life', author: PEOPLE.omar, stage: 2, ago: '5d',
    title: 'How do you actually protect build time with a full-time job?',
    body: `Product manager by day, building on the side for ~7 months. In theory I have two good evenings a week plus Saturday morning. In practice those evenings get eaten by email, "quick" admin and being too tired to think.

Things I've tried:
- 5am mornings: lasted 9 days
- one long Saturday: productive, but I lose the whole weekend
- phone in another room: honestly helps more than anything else

If you shipped something while employed, what routine actually stuck for more than a month?`,
  },
];

/** A generated app-icon logo: a gradient tile with a glyph. */
export interface LogoSpec {
  glyph: LogoGlyph;
  from: string;
  to: string;
}

export type LogoGlyph =
  | 'bell' | 'pebble' | 'ruler' | 'cap' | 'slides' | 'clipboard' | 'flame' | 'send'
  | 'pie' | 'timer' | 'paw' | 'sprout' | 'utensils' | 'house' | 'music';

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
  { id: 'ex-launch-deckpulse', name: 'Deckpulse', headline: 'Scores every slide of your pitch deck against the questions angels actually ask.', category: 'AI & Machine Learning', maker: PEOPLE.daniel, logo: { glyph: 'slides', from: '#5B8CFF', to: '#2346C7' } },
  { id: 'ex-launch-tutorloop', name: 'Tutorloop', headline: 'Matches parents with a vetted maths tutor in under 24 hours, payments included.', category: 'EdTech', maker: PEOPLE.marcus, logo: { glyph: 'cap', from: '#FFC24B', to: '#E08A00' } },
  { id: 'ex-launch-shiftnote', name: 'Shiftnote', headline: 'Night-shift nurses dictate the handover in 30 seconds; the day team reads it in 10.', category: 'HealthTech', maker: PEOPLE.priya, logo: { glyph: 'clipboard', from: '#3CCB8C', to: '#16895A' } },
  { id: 'ex-launch-kilnly', name: 'Kilnly', headline: 'Shelf bookings and firing schedules for community pottery studios, without the spreadsheet.', category: 'Consumer & D2C', maker: PEOPLE.sofia, logo: { glyph: 'flame', from: '#FF9A6B', to: '#C2412D' } },
  { id: 'ex-launch-leadlane', name: 'Leadlane', headline: 'Ranks cold-email replies by how likely they are to turn into a booked demo.', category: 'SaaS', maker: PEOPLE.kenji, logo: { glyph: 'send', from: '#33C3D6', to: '#0E7C8C' } },
  { id: 'ex-launch-boundsize', name: 'Boundsize', headline: 'Builds a bottom-up market size from your price and customer count, ready for slide 4.', category: 'FinTech', maker: PEOPLE.hannah, logo: { glyph: 'pie', from: '#F06BA8', to: '#B0306E' } },
  { id: 'ex-launch-twoevenings', name: 'Two Evenings', headline: 'Guards two weeknights for your side project and holds every notification until you are done.', category: 'Media & Creator Economy', maker: PEOPLE.omar, logo: { glyph: 'timer', from: '#9AD45B', to: '#4E8A1E' } },
  { id: 'ex-launch-petpatch', name: 'Petpatch', headline: 'Find a neighbour who already feeds cats on your street while you travel.', category: 'Consumer & D2C', maker: PEOPLE.chloe, logo: { glyph: 'paw', from: '#FFB36B', to: '#E06A1F' } },
  { id: 'ex-launch-fieldbook', name: 'Fieldbook', headline: 'Offline crop and spray logs for small farms that sync the moment the signal returns.', category: 'FoodTech & AgTech', maker: PEOPLE.mateus, logo: { glyph: 'sprout', from: '#6DD07A', to: '#2D8A3E' } },
  { id: 'ex-launch-menuwise', name: 'Menuwise', headline: 'Reprices your restaurant menu the day a supplier raises costs, so margins stay put.', category: 'Travel & Hospitality', maker: PEOPLE.linh, logo: { glyph: 'utensils', from: '#FF7A7A', to: '#C23A4A' } },
  { id: 'ex-launch-flatsplit', name: 'Flatsplit', headline: 'Collects rent and splits utility bills fairly in shared flats, down to the last kettle.', category: 'PropTech & Real Estate', maker: PEOPLE.jakub, logo: { glyph: 'house', from: '#7C9CFF', to: '#3D55C8' } },
  { id: 'ex-launch-gigshelf', name: 'Gigshelf', headline: 'One link for independent musicians: tour dates, merch and a mailing list that fills itself.', category: 'Media & Creator Economy', maker: PEOPLE.zara, logo: { glyph: 'music', from: '#B57CFF', to: '#6B32C8' } },
];

export function examplesForRoom(room: string | null | undefined): readonly ExamplePost[] {
  return room ? EXAMPLE_POSTS.filter((post) => post.room === room) : EXAMPLE_POSTS;
}

/**
 * Example people who have a photo in public/community-examples/<handle>.jpg:
 * an AI-generated face of nobody real, licensed for commercial use (see the
 * README there). Add a handle here when its file is added; everyone else keeps
 * the drawn avatar, and no request is made for a photo that is not there.
 */
export const EXAMPLE_PHOTO_HANDLES: ReadonlySet<string> = new Set<string>([]);

export function examplePhoto(handle: string): string | undefined {
  return EXAMPLE_PHOTO_HANDLES.has(handle) ? `/community-examples/${handle}.jpg` : undefined;
}
