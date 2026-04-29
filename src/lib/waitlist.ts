export type WaitlistTheme = 'light' | 'dark';
export type WaitlistAccent = 'indigo' | 'emerald' | 'rose' | 'orange' | 'sky';
export type WaitlistLayout = 'centered' | 'split';
export type WaitlistVariant = 'A' | 'B';
export type WaitlistIntegrationProvider = 'none' | 'mailchimp' | 'convertkit';
export type WaitlistTextAlign = 'left' | 'center';
export type WaitlistFieldType = 'text' | 'textarea' | 'url';
export type WaitlistDomainStatus = 'unconfigured' | 'pending' | 'verified' | 'failed';
export type WaitlistTemplateId =
  | 'saas'
  | 'ai-tool'
  | 'mobile-app'
  | 'marketplace'
  | 'community'
  | 'creator-tool'
  | 'ecommerce'
  | 'b2b-service';
export type WaitlistSectionId = 'problemSolution' | 'benefits' | 'howItWorks' | 'testimonials' | 'faq';

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

export interface WaitlistTypography {
  headingFamily: string;
  bodyFamily: string;
  headingWeight: number;
  bodyWeight: number;
  headingSize: number;
  subheadingSize: number;
  bodySize: number;
  letterSpacing: number;
}

export interface WaitlistColorPalette {
  pageBackground: string;
  sectionBackground: string;
  textPrimary: string;
  textSecondary: string;
  buttonBackground: string;
  buttonText: string;
  borderColor: string;
  inputBackground: string;
  inputText: string;
}

export interface WaitlistSpacing {
  sectionPaddingY: number;
  contentMaxWidth: number;
  cardRadius: number;
}

export interface WaitlistSectionVisibility {
  problemSolution: boolean;
  benefits: boolean;
  howItWorks: boolean;
  testimonials: boolean;
  faq: boolean;
}

export interface WaitlistCustomField {
  id: string;
  label: string;
  placeholder: string;
  type: WaitlistFieldType;
  required: boolean;
  enabled: boolean;
}

export interface WaitlistDomainSetup {
  domain: string;
  verificationToken: string;
  status: WaitlistDomainStatus;
  lastCheckedAt?: string | null;
  spfValid?: boolean;
  dkimValid?: boolean;
  verificationValid?: boolean;
}

export interface WaitlistEmailSetup {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
}

export interface WaitlistContent {
  templateId?: WaitlistTemplateId;
  sectionOrder?: WaitlistSectionId[];
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
  textAlign?: WaitlistTextAlign;
  logoUrl?: string;
  imageUrl?: string;
  socialLinks?: WaitlistSocialLinks;
  launchDate?: string | null;

  typography?: WaitlistTypography;
  colors?: WaitlistColorPalette;
  spacing?: WaitlistSpacing;
  sectionVisibility?: WaitlistSectionVisibility;

  customFields?: WaitlistCustomField[];
  successTitle?: string;
  successMessage?: string;
  successShareLabel?: string;

  domainSetup?: WaitlistDomainSetup;
  emailSetup?: WaitlistEmailSetup;

  abTestEnabled?: boolean;
  referralMessage?: string;

  webhookUrl?: string;
  integrationProvider?: WaitlistIntegrationProvider;
  integrationListId?: string;
  confirmationEmailEnabled?: boolean;
}

export interface WaitlistSignupCustomFieldValue {
  id: string;
  label: string;
  value: string;
}

