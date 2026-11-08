import { ANGEL_SECTOR_OPTIONS } from '../data/angelSectors.ts';
import { REVIEWED_USER_TYPES, type UserType } from './accountTypes.ts';

/**
 * The profile fields each account type is asked for.
 *
 * One definition drives the onboarding step and the profile editor, so the two
 * cannot drift apart. Stored in profiles.role_profile as jsonb rather than a
 * column per field, which means a sixth account type is an entry here and no
 * migration for storage. The server validates submissions and profile writes
 * against the same fields; adding a role also requires server validation.
 */

export type RoleFieldType = 'text' | 'textarea' | 'url' | 'number' | 'tags' | 'select' | 'multi';

export interface RoleField {
  key: string;
  label: string;
  type: RoleFieldType;
  required?: boolean;
  placeholder?: string;
  /** For select and multi. */
  options?: readonly string[];
  /** How an option reads on screen, where the stored value is not plain English. */
  optionLabels?: Readonly<Record<string, string>>;
  /** One line under the field: what a good answer looks like. */
  hint?: string;
  /** The section the field is shown under; consecutive fields share a heading. */
  group?: string;
  maxLength?: number;
}

/** "one_off" reads as "One off" unless the field gives it a label. */
export function optionLabel(field: RoleField, option: string): string {
  return field.optionLabels?.[option] ?? option.replace(/_/g, ' ').replace(/^./, (character) => character.toUpperCase());
}

/** A link a reviewer can open: http(s), a host with a dot, no spaces. */
const URL_PATTERN = /^https?:\/\/[^\s/.]+\.[^\s]+$/i;

/** Accepts "linkedin.com/in/name" as typed and stores it with https://. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Mirrors services.category, so a provider's answer matches the listing taxonomy. */
export const SERVICE_CATEGORIES = ['sales', 'marketing', 'ops', 'tech_support'] as const;

/** Mirrors angel_investors.investment_stages. */
export const INVESTMENT_STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'] as const;

/** One line per round, for founders who have not raised before and meet these terms here first. */
export const INVESTMENT_STAGE_HINTS: Record<(typeof INVESTMENT_STAGES)[number], string> = {
  'Pre-Seed': 'An idea or early prototype, usually funded by you, friends or angels. Most new founders are here.',
  'Seed': 'First users or revenue. You are raising to prove people want it.',
  'Series A': 'Clear demand and growing revenue. You are raising to scale what already works.',
  'Series B': 'A working business expanding into new markets or a larger team.',
  'Series C+': 'Late stage: large expansion, acquisitions or preparing to go public.',
};

export const ROLE_PROFILE_SCHEMA: Record<UserType, readonly RoleField[]> = {
  // Founders and builders are asked for the project, exactly as before. It is
  // not stored in role_profile; it creates a real project row. Listing it here
  // keeps the five types describable from one place.
  founder: [
    { key: 'projectName', label: 'Project name', type: 'text', required: true, placeholder: 'Throughline', maxLength: 120 },
  ],
  builder: [
    { key: 'projectName', label: 'Working title (optional)', type: 'text', placeholder: 'Throughline', maxLength: 120 },
  ],
  // Mentors and providers apply here; a reviewer decides from these answers,
  // so each one asks for something checkable (a link, a result, a time).
  mentor: [
    { key: 'headline', label: 'Your one-line intro', type: 'text', required: true, maxLength: 120, group: 'About you', placeholder: 'Former head of growth at a B2B SaaS, now advising early-stage teams' },
    { key: 'link', label: 'LinkedIn or website', type: 'url', required: true, maxLength: 300, group: 'About you', placeholder: 'linkedin.com/in/your-name', hint: 'So we can see your background.' },
    { key: 'yearsActive', label: 'Years of experience', type: 'number', group: 'About you' },
    { key: 'expertise', label: 'Areas of expertise', type: 'tags', required: true, group: 'How you help', placeholder: 'Go to market, pricing, hiring', hint: 'Separate with commas.' },
    { key: 'stages', label: 'Stages you help with', type: 'multi', required: true, group: 'How you help', options: ['Exploring','Validation','Building','Launch','Growth'] },
    { key: 'experience', label: 'Relevant experience or proof', type: 'textarea', required: true, maxLength: 500, group: 'How you help', placeholder: 'A result you achieved, a previous role, or companies you have helped.' },
    { key: 'engagement', label: 'How you prefer to help', type: 'select', required: true, group: 'Availability', options: ['one_off','ongoing','both'], optionLabels: { one_off: 'One-off sessions', ongoing: 'Ongoing mentoring', both: 'Both' } },
    { key: 'availability', label: 'Time you can give each month', type: 'select', required: true, group: 'Availability', options: ['1_2_hours','3_5_hours','6_plus_hours'], optionLabels: { '1_2_hours': '1–2 hours', '3_5_hours': '3–5 hours', '6_plus_hours': '6+ hours' } },
  ],
  marketplace: [
    { key: 'businessName', label: 'Business or studio name', type: 'text', required: true, maxLength: 120, group: 'About your business', placeholder: 'Northlight Studio' },
    { key: 'link', label: 'Website or portfolio link', type: 'url', required: true, maxLength: 300, group: 'About your business', placeholder: 'northlight.studio' },
    { key: 'category', label: 'Main category', type: 'select', required: true, group: 'What you offer', options: SERVICE_CATEGORIES, optionLabels: { sales: 'Sales', marketing: 'Marketing', ops: 'Operations', tech_support: 'Tech support' } },
    { key: 'services', label: 'Services you offer', type: 'tags', required: true, group: 'What you offer', placeholder: 'Landing pages, paid ads, bookkeeping', hint: 'Separate with commas.' },
    { key: 'idealCustomer', label: 'Who do you help?', type: 'textarea', required: true, maxLength: 500, group: 'What you offer', placeholder: 'Pre-seed SaaS founders who need their first marketing site.' },
    { key: 'portfolio', label: 'A relevant example of your work', type: 'textarea', required: true, maxLength: 500, group: 'What you offer', placeholder: 'A project you delivered and its result, or a link to a case study.' },
    { key: 'capacity', label: 'Current capacity', type: 'select', required: true, group: 'Availability and pricing', options: ['available','limited','waitlist'], optionLabels: { available: 'Available now', limited: 'Limited', waitlist: 'Waitlist' } },
    { key: 'startingPrice', label: 'Starting price (optional)', type: 'text', maxLength: 120, group: 'Availability and pricing', placeholder: 'From $500 per project' },
  ],
  investor: [
    { key: 'sectors', label: 'Investment focus', type: 'multi', required: true, options: ANGEL_SECTOR_OPTIONS },
    { key: 'geography', label: 'Investment geography', type: 'text', required: true, placeholder: 'Global, or the countries/regions you invest in', maxLength: 200 },
    { key: 'activity', label: 'Investing activity', type: 'select', required: true, options: ['actively_investing','exploring'] },
    { key: 'checkRange', label: 'Typical check range and currency (optional)', type: 'text', maxLength: 200 },
    { key: 'stages', label: 'Stages you back', type: 'multi', required: true, options: INVESTMENT_STAGES },
  ],
};

