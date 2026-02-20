export type WaitlistTheme = 'light' | 'dark';
export type WaitlistAccent = 'indigo' | 'emerald' | 'rose' | 'orange' | 'sky';
export type WaitlistLayout = 'centered' | 'split';
export type WaitlistVariant = 'A' | 'B';
export type WaitlistIntegrationProvider = 'none' | 'mailchimp' | 'convertkit';

export interface WaitlistSocialLinks {
  website?: string;
  x?: string;
  linkedin?: string;
}

export interface WaitlistFaqItem {
  question: string;
  answer: string;
}

export interface WaitlistTestimonial {
  quote: string;
  author: string;
  role?: string;
}

export interface WaitlistContent {
  headline: string;
  headlineVariantB?: string;
  subheadline: string;
  problemStatement: string;
  solutionSummary: string;
  benefits: string[];
  howItWorks: string[];
  trustItems: string[];
  faq: WaitlistFaqItem[];
  testimonials: WaitlistTestimonial[];
  socialProof: string;
  ctaText: string;
  emailPlaceholder: string;
  collectFirstName?: boolean;
  collectConsent?: boolean;
  consentRequired?: boolean;

  theme?: WaitlistTheme;
  accentColor?: WaitlistAccent;
  layout?: WaitlistLayout;
  logoUrl?: string;
  imageUrl?: string;
  socialLinks?: WaitlistSocialLinks;
  launchDate?: string | null;

  abTestEnabled?: boolean;
  referralMessage?: string;

  webhookUrl?: string;
  integrationProvider?: WaitlistIntegrationProvider;
  integrationListId?: string;
  confirmationEmailEnabled?: boolean;
}

export interface WaitlistSignupPayload {
  email: string;
  firstName?: string;
  consent?: boolean;
  honeypot?: string;
}

const DEFAULT_FAQ: WaitlistFaqItem[] = [
  {
    question: 'Who is this for?',
    answer: 'Founders who want to validate demand before building a full product.',
  },
  {
    question: 'When will access open?',
    answer: 'Early users are invited in batches based on waitlist order and fit.',
  },
  {
    question: 'Will there be updates?',
    answer: 'Yes. You will receive product updates and launch notifications by email.',
  },
];

const DEFAULT_TESTIMONIALS: WaitlistTestimonial[] = [
  {
    quote: 'This made it obvious what to build first and who to target.',
    author: 'Early Founder',
    role: 'B2B SaaS',
  },
  {
    quote: 'We used this to test demand before writing any production code.',
    author: 'Startup Team',
    role: 'Pre-seed',
  },
];

export const WAITLIST_ACCENT_PRESETS: Array<{ value: WaitlistAccent; label: string; hex: string }> = [
  { value: 'indigo', label: 'Indigo', hex: '#4f46e5' },
  { value: 'emerald', label: 'Emerald', hex: '#059669' },
  { value: 'rose', label: 'Rose', hex: '#e11d48' },
  { value: 'orange', label: 'Orange', hex: '#ea580c' },
  { value: 'sky', label: 'Sky', hex: '#0284c7' },
];

function sanitizeText(input: unknown, fallback = ''): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  return trimmed || fallback;
}

function sanitizeArray(input: unknown, fallback: string[], min = 0, max = 10): string[] {
  if (!Array.isArray(input)) return fallback;
  const normalized = input
    .map((item) => sanitizeText(item))
    .filter(Boolean)
    .slice(0, max);
  if (normalized.length < min) return fallback;
  return normalized;
}

function sanitizeFaq(input: unknown): WaitlistFaqItem[] {
  if (!Array.isArray(input)) return DEFAULT_FAQ;
  const items = input
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      const question = sanitizeText(item?.question);
      const answer = sanitizeText(item?.answer);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter(Boolean) as WaitlistFaqItem[];
  return items.length > 0 ? items.slice(0, 6) : DEFAULT_FAQ;
}

function sanitizeTestimonials(input: unknown): WaitlistTestimonial[] {
  if (!Array.isArray(input)) return DEFAULT_TESTIMONIALS;
  const items = input
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      const quote = sanitizeText(item?.quote);
      const author = sanitizeText(item?.author);
      const role = sanitizeText(item?.role);
      if (!quote || !author) return null;
      return { quote, author, role: role || undefined };
    })
    .filter(Boolean) as WaitlistTestimonial[];
  return items.length > 0 ? items.slice(0, 4) : DEFAULT_TESTIMONIALS;
}

function normalizeTheme(input: unknown): WaitlistTheme {
  return input === 'light' ? 'light' : 'dark';
}

function normalizeAccent(input: unknown): WaitlistAccent {
  const value = typeof input === 'string' ? input : '';
  return (WAITLIST_ACCENT_PRESETS.find((item) => item.value === value)?.value ?? 'indigo') as WaitlistAccent;
}

