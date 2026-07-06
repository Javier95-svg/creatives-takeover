import { supabase } from './client';
import { logWarn } from '@/lib/logger';
import { clearSupabaseAuthStorage } from '@/integrations/supabase/sessionStorage';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '') as string;
const INVALID_REFRESH_TOKEN_PATTERNS = [
  /invalid refresh token/i,
  /refresh token not found/i,
];

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message ?? '');
  }

  return '';
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return INVALID_REFRESH_TOKEN_PATTERNS.some((pattern) => pattern.test(message));
}

async function clearStaleSession(): Promise<void> {
  clearSupabaseAuthStorage(SUPABASE_URL);

  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (error) {
    logWarn('Failed to clear stale Supabase session locally', {
      error: getErrorMessage(error),
    });
  }
}

export async function getSessionSafely() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    return data.session;
  } catch (error) {
    if (!isInvalidRefreshTokenError(error)) {
      throw error;
    }

    await clearStaleSession();
    logWarn('Cleared stale Supabase auth session after refresh token failure', {
      error: getErrorMessage(error),
    });
    return null;
  }
}

export async function getAccessTokenSafely(): Promise<string | null> {
  const session = await getSessionSafely();
  return session?.access_token ?? null;
}
