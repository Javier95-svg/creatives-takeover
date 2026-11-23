import { supabase } from '@/integrations/supabase/client';
import { pickActiveProjectId } from '@/lib/activeProjectChoice';

/**
 * The project a founder is working in, outside React.
 *
 * The project is the unit of memory: each tool keeps one current result per
 * project (project_id + superseded_at null). Code that cannot use
 * useActiveProjectContext reads the same choice here, so it never falls back
 * to "the founder's latest row", which mixes startups once there are two.
 *
 * The choice is per browser (a view preference); without one it is the most
 * recently created active project, the same default useProjects uses.
 */

const ACTIVE_PROJECT_KEY = 'ct_active_project_';

export function readStoredActiveProject(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(`${ACTIVE_PROJECT_KEY}${userId}`);
  } catch {
    return null;
  }
}

export function storeActiveProject(userId: string, projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${ACTIVE_PROJECT_KEY}${userId}`, projectId);
  } catch {
    // Private mode. The most recently created project is still a good default.
  }
}

export { pickActiveProjectId };

export async function loadActiveProjectId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  if (error || !data) return null;
  return pickActiveProjectId(
    readStoredActiveProject(userId),
    (data as Array<{ id: string }>).map((row) => row.id),
  );
}

/**
 * Restricts a query on one of the six tool tables to the active project's
 * current row. Without a project (older accounts), it leaves the query as is,
 * so the caller's own ordering picks the latest row as before.
 */
export async function scopeToCurrentProjectRow<Q>(
  query: Q,
  userId: string,
): Promise<{ query: Q; projectId: string | null }> {
  const projectId = await loadActiveProjectId(userId);
  if (!projectId) return { query, projectId: null };
  // Kept as the caller's own builder type so .order()/.limit() still chain;
  // every tool table has project_id and superseded_at.
  const builder = query as unknown as { eq: (column: string, value: string) => { is: (column: string, value: null) => Q } };
  return { query: builder.eq('project_id', projectId).is('superseded_at', null), projectId };
}