function normalizeLayout(input: unknown): WaitlistLayout {
  return input === 'split' ? 'split' : 'centered';
}

function normalizeProvider(input: unknown): WaitlistIntegrationProvider {
  if (input === 'mailchimp' || input === 'convertkit') return input;
  return 'none';
}

export function getDefaultWaitlistContent(productName?: string): WaitlistContent {
  const name = sanitizeText(productName, 'Your Product');

  return {
    headline: `Get early access to ${name}`,
    headlineVariantB: `Join the first users of ${name}`,
    subheadline: 'Be first to use the product and shape the roadmap before public launch.',
    problemStatement: 'Most founders build too much before validating demand. This helps you test demand first.',
    solutionSummary: `${name} helps you capture qualified interest and learn what users actually want before development.`,
    benefits: [
      'Clarify your value proposition with real audience intent',
      'Capture high-signal emails from interested early users',
      'Prioritize features based on direct market feedback',
    ],
    howItWorks: [
      'Describe your offer in one clear sentence',
      'Publish your page and share it with your audience',
      'Track signups and optimize before building',
    ],
    trustItems: ['No-code setup', 'Fast publish', 'Built for founders'],
    faq: DEFAULT_FAQ,
    testimonials: DEFAULT_TESTIMONIALS,
    socialProof: 'Founders are already using this process to validate demand before building.',
    ctaText: 'Join the waitlist',
    emailPlaceholder: 'Your best email address',
    collectFirstName: false,
    collectConsent: false,
    consentRequired: false,
    theme: 'dark',
    accentColor: 'indigo',
    layout: 'centered',
    logoUrl: '',
    imageUrl: '',
    socialLinks: {},
    launchDate: null,
    abTestEnabled: false,
    referralMessage: 'Know someone who would benefit? Share this page with them.',
    webhookUrl: '',
    integrationProvider: 'none',
    integrationListId: '',
    confirmationEmailEnabled: false,
  };
}

export function normalizeWaitlistContent(raw: unknown, productName?: string): WaitlistContent {
  const fallback = getDefaultWaitlistContent(productName);
  const input = (raw ?? {}) as Record<string, unknown>;

  const benefits = sanitizeArray(input.benefits, fallback.benefits, 3, 5);
  const howItWorks = sanitizeArray(input.howItWorks, fallback.howItWorks, 3, 4);
  const trustItems = sanitizeArray(input.trustItems, fallback.trustItems, 2, 5);

  return {
    headline: sanitizeText(input.headline, fallback.headline),
    headlineVariantB: sanitizeText(input.headlineVariantB, fallback.headlineVariantB),
    subheadline: sanitizeText(input.subheadline, fallback.subheadline),
    problemStatement: sanitizeText(input.problemStatement, fallback.problemStatement),
    solutionSummary: sanitizeText(input.solutionSummary, fallback.solutionSummary),
    benefits,
    howItWorks,
    trustItems,
    faq: sanitizeFaq(input.faq),
    testimonials: sanitizeTestimonials(input.testimonials),
    socialProof: sanitizeText(input.socialProof, fallback.socialProof),
    ctaText: sanitizeText(input.ctaText, fallback.ctaText),
    emailPlaceholder: sanitizeText(input.emailPlaceholder, fallback.emailPlaceholder),
    collectFirstName: Boolean(input.collectFirstName),
    collectConsent: Boolean(input.collectConsent),
    consentRequired: Boolean(input.consentRequired),
    theme: normalizeTheme(input.theme),
    accentColor: normalizeAccent(input.accentColor),
    layout: normalizeLayout(input.layout),
    logoUrl: sanitizeText(input.logoUrl, ''),
    imageUrl: sanitizeText(input.imageUrl, ''),
    socialLinks: {
      website: sanitizeText((input.socialLinks as Record<string, unknown> | undefined)?.website, ''),
      x: sanitizeText((input.socialLinks as Record<string, unknown> | undefined)?.x, ''),
      linkedin: sanitizeText((input.socialLinks as Record<string, unknown> | undefined)?.linkedin, ''),
    },
    launchDate: sanitizeText(input.launchDate, '') || null,
    abTestEnabled: Boolean(input.abTestEnabled),
    referralMessage: sanitizeText(input.referralMessage, fallback.referralMessage),
    webhookUrl: sanitizeText(input.webhookUrl, ''),
    integrationProvider: normalizeProvider(input.integrationProvider),
    integrationListId: sanitizeText(input.integrationListId, ''),
    confirmationEmailEnabled: Boolean(input.confirmationEmailEnabled),
  };
}

export function getAccentHex(accent: WaitlistAccent): string {
  return WAITLIST_ACCENT_PRESETS.find((item) => item.value === accent)?.hex ?? '#4f46e5';
}
