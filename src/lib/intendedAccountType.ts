import { isUserType, type UserType } from './accountTypes.ts';

/**
 * The account type someone picked before signing up, for example in the
 * "Who is Creatives Takeover for?" dialog.
 *
 * Signup can leave the page (email confirmation, OAuth), so the choice is kept
 * in localStorage rather than in the URL. The onboarding quiz only uses it to
 * pre-select the first answer; the person still confirms it.
 */

const STORAGE_KEY = 'ct_intended_account_type';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function rememberIntendedAccountType(type: UserType) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ type, savedAt: Date.now() }));
  } catch {
    // Storage unavailable: the quiz simply starts with nothing selected.
  }
}

export function readIntendedAccountType(): UserType | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { type?: unknown; savedAt?: unknown };
    if (!isUserType(parsed.type)) return null;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed.type;
  } catch {
    return null;
  }
}

export function clearIntendedAccountType() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