/** The project name is a real project, not a role_profile key. */
export const PROJECT_NAME_FIELD = 'projectName';

/** The fields actually stored in role_profile for a type. */
export function storedRoleFields(userType: UserType): readonly RoleField[] {
  return ROLE_PROFILE_SCHEMA[userType].filter((field) => field.key !== PROJECT_NAME_FIELD);
}

export type RoleProfile = Record<string, unknown>;

function isFilled(field: RoleField, value: unknown): boolean {
  if (value == null) return false;
  if (field.type === 'tags' || field.type === 'multi') return Array.isArray(value) && value.length > 0;
  if (field.type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (field.type === 'url') return typeof value === 'string' && URL_PATTERN.test(value);
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Which required fields are still missing. Empty means the profile is complete
 * for that type, which is what the prompt and the editor both key off.
 */
export function missingRoleFields(userType: UserType, profile: RoleProfile | null | undefined): RoleField[] {
  const values = sanitizeRoleProfile(userType, profile);
  return storedRoleFields(userType).filter((field) => field.required && !isFilled(field, values[field.key]));
}

/**
 * Keeps only the keys this type is asked for, and drops anything malformed.
 *
 * jsonb accepts whatever is sent, so this is the boundary that stops one type's
 * answers ending up on another, and stops an oversized or wrong-shaped value
 * being stored at all.
 */
export function sanitizeRoleProfile(userType: UserType, input: RoleProfile | null | undefined): RoleProfile {
  const values = input ?? {};
  const clean: RoleProfile = {};

  for (const field of storedRoleFields(userType)) {
    const value = values[field.key];
    if (value == null) continue;

    if (field.type === 'tags') {
      const tags = Array.isArray(value)
        ? value.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
            .map((tag) => tag.trim().slice(0, 60))
        : [];
      // 20 is generous for a real answer and small enough that nobody can use
      // the column as storage.
      if (tags.length) clean[field.key] = tags.slice(0, 20);
      continue;
    }

    if (field.type === 'multi') {
      const allowed = new Set(field.options ?? []);
      const picked = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && allowed.has(item)) : [];
      if (picked.length) clean[field.key] = picked;
      continue;
    }

    if (field.type === 'select') {
      if (typeof value === 'string' && (field.options ?? []).includes(value)) clean[field.key] = value;
      continue;
    }

    if (field.type === 'number') {
      const parsed = typeof value === 'number' ? value : Number(value);
      if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) clean[field.key] = Math.round(parsed);
      continue;
    }

    if (field.type === 'url') {
      const url = typeof value === 'string' ? normalizeUrl(value).slice(0, field.maxLength ?? 300) : '';
      if (URL_PATTERN.test(url)) clean[field.key] = url;
      continue;
    }

    if (typeof value === 'string' && value.trim()) {
      clean[field.key] = value.trim().slice(0, field.maxLength ?? 200);
    }
  }

  return clean;
}

/** Label and value pairs for rendering somebody's role profile on their page. */
export function describeRoleProfile(userType: UserType, profile: RoleProfile | null | undefined) {
  const values = profile ?? {};
  return storedRoleFields(userType)
    .map((field) => ({ field, value: values[field.key] }))
    .filter(({ field, value }) => isFilled(field, value))
    .map(({ field, value }) => ({
      key: field.key,
      label: field.label,
      display: Array.isArray(value)
        ? value.map((item) => (field.type === 'multi' ? optionLabel(field, String(item)) : String(item))).join(', ')
        : field.type === 'select' ? optionLabel(field, String(value)) : String(value),
    }));
}

/** True when this type is asked for a project rather than role fields. */
export function usesProjectName(userType: UserType): boolean {
  return ROLE_PROFILE_SCHEMA[userType].some((field) => field.key === PROJECT_NAME_FIELD);
}

/** Every type that must be asked for role fields after choosing its category. */
export const ROLE_FIELD_TYPES = REVIEWED_USER_TYPES;
