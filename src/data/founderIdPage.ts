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
  note: 'Free with account creation.',
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
        'Your LinkedIn, X, GitHub, Instagram or YouTube',
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

// "Try it with your name": the visitor's own card, before signing up. The link
// shown follows the real rule (first and last name, lowercased, accents and
// symbols removed, a number added if taken; supabase/migrations/
// 20260215110000_fix_profile_username_generation_normalization.sql).
export const FOUNDER_ID_TRY = {
  eyebrow: 'Try it',
  title: 'See your card',
  titleAccent: 'before you sign up.',
  lede: 'Type your name and what you’re building. This is the card people see when you share your link.',
  nameLabel: 'Your name',
  namePlaceholder: 'Daniel Mensah',
  projectLabel: 'What you’re building',
  projectPlaceholder: 'Payroll for small restaurants',
  linkLabel: 'Your link would be',
  takenNote: 'That name is taken, so a number is added.',
  numberNote: 'Your founder number is assigned when you join.',
};

// For programs: the cohort showcase (supabase/migrations/20261022032451_cohort_showcase.sql).
export const FOUNDER_ID_PROGRAMS = {
  eyebrow: 'For programs',
  title: 'Give every startup in your cohort',
  titleAccent: 'a Founder ID.',
  lede: 'Turn on a public showcase for your cohort: one page with every startup’s Founder ID card, ready for demo day or your website.',
  bullets: [
    'One link for the whole cohort',
    'Each founder chooses whether to appear',
    'Every card opens the founder’s live Founder ID',
  ],
  cta: { label: 'See programs', href: '/enterprise' },
  exampleLabel: 'Example showcase · Spring cohort',
};

// Every answer checked against the product on 2026-10-22.
export const FOUNDER_ID_FAQS = [
  {
    question: 'Is Founder ID free?',
    answer: 'Yes. Every founder and builder account comes with a Founder ID, including on the free Rookie plan.',
  },
  {
    question: 'Who can see my Founder ID?',
    answer: 'Anyone with your link, signed in or not. Your stage only shows if you choose to make your progress public, and your workspace, files and ideas stay private.',
  },
  {
    question: 'Does Creatives Takeover take a cut of donations?',
    answer: 'No. Supporters pay on your own Patreon, PayPal, Buy Me a Coffee or other provider page. Creatives Takeover never handles the payment.',
  },
  {
    question: 'How is my link chosen, and can it change?',
    answer: 'Your link comes from your name, for example creatives-takeover.com/@danielmensah, with a number added if the name is taken. If you change your name in Edit Founder ID, your link changes with it and links you shared before stop working.',
  },
  {
    question: 'What is the founder number?',
    answer: 'A permanent number given in the order people join. It is printed on your share card and never changes.',
  },
  {
    question: 'Do I need a startup to have one?',
    answer: 'No. Founder and builder accounts both get a Founder ID, whether you are running a startup or building a side project.',
  },
];

export const FOUNDER_ID_FAQ_SECTION = {
  eyebrow: 'Questions',
  title: 'Before you',
  titleAccent: 'claim yours.',
};

export const FOUNDER_ID_CLOSING = {
  eyebrow: 'Claim yours',
  title: 'Your number is',
  titleAccent: 'waiting.',
  body: 'Sign up free as a founder or builder, then add your project, your links and your first update. Your founder number is assigned the moment you join.',
};
