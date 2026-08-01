import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves the founder's prototype-stage artifact from **either** builder.
 *
 * Demo Studio replaced the Waitlist Maker, but the stage-gating surfaces kept reading
 * `waitlist_pages` only. A founder who used the current tool therefore read as "hasn't
 * built a prototype" across the dashboard, the journey progress bar, and the activation
 * journey. `src/lib/founderSignals.ts` was the one place that already checked both;
 * this centralizes that so the rest of the app stops disagreeing with it.
 */

export interface PrototypeStageArtifact {
  /** Most recent meaningful timestamp across both builders, ISO string. */
  completedAt: string | null;
  /** Whether a *published* prototype exists, not merely a draft. */
  published: boolean;
  source: 'demo_studio' | 'waitlist' | null;
}

const newer = (a: string | null, b: string | null) => {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
};

/**
 * @param publishedOnly restrict to published/exported artifacts, matching the stricter
 * gating used by progress calculations.
 */
export async function loadPrototypeStageArtifact(
  userId: string,
  options: { publishedOnly?: boolean } = {},
): Promise<PrototypeStageArtifact> {
  const { publishedOnly = false } = options;

  const demoQuery = (supabase as any)
    .from('demo_studio_demos')
    .select('id, status, updated_at, created_at')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);

  const waitlistQuery = (supabase as any)
    .from('waitlist_pages')
    .select('id, status, updated_at, created_at, published_at, exported_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);

  const [demoRes, waitlistRes] = await Promise.all([
    publishedOnly ? demoQuery.eq('status', 'published').maybeSingle() : demoQuery.maybeSingle(),
    publishedOnly
      ? waitlistQuery.in('status', ['published', 'exported']).maybeSingle()
      : waitlistQuery.maybeSingle(),
  ]);

  const demoRow = demoRes.data as { status?: string; updated_at?: string; created_at?: string } | null;
  const waitlistRow = waitlistRes.data as {
    status?: string;
    updated_at?: string;
    created_at?: string;
    published_at?: string;
    exported_at?: string;
  } | null;

  const demoAt = demoRow ? newer(demoRow.updated_at ?? null, demoRow.created_at ?? null) : null;
  const waitlistAt = waitlistRow
    ? newer(
        newer(waitlistRow.published_at ?? null, waitlistRow.exported_at ?? null),
        newer(waitlistRow.updated_at ?? null, waitlistRow.created_at ?? null),
      )
    : null;

  const completedAt = newer(demoAt, waitlistAt);
  if (!completedAt) return { completedAt: null, published: false, source: null };

  return {
    completedAt,
    published:
      demoRow?.status === 'published' ||
      ['published', 'exported'].includes(String(waitlistRow?.status ?? '')),
    source: completedAt === demoAt ? 'demo_studio' : 'waitlist',
  };
}
