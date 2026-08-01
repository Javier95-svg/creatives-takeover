// Public behavior is accepted only by the validating, rate-limited edge endpoint.
// Browser de-dupe improves UX; database de-dupe remains authoritative.
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import type { DemoEventType } from './types';

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
    await supabase.functions.invoke('demo-studio-event', { body: {
      type,
      projectId: args.projectId ?? null,
      demoId: args.demoId ?? null,
      vslId: args.vslId ?? null,
      meta: { ...(args.meta ?? {}), sessionId: getSessionId() },
    }});
  } catch {
    /* analytics must never throw */
  }
}

export async function submitDemoResponse(input: {
  demoId: string;
  response: 'interested' | 'not_for_me' | 'book_call' | 'commitment';
  objection?: string;
}) {
  const { data, error } = await supabase.functions.invoke('demo-studio-event', { body: input });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Could not save your response.');
}
