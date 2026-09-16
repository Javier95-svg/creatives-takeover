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

function SessionCard({ userId, sessionId, children }: {
  userId: string; sessionId: string; children: (dismiss: () => void) => ReactNode;
}) {
  const storageKey = `ct-sidebar-updates-dismissed:${userId}`;
  const readDismissed = useCallback(() => {
    try { return localStorage.getItem(storageKey) === sessionId || memoryDismissals.get(userId) === sessionId; }
    catch { return memoryDismissals.get(userId) === sessionId; }
  }, [storageKey, sessionId, userId]);
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
    memoryDismissals.set(userId, sessionId);
    try { localStorage.setItem(storageKey, sessionId); } catch { /* Keep dismissed in memory if storage is unavailable. */ }
    setDismissed(true);
  });
}

export default function WorkspaceUpdatesSession({ children }: { children: (dismiss: () => void) => ReactNode }) {
  const { user, session, loading } = useAuth();
  if (loading || !user || !session) return null;
  const id = sessionIdentity(session.access_token, user.last_sign_in_at);
  if (!id) return null;
  return <SessionCard key={`${user.id}:${id}`} userId={user.id} sessionId={id}>{children}</SessionCard>;
}
