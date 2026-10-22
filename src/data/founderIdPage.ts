/**
 * Copy for /founder-id: the landing page for Founder ID, the public profile of
 * founder and builder accounts (src/lib/founderId.ts).
 *
 * Positioning (Javier, 2026-10-21): Founder ID is one of the platform's main
 * selling points. Lead with how easy it is to share (one short link), then walk
 * through its three parts: Profile, Support and Project Updates. Written for a
 * broad business audience, so no ICP, PMF or MVP jargon.
 *
 * Every claim was checked against the product on 2026-10-21:
 * - short link and share options: src/lib/founderId.ts, ProfileShareButton.tsx
 * - link preview card: api/og-profile.tsx, api/_founder-id-card.tsx
 * - profile links: ProfileLinks.tsx
 * - support providers and payment: ProfileSupportSection.tsx, lib/supportLinks.ts
 * - updates (kinds, photos, YouTube, schedule, pin, Rooms, reactions):
 *   JourneyPostComposer.tsx, ProfilePosts.tsx, PostContent.tsx
 * Support is donations through the founder's own provider page. Never imply
 * investment, and never say Creatives Takeover processes the payment.
 *
 * Pure data with no imports, so node tests can read it. The SEO title and
 * description are mirrored in scripts/seo-route-config.mjs.
 */

export const FOUNDER_ID_PATH = '/founder-id';

/** The example short link shown on the page and the share card. */
export const FOUNDER_ID_EXAMPLE_LINK = 'creatives-takeover.com/@yourname';

/**
 * Invented founders for the example cards (Javier, 2026-10-21: no real
 * account on the cards). Initials stand in for photos so nobody reads them
 * as real people, and the page labels them as examples. Global names, see
 * the market-approach rule. Stages are the real stage labels.
 */
export const FOUNDER_ID_EXAMPLE_CARDS = [
  // Ordinary names and handles, checked against profiles on 2026-10-22 so
  // none of them belongs to a real account.
  { name: 'Daniel Mensah', handle: 'danielmensah', number: '000 341', stage: 'Validation', tagline: 'Payroll for small restaurants' },
  { name: 'Sofía Marín', handle: 'sofiamarin', number: '000 117', stage: 'Building', tagline: 'Online booking for physiotherapists' },
  { name: 'Priya Raman', handle: 'priyaraman', number: '001 482', stage: 'Traction', tagline: 'Meal plans for new parents' },
  { name: 'Tom Whitfield', handle: 'tomwhitfield', number: '000 769', stage: 'Launch', tagline: 'Inventory app for bike shops' },
];

export const FOUNDER_ID_SEO = {
  title: 'Founder ID: Your Project in One Link | Creatives Takeover',
  description:
    'Founder ID is a free public page for founders and builders: your project, your links, a way to support you and your updates, all at one short link.',
  keywords:
    'founder profile, startup profile page, link in bio for founders, founder link, share your startup, support my project, project updates page',
  image: '/og-founder-id.png',
};

export const FOUNDER_ID_HERO = {
  eyebrow: 'Founder ID',
  titleLead: 'Everything you’re building,',
  titleAccent: 'in one link.',
  lede:
    'Founder ID is your public page on Creatives Takeover. Your project, your links, a way for people to support you and your latest progress, at one short address you can share anywhere.',
  primaryCta: 'Create your Founder ID',
  signedInCta: 'Open my Founder ID',
  secondaryCta: 'See what’s inside',
  cardCaption: 'Example Founder ID cards',
  note: 'Free with every founder and builder account.',
};

export const FOUNDER_ID_SHARE = {
  eyebrow: 'Made to be shared',
  title: 'One link for every place',
  titleAccent: 'you show up.',
  lede: 'Put one address in your bio, your pitch deck and your email signature. It always opens on who you are and what you’re building.',
  items: [
    {
      key: 'link',
      title: 'A link people remember',
      body: 'creatives-takeover.com/@yourname. Add it to your bio, email signature, pitch deck or business card.',
    },
    {
      key: 'preview',
      title: 'A clean preview when you post it',
      body: 'Share to LinkedIn or X in one click. The post shows a Founder ID card with your name and what you’re building.',
    },
    {
      key: 'live',
      title: 'Always the latest version',
      body: 'Update your links or post progress, and everyone who opens your link sees it right away.',
    },
    {
      // supabase/migrations/20261022220000_permanent_founder_numbers.sql:
      // assigned from a sequence when the profile is created, never changed.
      key: 'number',
      title: 'A founder number that stays yours',
      body: 'Every Founder ID gets a permanent number, given in the order people join. It’s printed on your card and never changes.',
    },
  ],
};

export const FOUNDER_ID_SECTIONS = {
  id: 'inside',
  eyebrow: 'What’s inside',
  title: 'What people see when they',
  titleAccent: 'open your link.',
  items: [
    {
      key: 'profile',
      label: 'Profile',
      title: 'Who you are and what you’re building.',
      body: 'Your name, location and one-line pitch, right next to your project and what it does.',
      bullets: [
        'Your role, stage and industry at a glance',
        'Project links: website, demo, Loom video, pitch deck and waitlist',
        'Your LinkedIn, X, GitHub and Instagram',
        'Connect and Message buttons, so people can reach you',
      ],
    },
    {
      key: 'support',
      label: 'Support',
      title: 'Let people back your project.',
      body: 'Add your Patreon, PayPal or Buy Me a Coffee page. Visitors tap Donate and pay you there.',
      bullets: [
        'Ko-fi, Stripe, GitHub Sponsors and Open Collective work too',
        'Payment happens on your provider’s page, not through Creatives Takeover',
        'Supporters don’t need a Creatives Takeover account',
      ],
    },
    {
      key: 'updates',
      label: 'Project Updates',
      title: 'Show your progress.',
      body: 'Post milestones, ideas and requests for feedback, with photos or a YouTube video.',
      bullets: [
        'Schedule posts, and pin the one people should see first',
        'People can like, comment, repost and share your updates',
        'Post to Rooms too, where other founders on Creatives Takeover see it',
      ],
    },
  ],
};

export const FOUNDER_ID_CLOSING = {
  eyebrow: 'Claim yours',
  title: 'Your number is',
  titleAccent: 'waiting.',
  body: 'Sign up free as a founder or builder, then add your project, your links and your first update. Your founder number is assigned the moment you join.',
};
