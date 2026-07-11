// Lightweight, fire-and-forget analytics for Demo Studio. Inserts into
// demo_studio_events (public insert per RLS). Failures are swallowed so tracking
// never breaks the viewing experience. Events are de-duped per browser session.
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import type { DemoEventType } from './types';

const EVENTS = 'demo_studio_events' as any;
const SESSION_KEY = 'demo_studio_session_id';

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = window.sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

interface TrackArgs {
  projectId?: string | null;
  demoId?: string | null;
  vslId?: string | null;
  meta?: Record<string, unknown>;
  /** When set, the event fires at most once per browser session for this key. */
  dedupeKey?: string;
}

export async function trackDemoEvent(type: DemoEventType, args: TrackArgs = {}): Promise<void> {
  try {
    if (args.dedupeKey && typeof window !== 'undefined') {
      const key = `demo_studio_evt_${args.dedupeKey}`;
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    }
    // Dual-write to PostHog so demo viewer behavior shows up in funnels,
    // not just in the Supabase demo_studio_events table.
    captureEvent(type, {
      project_id: args.projectId ?? undefined,
      demo_id: args.demoId ?? undefined,
      vsl_id: args.vslId ?? undefined,
      ...(args.meta ?? {}),
    });
    await supabase.from(EVENTS).insert({
      type,
      project_id: args.projectId ?? null,
      demo_id: args.demoId ?? null,
      vsl_id: args.vslId ?? null,
      meta: { ...(args.meta ?? {}), session_id: getSessionId() },
    } as any);
  } catch {
    /* analytics must never throw */
  }
}
