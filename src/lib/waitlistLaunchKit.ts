export const WAITLIST_LAUNCH_KIT_CATEGORIES = [
  'B2B SaaS',
  'Consumer App',
  'Marketplace',
  'Community',
  'Developer Tool',
  'Physical Product',
  'Other',
] as const;

export const WAITLIST_LAUNCH_KIT_TONES = [
  'professional',
  'friendly',
  'bold',
  'conversational',
  'inspirational',
] as const;

export type WaitlistLaunchKitCategory = (typeof WAITLIST_LAUNCH_KIT_CATEGORIES)[number];
export type WaitlistLaunchKitTone = (typeof WAITLIST_LAUNCH_KIT_TONES)[number];

export interface WaitlistLaunchKitInputs {
  product_name: string;
  one_line_description: string;
  target_audience: string;
  primary_benefit: string;
  secondary_benefits?: string[];
  product_category: WaitlistLaunchKitCategory;
  tone_preference: WaitlistLaunchKitTone;
  launch_date?: string;
  referral_incentive?: string;
  existing_tagline?: string;
}

export interface WaitlistLaunchKitHeadline {
  variant: 'A' | 'B' | 'C';
  headline: string;
  subheadline: string;
  rationale: string;
}

export interface WaitlistLaunchKitEmail {
  email_number: 1 | 2 | 3;
  trigger: string;
  subject_line: string;
  preview_text: string;
  body: string;
  in_email_cta: string;
}

export interface WaitlistLaunchKitOutput {
  headlines: WaitlistLaunchKitHeadline[];
  value_props: Array<{ bullet: string }>;
  cta: {
    primary: string;
    alternative_soft: string;
    alternative_urgency: string;
  };
  email_sequence: WaitlistLaunchKitEmail[];
  referral_hook: {
    headline: string;
    copy: string;
    cta: string;
  };
  positioning_statement: string;
}

export interface StoredWaitlistLaunchKit {
  inputs: WaitlistLaunchKitInputs;
  inputHash: string;
  output: WaitlistLaunchKitOutput;
  generatedAt: string;
}

export interface WaitlistLaunchKitValidationResult<T> {
  ok: boolean;
  value?: T;
  errors: string[];
}

const FORBIDDEN_COPY_TERMS = [
  'revolutionary',
  'game-changing',
  'innovative',
  'powerful',
  'seamless',
  'effortless',
  'cutting-edge',
  'next-level',
  'disruptive',
  'world-class',
  'best-in-class',
  'journey',
  'ecosystem',
  'holistic',
  'empower',
  'synergy',
];

const PLACEHOLDER_PATTERNS = [/\{\{/u, /\[YOUR/iu, /\[INSERT/iu, /\[.*?\]/u];

function trimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function hasForbiddenTerm(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_COPY_TERMS.some((term) => lower.includes(term));
}

function hasPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function walkStrings(value: unknown, visit: (text: string, path: string) => void, path = 'kit') {
  if (typeof value === 'string') {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, visit, `${path}.${index}`));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => walkStrings(item, visit, `${path}.${key}`));
  }
}

export function validateWaitlistLaunchKitInputs(raw: unknown): WaitlistLaunchKitValidationResult<WaitlistLaunchKitInputs> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const secondaryBenefits = Array.isArray(input.secondary_benefits)
    ? input.secondary_benefits.map(trimmedString).filter(Boolean).slice(0, 2)
    : [];

  const value: WaitlistLaunchKitInputs = {
    product_name: trimmedString(input.product_name).slice(0, 60),
    one_line_description: trimmedString(input.one_line_description).slice(0, 200),
    target_audience: trimmedString(input.target_audience).slice(0, 150),
    primary_benefit: trimmedString(input.primary_benefit).slice(0, 150),
    secondary_benefits: secondaryBenefits,
    product_category: input.product_category as WaitlistLaunchKitCategory,
    tone_preference: input.tone_preference as WaitlistLaunchKitTone,
    launch_date: trimmedString(input.launch_date),
    referral_incentive: trimmedString(input.referral_incentive).slice(0, 150),
    existing_tagline: trimmedString(input.existing_tagline).slice(0, 100),
  };

  const errors: string[] = [];
  if (!value.product_name) errors.push('product_name is required');
  if (!value.one_line_description) errors.push('one_line_description is required');
  if (!value.target_audience) errors.push('target_audience is required');
  if (!value.primary_benefit) errors.push('primary_benefit is required');
  if (!WAITLIST_LAUNCH_KIT_CATEGORIES.includes(value.product_category)) errors.push('product_category is invalid');
  if (!WAITLIST_LAUNCH_KIT_TONES.includes(value.tone_preference)) errors.push('tone_preference is invalid');
  if (
    value.one_line_description &&
    value.one_line_description.length <= 20 &&
    !/[.!?]$/u.test(value.one_line_description)
  ) {
    errors.push('one_line_description must be a complete sentence');
  }

  Object.keys(value).forEach((key) => {
    if (value[key as keyof WaitlistLaunchKitInputs] === '') {
      delete value[key as keyof WaitlistLaunchKitInputs];
    }
  });
  if (secondaryBenefits.length === 0) delete value.secondary_benefits;

  return { ok: errors.length === 0, value, errors };
}

