/**
 * Copy for /pricing, which sells to two audiences (B2B2C, 2026-10-17): founders
 * and builders get the four self-serve plans; institutions get the view below.
 *
 * Institutions (accelerators, incubators, university programs and others) are
 * not charged a single fee, so this view never shows a price: it leads to
 * "Talk with sales". Requests go through the contact-form-submission edge
 * function, which always emails admin@creatives-takeover.com and stores the
 * row in contact_submissions. Everything listed here is already promised on
 * /enterprise; written for program managers.
 *
 * Pure data with no imports, so node tests can read it.
 */

/** The ?for= value that opens this view, e.g. /pricing?for=institutions. */
export const PRICING_AUDIENCES = [
  { value: 'founders', label: 'Founders & builders' },
  { value: 'institutions', label: 'Institutions' },
] as const;

export type PricingAudience = (typeof PRICING_AUDIENCES)[number]['value'];

// Mirrored in scripts/seo-route-config.mjs; tests/pricing-audiences.test.ts
// keeps them equal.
export const PRICING_SEO = {
  title: 'Pricing for Founders and Programs | Creatives Takeover',
  description:
    'Four plans for founders and builders, from free to Pro, and custom pricing for accelerators, incubators and university programs. Talk with sales.',
};

export const PRICING_HEADER = {
  title: 'Pricing',
  lede: 'Plans for founders and builders. Custom pricing for programs.',
};

export const INSTITUTION_PRICING = {
  eyebrow: 'For accelerators, incubators, university programs and other institutions',
  title: 'Custom pricing',
  copy: 'Priced per program, based on the number of startups and the program’s length.',
  cta: 'Talk with sales',
  secondary: { label: 'How the pilot works', href: '/enterprise' },
  includesTitle: 'Every program includes',
  includes: [
    'A 30-day validation pilot to start',
    'Platform access for every founder',
    'Weekly check-ins run by our team',
    'A final cohort report, in your funder’s format',
    'Setup around your program’s length, size and founders',
    'Founders keep the free plan after the program',
  ],
  stepsTitle: 'How it works',
  steps: [
    { title: 'Talk with sales', body: 'A short call about your program.' },
    { title: 'Get a proposal', body: 'Priced for your cohort.' },
    { title: 'Start with a 30-day pilot', body: 'Then we set it up for your full program.' },
  ],
};

/** The "Talk with sales" pop-up. reason marks these leads in the admin email subject. */
export const SALES_DIALOG = {
  title: 'Talk with sales',
  copy: 'Tell us about your program. We reply within 1–2 business days.',
  submitLabel: 'Send to sales',
  reason: 'Sales request',
};
