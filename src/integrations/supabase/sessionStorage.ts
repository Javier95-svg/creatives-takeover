import type { StateStorage } from 'zustand/middleware';
import { getSafeLocalStorage } from '../../lib/safeStorage.ts';

export function getSupabaseAuthStorageKey(supabaseUrl: string): string | null {
  if (!supabaseUrl) return null;

  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

function readStoredSession(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const currentSession = parsed.currentSession;
    const session = parsed.session;

    if (currentSession && typeof currentSession === 'object') {
      return currentSession as Record<string, unknown>;
    }

    if (session && typeof session === 'object') {
      return session as Record<string, unknown>;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function shouldDropStoredSupabaseAuthSession(raw: string | null): boolean {
  if (!raw) return false;

  const session = readStoredSession(raw);
  if (!session) return true;

  const accessToken = typeof session.access_token === 'string' ? session.access_token.trim() : '';
  const refreshToken = typeof session.refresh_token === 'string' ? session.refresh_token.trim() : '';

  // Supabase cannot recover a persisted browser session without a refresh token.
  if (!accessToken || !refreshToken) return true;

  const expiresAt = Number(session.expires_at ?? 0);
  if (Number.isFinite(expiresAt) && expiresAt > 0) {
    const ninetyDaysAgoSeconds = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
    if (expiresAt < ninetyDaysAgoSeconds) return true;
  }

  return false;
}

export function clearSupabaseAuthStorage(supabaseUrl: string): void {
  const storageKey = getSupabaseAuthStorageKey(supabaseUrl);
  if (!storageKey || typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Best effort only. Auth recovery will continue with Supabase's defaults.
  }
}

export function createSupabaseAuthStorage(supabaseUrl: string): StateStorage {
  const storage = getSafeLocalStorage();
  const authStorageKey = getSupabaseAuthStorageKey(supabaseUrl);

  return {
    getItem: (key) => {
      const value = storage.getItem(key);
      if (authStorageKey && key === authStorageKey && shouldDropStoredSupabaseAuthSession(value)) {
        storage.removeItem(key);
        return null;
      }
      return value;
    },
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
  };
}
