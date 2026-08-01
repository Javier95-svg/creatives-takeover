import { supabase } from '@/integrations/supabase/client';
import { normalizeStoredArtifact } from '@/lib/icpDraftArtifacts';
import { readIcpBuilderSession } from '@/lib/icpBuilderSession';
import type { StoredIcpArtifact } from '@/lib/icpBuilderSession';

/**
 * Shared resolver for the `?icp=<draftId>` handoff that ICP Builder emits.
 *
 * Downstream tools previously ignored the param and either re-asked for everything
 * (Demo Studio) or silently used the founder's most recent draft (PMF Lab), which is the
 * wrong one whenever they have more than one. Resolving the specific draft keeps the
 * handoff honest; the latest-row fallback preserves the old behavior when no param is present.
 */

const ICP_SELECT = 'id, analysis_data, target_audience, business_description, industry, verdict, created_at';

export interface ResolvedIcpSource {
  artifact: StoredIcpArtifact;
  draftId: string | null;
  /** How the artifact was found — drives the provenance copy shown to the founder. */
  origin: 'param' | 'latest' | 'session';
}

export async function loadIcpArtifactById(userId: string, draftId: string): Promise<ResolvedIcpSource | null> {
  const { data, error } = await supabase
    .from('icp_analysis_results')
    .select(ICP_SELECT)
    .eq('id', draftId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  const normalized = normalizeStoredArtifact(data);
  if (!normalized.artifact) return null;
  return { artifact: normalized.artifact, draftId, origin: 'param' };
}

export async function loadLatestIcpArtifact(userId: string): Promise<ResolvedIcpSource | null> {
  const { data, error } = await supabase
    .from('icp_analysis_results')
    .select(ICP_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const normalized = normalizeStoredArtifact(data);
  if (!normalized.artifact) return null;
  return {
    artifact: normalized.artifact,
    draftId: (data as { id?: string }).id ?? null,
    origin: 'latest',
  };
}

/**
 * Anonymous path: a visitor who generated a preview but has not signed up yet still has
 * the artifact in sessionStorage, so /demo-studio/try can prefill without an account.
 */
export function readIcpArtifactFromSession(): ResolvedIcpSource | null {
  try {
    const session = readIcpBuilderSession();
    if (!session?.draftPreview) return null;
    return {
      artifact: session.draftPreview,
      draftId: session.savedAnalysisId,
      origin: 'session',
    };
  } catch {
    return null;
  }
}

/**
 * Resolve in the order that respects intent: the explicit param first, then the signed-in
 * founder's latest draft, then an unsaved preview from this browser session.
 */
export async function resolveIcpSource(input: {
  userId: string | null | undefined;
  draftId: string | null | undefined;
  allowLatestFallback?: boolean;
}): Promise<ResolvedIcpSource | null> {
  const { userId, draftId, allowLatestFallback = true } = input;

  if (userId && draftId) {
    const byId = await loadIcpArtifactById(userId, draftId);
    if (byId) return byId;
  }

  if (userId && allowLatestFallback) {
    const latest = await loadLatestIcpArtifact(userId);
    if (latest) return latest;
  }

  return readIcpArtifactFromSession();
}
