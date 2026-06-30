import { getSafeSessionStorage } from '@/lib/safeStorage';

export type AnonymousToolKey = 'pitch_deck_analyzer' | 'tech_stack' | 'insighta_test';

interface StoredAnonymousToolState<T> {
  v: 1;
  tool: AnonymousToolKey;
  savedAt: string;
  payload: T;
}

const STORAGE_PREFIX = 'ct_anonymous_tool_state:';
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

const keyFor = (tool: AnonymousToolKey) => `${STORAGE_PREFIX}${tool}`;

export function saveAnonymousToolState<T>(tool: AnonymousToolKey, payload: T): boolean {
  try {
    getSafeSessionStorage().setItem(
      keyFor(tool),
      JSON.stringify({
        v: 1,
        tool,
        savedAt: new Date().toISOString(),
        payload,
      } satisfies StoredAnonymousToolState<T>),
    );
    return true;
  } catch (error) {
    console.warn('Failed to save anonymous tool state', { tool, error });
    return false;
  }
}

export function readAnonymousToolState<T>(tool: AnonymousToolKey): T | null {
  const storage = getSafeSessionStorage();
  const raw = storage.getItem(keyFor(tool));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAnonymousToolState<T>>;
    if (parsed.v !== 1 || parsed.tool !== tool || !parsed.savedAt || typeof parsed !== 'object') {
      storage.removeItem(keyFor(tool));
      return null;
    }

    const savedAt = new Date(parsed.savedAt).getTime();
    if (Number.isNaN(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      storage.removeItem(keyFor(tool));
      return null;
    }

    return parsed.payload ?? null;
  } catch (error) {
    console.warn('Failed to read anonymous tool state', { tool, error });
    storage.removeItem(keyFor(tool));
    return null;
  }
}

export function clearAnonymousToolState(tool: AnonymousToolKey): void {
  getSafeSessionStorage().removeItem(keyFor(tool));
}

export function buildAnonymousToolSignupPath(source: string, returnPath: string): string {
  return `/signup?source=${encodeURIComponent(source)}&return=${encodeURIComponent(returnPath)}`;
}
