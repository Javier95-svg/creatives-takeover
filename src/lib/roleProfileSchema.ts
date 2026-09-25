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

export type RoleFieldType = 'text' | 'number' | 'tags' | 'select' | 'multi';

export interface RoleField {
  key: string;
  label: string;
  type: RoleFieldType;
  required?: boolean;
  placeholder?: string;
  /** For select and multi. */
  options?: readonly string[];
  maxLength?: number;
}

/** Mirrors services.category, so a provider's answer matches the listing taxonomy. */
export const SERVICE_CATEGORIES = ['sales', 'marketing', 'ops', 'tech_support'] as const;

/** Mirrors angel_investors.investment_stages. */
export const INVESTMENT_STAGES = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+'] as const;

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
  mentor: [
    { key: 'expertise', label: 'Areas of expertise', type: 'tags', required: true, placeholder: 'Go to market, pricing, hiring' },
    { key: 'stages', label: 'Stages you help with', type: 'multi', required: true, options: ['Exploring','Validation','Building','Launch','Growth'] },
    { key: 'experience', label: 'Relevant experience or proof', type: 'text', required: true, maxLength: 500, placeholder: 'A result, previous role, or relevant portfolio link' },
    { key: 'engagement', label: 'Preferred engagement', type: 'select', required: true, options: ['one_off','ongoing','both'] },
    { key: 'yearsActive', label: 'Years operating', type: 'number' },
  ],
  marketplace: [
    { key: 'services', label: 'Services you offer', type: 'tags', required: true, placeholder: 'Landing pages, paid ads, bookkeeping' },
    { key: 'idealCustomer', label: 'Who do you help?', type: 'text', required: true, maxLength: 500 },
    { key: 'portfolio', label: 'Portfolio or relevant example', type: 'text', required: true, maxLength: 500 },
    { key: 'capacity', label: 'Current capacity', type: 'select', required: true, options: ['available','limited','waitlist'] },
    { key: 'category', label: 'Category', type: 'select', required: true, options: SERVICE_CATEGORIES },
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
      display: Array.isArray(value) ? value.join(', ') : String(value),
    }));
}

/** True when this type is asked for a project rather than role fields. */
export function usesProjectName(userType: UserType): boolean {
  return ROLE_PROFILE_SCHEMA[userType].some((field) => field.key === PROJECT_NAME_FIELD);
}

/** Every type that must be asked for role fields after choosing its category. */
export const ROLE_FIELD_TYPES = REVIEWED_USER_TYPES;
