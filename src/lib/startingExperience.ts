export const STARTING_EXPERIENCE_VERSION = 'two_starts_v1';
export const STARTING_SECTION_PATH = '/#get-started';
export type StartingMode = 'idea' | 'product';
export const STARTING_CARDS = {
  idea: { title: 'I have an idea', challenge: 'Who would need this, and what should I test?', label: 'Describe your idea',
    example: 'An app that helps barbers reduce no-shows', cta: 'Find my first test', output: 'A likely customer, their problem, and a first validation test.' },
  product: { title: 'I have a product', challenge: 'How do I explain its value to potential customers?', label: 'Describe your product',
    example: 'A scheduling tool for independent hairdressers', cta: 'Draft my demo story', output: 'A customer-facing pitch and a three-step demo script.' },
} as const;
export interface StartingExperience {
  mode: StartingMode;
  description: string;
  runId: number;
  resumeToken?: string;
  savedAt: number;
}
const KEY = 'ct_starting_experience_v1';
const WEEK = 7 * 86400000;

export function readStartingExperience(): StartingExperience | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null') as StartingExperience;
    if (!value || !['idea', 'product'].includes(value.mode)
      || typeof value.description !== 'string' || !value.description.trim()
      || value.description.length > 5000 || !Number.isFinite(value.runId)
      || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > WEEK
      || (value.resumeToken !== undefined && typeof value.resumeToken !== 'string')) return null;
    return value;
  } catch { return null; }
}

export function saveStartingExperience(value: StartingExperience): void {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* Result still lives in memory. */ }
}
