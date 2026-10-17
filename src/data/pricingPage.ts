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
  { value: 'founders', label: 'Standard Accounts' },
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
};

// Laid out as a quote sheet (2026-10-17): the terms that set the price on the
// left, what every program gets on the right. The reply time is the one the
// sales pop-up promises.
export const INSTITUTION_PRICING = {
  eyebrow: 'Institutions',
  title: 'Custom pricing',
  audience: 'Accelerators, incubators, university programs and other institutions.',
  terms: [
    { label: 'Priced', value: 'Per program' },
    { label: 'Based on', value: 'Number of startups and program length' },
    { label: 'Starts with', value: 'A 30-day validation pilot' },
    { label: 'Reply', value: 'Within 1–2 business days' },
  ],
  cta: 'Talk with sales',
  secondary: { label: 'How the pilot works', href: '/enterprise' },
  includesTitle: 'Every program includes',
  includes: [
    { key: 'pilot', text: 'A 30-day validation pilot to start' },
    { key: 'access', text: 'Platform access for every founder' },
    { key: 'checkins', text: 'Weekly check-ins run by our team' },
    { key: 'report', text: 'A final cohort report, in your funder’s format' },
    { key: 'setup', text: 'Setup around your program’s length, size and founders' },
    { key: 'after', text: 'Founders keep the free plan after the program' },
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
