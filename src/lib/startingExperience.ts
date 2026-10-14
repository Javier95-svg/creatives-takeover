export const STARTING_EXPERIENCE_VERSION = 'two_starts_v1';
export const STARTING_SECTION_PATH = '/#get-started';
export type StartingMode = 'idea' | 'product';
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
