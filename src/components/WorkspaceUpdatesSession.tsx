import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Store only the session identifier, never the access token. Token refreshes
// retain session_id, while a new sign-in gets a new one.
function sessionIdentity(token: string, fallback?: string) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const id: unknown = JSON.parse(atob(payload)).session_id;
    if (typeof id === 'string' && id) return id;
  } catch { /* Older sessions can use their last sign-in timestamp. */ }
  return fallback;
}

const memoryDismissals = new Map<string, string>();

function SessionCard({ userId, sessionId, latestId, children }: {
  userId: string; sessionId: string; latestId: string; children: (dismiss: () => void) => ReactNode;
}) {
  const storageKey = `ct-sidebar-updates-dismissed:${userId}`;
  // A dismissal covers the updates seen so far in this session. A newer update
  // (e.g. the Startup Pedia launch) changes latestId and brings the card back;
  // keyed on the session alone, it stayed hidden until the next sign-in.
  const dismissalKey = `${sessionId}:${latestId}`;
  const readDismissed = useCallback(() => {
    try { return localStorage.getItem(storageKey) === dismissalKey || memoryDismissals.get(userId) === dismissalKey; }
    catch { return memoryDismissals.get(userId) === dismissalKey; }
  }, [storageKey, dismissalKey, userId]);
  const [dismissed, setDismissed] = useState(readDismissed);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey) setDismissed(readDismissed());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey, readDismissed]);
  if (dismissed) return null;
  return children(() => {
    memoryDismissals.set(userId, dismissalKey);
    try { localStorage.setItem(storageKey, dismissalKey); } catch { /* Keep dismissed in memory if storage is unavailable. */ }
    setDismissed(true);
  });
}

export default function WorkspaceUpdatesSession({ latestId, children }: { latestId: string; children: (dismiss: () => void) => ReactNode }) {
  const { user, session, loading } = useAuth();
  if (loading || !user || !session) return null;
  const id = sessionIdentity(session.access_token, user.last_sign_in_at);
  if (!id) return null;
  return <SessionCard key={`${user.id}:${id}:${latestId}`} userId={user.id} sessionId={id} latestId={latestId}>{children}</SessionCard>;
}