export function validateWaitlistLaunchKitOutput(raw: unknown): WaitlistLaunchKitValidationResult<WaitlistLaunchKitOutput> {
  const kit = raw as WaitlistLaunchKitOutput;
  const errors: string[] = [];

  if (!kit || typeof kit !== 'object') {
    return { ok: false, errors: ['output must be an object'] };
  }

  if (!Array.isArray(kit.headlines) || kit.headlines.length !== 3) errors.push('headlines must have exactly 3 items');
  if (!Array.isArray(kit.value_props) || kit.value_props.length !== 3) errors.push('value_props must have exactly 3 items');
  if (!kit.cta || typeof kit.cta !== 'object') errors.push('cta is required');
  if (!Array.isArray(kit.email_sequence) || kit.email_sequence.length !== 3) errors.push('email_sequence must have exactly 3 items');
  if (!kit.referral_hook || typeof kit.referral_hook !== 'object') errors.push('referral_hook is required');
  if (!trimmedString(kit.positioning_statement)) errors.push('positioning_statement is required');

  kit.headlines?.forEach((item, index) => {
    if (!(['A', 'B', 'C'] as const).includes(item?.variant)) errors.push(`headlines.${index}.variant is invalid`);
    if (!trimmedString(item?.headline)) errors.push(`headlines.${index}.headline is required`);
    if (wordCount(item?.headline ?? '') > 10) errors.push(`headlines.${index}.headline exceeds 10 words`);
    if (!trimmedString(item?.subheadline)) errors.push(`headlines.${index}.subheadline is required`);
    if (!trimmedString(item?.rationale)) errors.push(`headlines.${index}.rationale is required`);
  });

  kit.value_props?.forEach((item, index) => {
    if (!trimmedString(item?.bullet)) errors.push(`value_props.${index}.bullet is required`);
    if (wordCount(item?.bullet ?? '') > 20) errors.push(`value_props.${index}.bullet exceeds 20 words`);
  });

  if (kit.cta) {
    (['primary', 'alternative_soft', 'alternative_urgency'] as const).forEach((key) => {
      if (!trimmedString(kit.cta[key])) errors.push(`cta.${key} is required`);
      if (wordCount(kit.cta[key] ?? '') > 5) errors.push(`cta.${key} exceeds 5 words`);
    });
  }

  kit.email_sequence?.forEach((item, index) => {
    if (item?.email_number !== index + 1) errors.push(`email_sequence.${index}.email_number is invalid`);
    if (!trimmedString(item?.trigger)) errors.push(`email_sequence.${index}.trigger is required`);
    if (!trimmedString(item?.subject_line)) errors.push(`email_sequence.${index}.subject_line is required`);
    if ((item?.subject_line ?? '').length > 50) errors.push(`email_sequence.${index}.subject_line exceeds 50 characters`);
    if (!trimmedString(item?.preview_text)) errors.push(`email_sequence.${index}.preview_text is required`);
    if ((item?.preview_text ?? '').length > 90) errors.push(`email_sequence.${index}.preview_text exceeds 90 characters`);
    if (!trimmedString(item?.body)) errors.push(`email_sequence.${index}.body is required`);
    if (!trimmedString(item?.in_email_cta)) errors.push(`email_sequence.${index}.in_email_cta is required`);
    if (wordCount(item?.in_email_cta ?? '') > 5) errors.push(`email_sequence.${index}.in_email_cta exceeds 5 words`);
  });

  if (kit.referral_hook) {
    if (!trimmedString(kit.referral_hook.headline)) errors.push('referral_hook.headline is required');
    if (wordCount(kit.referral_hook.headline ?? '') > 10) errors.push('referral_hook.headline exceeds 10 words');
    if (!trimmedString(kit.referral_hook.copy)) errors.push('referral_hook.copy is required');
    if (!trimmedString(kit.referral_hook.cta)) errors.push('referral_hook.cta is required');
    if (wordCount(kit.referral_hook.cta ?? '') > 5) errors.push('referral_hook.cta exceeds 5 words');
  }

  walkStrings(kit, (text, path) => {
    if (hasPlaceholder(text)) errors.push(`${path} contains a placeholder`);
    if (hasForbiddenTerm(text)) errors.push(`${path} contains a forbidden term`);
  });

  return { ok: errors.length === 0, value: kit, errors };
}

export function buildWaitlistLaunchKitInputHash(inputs: WaitlistLaunchKitInputs): string {
  const stable = JSON.stringify(inputs, Object.keys(inputs).sort());
  let hash = 0;
  for (let index = 0; index < stable.length; index += 1) {
    hash = (hash << 5) - hash + stable.charCodeAt(index);
    hash |= 0;
  }
  return `wlk_${Math.abs(hash).toString(36)}`;
}

export function formatWaitlistLaunchKitPlainText(kit: WaitlistLaunchKitOutput): string {
  const lines = [
    'WAITLIST LAUNCH KIT',
    '',
    'HEADLINES',
    ...kit.headlines.flatMap((item) => [
      `Variant ${item.variant}: ${item.headline}`,
      item.subheadline,
      '',
    ]),
    'VALUE PROPOSITIONS',
    ...kit.value_props.map((item) => `✓ ${item.bullet}`),
    '',
    'CTA BUTTON COPY',
    `Primary: ${kit.cta.primary}`,
    `Soft: ${kit.cta.alternative_soft}`,
    `Urgency: ${kit.cta.alternative_urgency}`,
    '',
    'EMAIL SEQUENCE',
    ...kit.email_sequence.flatMap((email) => [
      `Email ${email.email_number}: ${email.trigger}`,
      `Subject: ${email.subject_line}`,
      `Preview: ${email.preview_text}`,
      email.body,
      `CTA: ${email.in_email_cta}`,
      '',
    ]),
    'REFERRAL HOOK',
    kit.referral_hook.headline,
    kit.referral_hook.copy,
    `CTA: ${kit.referral_hook.cta}`,
  ];
  return lines.join('\n').trim();
}

export function formatWaitlistEmailPlainText(email: WaitlistLaunchKitEmail): string {
  return [
    `Subject: ${email.subject_line}`,
    `Preview: ${email.preview_text}`,
    '',
    email.body,
    '',
    `CTA: ${email.in_email_cta}`,
  ].join('\n');
}
