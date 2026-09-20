import { useEffect, useRef } from 'react';
import { recordEntityView } from '@/services/accountFeatures';

const VIEWER_KEY = 'ct-viewer-key';

/**
 * A stable-ish key for a signed out viewer.
 *
 * Never an IP address and never anything that identifies a person: a random
 * value in this browser's storage, used only so one anonymous visitor is not
 * counted as five when they refresh. A signed in viewer is keyed server side by
 * their user id instead, so clearing this changes nothing for them.
 */
function viewerKey() {
  try {
    const existing = localStorage.getItem(VIEWER_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(VIEWER_KEY, next);
    return next;
  } catch {
    // Private windows and blocked storage still get counted, just not deduped
    // across reloads, which the daily unique index then handles server side.
    return 'anonymous';
  }
}

/**
 * Records one view when a profile or listing opens.
 *
 * Fires once per mounted entity. The RPC drops the owner's own views and
 * deduplicates one viewer per entity per day, so a refresh cannot inflate a
 * mentor's number.
 */
export function useEntityViewTracking(entityType: 'mentor' | 'service' | 'investor', entityId: string | null | undefined) {
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (!entityId || recorded.current === entityId) return;
    recorded.current = entityId;
    void recordEntityView(entityType, entityId, viewerKey());
  }, [entityType, entityId]);
}