export interface WaitlistSignupPayload {
  email: string;
  firstName?: string;
  consent?: boolean;
  honeypot?: string;
  customFields?: WaitlistSignupCustomFieldValue[];
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

export const WAITLIST_FONT_PRESETS = [
  { value: '"Sora", "Poppins", "Segoe UI", sans-serif', label: 'Sora' },
  { value: '"Space Grotesk", "Sora", "Segoe UI", sans-serif', label: 'Space Grotesk' },
  { value: '"Poppins", "Sora", "Segoe UI", sans-serif', label: 'Poppins' },
  { value: '"Manrope", "Sora", "Segoe UI", sans-serif', label: 'Manrope' },
  { value: '"DM Sans", "Poppins", "Segoe UI", sans-serif', label: 'DM Sans' },
] as const;

export const WAITLIST_TEMPLATE_IDS: WaitlistTemplateId[] = [
  'saas',
  'ai-tool',
  'mobile-app',
  'marketplace',
  'community',
  'creator-tool',
  'ecommerce',
  'b2b-service',
];

export const WAITLIST_SECTION_ORDER: WaitlistSectionId[] = [
  'problemSolution',
  'benefits',
  'howItWorks',
  'testimonials',
  'faq',
];

export const WAITLIST_THEME_PRESETS: Record<WaitlistTheme, WaitlistColorPalette> = {
  dark: {
    pageBackground: '#0f172a',
    sectionBackground: '#111827',
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    buttonBackground: '#ffffff',
    buttonText: '#111827',
    borderColor: '#334155',
    inputBackground: '#ffffff',
    inputText: '#111827',
  },
  light: {
    pageBackground: '#f8fafc',
    sectionBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    buttonBackground: '#0f172a',
    buttonText: '#f8fafc',
    borderColor: '#cbd5e1',
    inputBackground: '#ffffff',
    inputText: '#0f172a',
  },
};

const WAITLIST_ALLOWED_FIELD_TYPES: WaitlistFieldType[] = ['text', 'textarea', 'url'];

function sanitizeText(input: unknown, fallback = ''): string {
  if (typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  return trimmed || fallback;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
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

function sanitizeCustomFields(input: unknown): WaitlistCustomField[] {
  if (!Array.isArray(input)) return [];
  const items = input
    .map((raw, index) => {
      const item = raw as Record<string, unknown>;
      const id = sanitizeText(item.id, `custom_${index + 1}`);
      const label = sanitizeText(item.label, `Field ${index + 1}`);
      const placeholder = sanitizeText(item.placeholder, 'Type your answer');
      const type = WAITLIST_ALLOWED_FIELD_TYPES.includes(item.type as WaitlistFieldType)
        ? (item.type as WaitlistFieldType)
        : 'text';

      return {
        id,
        label,
        placeholder,
        type,
        required: Boolean(item.required),
        enabled: item.enabled !== false,
      };
    })
    .filter((item) => item.enabled)
    .slice(0, 8);

  return items;
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

function normalizeTextAlign(input: unknown): WaitlistTextAlign {
  return input === 'left' ? 'left' : 'center';
}

function normalizeProvider(input: unknown): WaitlistIntegrationProvider {
  if (input === 'mailchimp' || input === 'convertkit') return input;
  return 'none';
}

function normalizeTemplateId(input: unknown): WaitlistTemplateId {
  return WAITLIST_TEMPLATE_IDS.includes(input as WaitlistTemplateId) ? (input as WaitlistTemplateId) : 'saas';
}

function normalizeSectionOrder(input: unknown): WaitlistSectionId[] {
  if (!Array.isArray(input)) return WAITLIST_SECTION_ORDER;
  const seen = new Set<WaitlistSectionId>();
  const ordered = input
    .filter((item): item is WaitlistSectionId => WAITLIST_SECTION_ORDER.includes(item as WaitlistSectionId))
    .filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });

  return [...ordered, ...WAITLIST_SECTION_ORDER.filter((item) => !seen.has(item))];
}

function normalizeDomainStatus(input: unknown): WaitlistDomainStatus {
  if (input === 'pending' || input === 'verified' || input === 'failed') return input;
  return 'unconfigured';
}

export function createWaitlistFieldId(): string {
  return `field_${Math.random().toString(36).slice(2, 9)}`;
}

export function getDefaultWaitlistContent(productName?: string): WaitlistContent {
  const name = sanitizeText(productName, 'Your Product');

  return {
    templateId: 'saas',
    sectionOrder: WAITLIST_SECTION_ORDER,
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
    textAlign: 'center',
    logoUrl: '',
    imageUrl: '',
    socialLinks: {},
    launchDate: null,
    typography: {
      headingFamily: WAITLIST_FONT_PRESETS[0].value,
      bodyFamily: WAITLIST_FONT_PRESETS[3].value,
      headingWeight: 800,
      bodyWeight: 500,
      headingSize: 52,
      subheadingSize: 22,
      bodySize: 16,
      letterSpacing: 0,
    },
    colors: WAITLIST_THEME_PRESETS.dark,
    spacing: {
      sectionPaddingY: 72,
      contentMaxWidth: 1120,
      cardRadius: 16,
    },
    sectionVisibility: {
      problemSolution: true,
      benefits: true,
      howItWorks: true,
      testimonials: true,
      faq: true,
    },
    customFields: [],
    successTitle: 'You are on the list.',
    successMessage: 'Thanks for joining. We will keep you updated.',
    successShareLabel: 'Copy share link',
    domainSetup: {
      domain: '',
      verificationToken: Math.random().toString(36).slice(2, 10),
      status: 'unconfigured',
      lastCheckedAt: null,
      spfValid: false,
      dkimValid: false,
      verificationValid: false,
    },
    emailSetup: {
      senderName: 'Creatives Takeover',
      senderEmail: '',
      replyToEmail: '',
    },
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

  const typographyRaw = (input.typography as Record<string, unknown> | undefined) ?? {};
  const colorsRaw = (input.colors as Record<string, unknown> | undefined) ?? {};
  const spacingRaw = (input.spacing as Record<string, unknown> | undefined) ?? {};
  const sectionRaw = (input.sectionVisibility as Record<string, unknown> | undefined) ?? {};
  const domainRaw = (input.domainSetup as Record<string, unknown> | undefined) ?? {};
  const emailRaw = (input.emailSetup as Record<string, unknown> | undefined) ?? {};

  const headingFamily = sanitizeText(typographyRaw.headingFamily, fallback.typography?.headingFamily);
  const bodyFamily = sanitizeText(typographyRaw.bodyFamily, fallback.typography?.bodyFamily);

  return {
    templateId: normalizeTemplateId(input.templateId),
    sectionOrder: normalizeSectionOrder(input.sectionOrder),
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
    textAlign: normalizeTextAlign(input.textAlign),
    logoUrl: sanitizeText(input.logoUrl, ''),
    imageUrl: sanitizeText(input.imageUrl, ''),
    socialLinks: {
      website: sanitizeText((input.socialLinks as Record<string, unknown> | undefined)?.website, ''),
      x: sanitizeText((input.socialLinks as Record<string, unknown> | undefined)?.x, ''),
      linkedin: sanitizeText((input.socialLinks as Record<string, unknown> | undefined)?.linkedin, ''),
    },
    launchDate: sanitizeText(input.launchDate, '') || null,
    typography: {
      headingFamily,
      bodyFamily,
      headingWeight: clampNumber(typographyRaw.headingWeight, fallback.typography?.headingWeight ?? 800, 500, 900),
      bodyWeight: clampNumber(typographyRaw.bodyWeight, fallback.typography?.bodyWeight ?? 500, 300, 700),
      headingSize: clampNumber(typographyRaw.headingSize, fallback.typography?.headingSize ?? 52, 28, 74),
      subheadingSize: clampNumber(typographyRaw.subheadingSize, fallback.typography?.subheadingSize ?? 22, 16, 36),
      bodySize: clampNumber(typographyRaw.bodySize, fallback.typography?.bodySize ?? 16, 13, 22),
      letterSpacing: clampNumber(typographyRaw.letterSpacing, fallback.typography?.letterSpacing ?? 0, -1, 4),
    },
    colors: {
      pageBackground: sanitizeText(colorsRaw.pageBackground, fallback.colors?.pageBackground),
      sectionBackground: sanitizeText(colorsRaw.sectionBackground, fallback.colors?.sectionBackground),
      textPrimary: sanitizeText(colorsRaw.textPrimary, fallback.colors?.textPrimary),
      textSecondary: sanitizeText(colorsRaw.textSecondary, fallback.colors?.textSecondary),
      buttonBackground: sanitizeText(colorsRaw.buttonBackground, fallback.colors?.buttonBackground),
      buttonText: sanitizeText(colorsRaw.buttonText, fallback.colors?.buttonText),
      borderColor: sanitizeText(colorsRaw.borderColor, fallback.colors?.borderColor),
      inputBackground: sanitizeText(colorsRaw.inputBackground, fallback.colors?.inputBackground),
      inputText: sanitizeText(colorsRaw.inputText, fallback.colors?.inputText),
    },
    spacing: {
      sectionPaddingY: clampNumber(spacingRaw.sectionPaddingY, fallback.spacing?.sectionPaddingY ?? 72, 36, 120),
      contentMaxWidth: clampNumber(spacingRaw.contentMaxWidth, fallback.spacing?.contentMaxWidth ?? 1120, 760, 1280),
      cardRadius: clampNumber(spacingRaw.cardRadius, fallback.spacing?.cardRadius ?? 16, 0, 32),
    },
    sectionVisibility: {
      problemSolution: sectionRaw.problemSolution !== false,
      benefits: sectionRaw.benefits !== false,
      howItWorks: sectionRaw.howItWorks !== false,
      testimonials: sectionRaw.testimonials !== false,
      faq: sectionRaw.faq !== false,
    },
    customFields: sanitizeCustomFields(input.customFields),
    successTitle: sanitizeText(input.successTitle, fallback.successTitle),
    successMessage: sanitizeText(input.successMessage, fallback.successMessage),
    successShareLabel: sanitizeText(input.successShareLabel, fallback.successShareLabel),
    domainSetup: {
      domain: sanitizeText(domainRaw.domain, ''),
      verificationToken: sanitizeText(domainRaw.verificationToken, fallback.domainSetup?.verificationToken),
      status: normalizeDomainStatus(domainRaw.status),
      lastCheckedAt: sanitizeText(domainRaw.lastCheckedAt, '') || null,
      spfValid: Boolean(domainRaw.spfValid),
      dkimValid: Boolean(domainRaw.dkimValid),
      verificationValid: Boolean(domainRaw.verificationValid),
    },
    emailSetup: {
      senderName: sanitizeText(emailRaw.senderName, fallback.emailSetup?.senderName),
      senderEmail: sanitizeText(emailRaw.senderEmail, ''),
      replyToEmail: sanitizeText(emailRaw.replyToEmail, ''),
    },
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

export function getWaitlistThemePalette(theme: WaitlistTheme): WaitlistColorPalette {
  return WAITLIST_THEME_PRESETS[theme];
}
