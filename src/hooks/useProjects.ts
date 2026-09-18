import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { isProjectLimitError, projectLimitForPlan, projectLimitMessage } from '@/lib/projectLimits';

export type Project = {
  id: string;
  title: string;
  ideaSummary: string | null;
  status: string | null;
  archivedAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
};

/** The six staged outcomes. Fundraising is absent by design; it reads these. */
export type ProjectOutcomes = {
  projectId: string;
  title: string;
  archived: boolean;
  icpDraftId: string | null;
  pmfResultId: string | null;
  gtmPlanId: string | null;
  mvpProjectId: string | null;
  tractionSprintId: string | null;
  demoProjectId: string | null;
};

const ACTIVE_PROJECT_KEY = 'ct_active_project_';

/**
 * Which project the founder is working in. Per browser, because it is a view
 * preference rather than account state, and it falls back to the most recently
 * touched project so a new device still lands somewhere sensible.
 */
function readStoredActiveProject(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(`${ACTIVE_PROJECT_KEY}${userId}`);
  } catch {
    return null;
  }
}

function storeActiveProject(userId: string, projectId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${ACTIVE_PROJECT_KEY}${userId}`, projectId);
  } catch {
    // Private mode. The most recently touched project is still a good default.
  }
}

export function useProjects() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const { subscriptionData } = useSubscription({ fetchTiers: false });
  const plan = subscriptionData?.subscription_tier ?? null;

  const projectsQuery = useQuery({
    queryKey: ['projects', userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, idea_summary, status, archived_at, last_run_at, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id as string,
        title: (row.title as string) || 'Untitled project',
        ideaSummary: (row.idea_summary as string | null) ?? null,
        status: (row.status as string | null) ?? null,
        archivedAt: (row.archived_at as string | null) ?? null,
        lastRunAt: (row.last_run_at as string | null) ?? null,
        createdAt: row.created_at as string,
      }));
    },
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const activeProjects = useMemo(() => projects.filter((p) => !p.archivedAt), [projects]);
  const archivedProjects = useMemo(() => projects.filter((p) => p.archivedAt), [projects]);

  const limit = projectLimitForPlan(plan);
  const atLimit = activeProjects.length >= limit;

  const activeProjectId = useMemo(() => {
    if (!userId) return null;
    const stored = readStoredActiveProject(userId);
    if (stored && activeProjects.some((p) => p.id === stored)) return stored;
    return activeProjects[0]?.id ?? null;
  }, [userId, activeProjects]);

  const activeProject = useMemo(
    () => activeProjects.find((p) => p.id === activeProjectId) ?? null,
    [activeProjects, activeProjectId],
  );

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['projects', userId] });
    void queryClient.invalidateQueries({ queryKey: ['project-outcomes'] });
  }, [queryClient, userId]);

  const selectProject = useCallback((projectId: string) => {
    if (!userId) return;
    storeActiveProject(userId, projectId);
    invalidate();
  }, [userId, invalidate]);

  const createProject = useMutation({
    mutationFn: async (input: { title: string; ideaSummary?: string }) => {
      if (!userId) throw new Error('Sign in to create a project.');
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title: input.title.trim() || 'My project',
          idea_summary: input.ideaSummary?.trim() || null,
          status: 'active',
        })
        .select('id')
        .single();
      // The database refuses over-limit creates. Translate it into the message
      // the founder should actually read rather than surfacing raw SQL.
      if (error) throw new Error(isProjectLimitError(error) ? projectLimitMessage(plan) : error.message);
      return data.id as string;
    },
    onSuccess: (projectId) => {
      if (userId) storeActiveProject(userId, projectId);
      invalidate();
    },
  });

  const setArchived = useMutation({
    mutationFn: async (input: { projectId: string; archived: boolean }) => {
      const { error } = await supabase
        .from('projects')
        .update({ archived_at: input.archived ? new Date().toISOString() : null })
        .eq('id', input.projectId);
      // Un-archiving also consumes a slot, so it can hit the same limit.
      if (error) throw new Error(isProjectLimitError(error) ? projectLimitMessage(plan) : error.message);
    },
    onSuccess: invalidate,
  });

  return {
    projects,
    activeProjects,
    archivedProjects,
    activeProject,
    activeProjectId,
    selectProject,
    createProject,
    setArchived,
    limit,
    atLimit,
    plan,
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
  };
}

/** The current outcomes for one project, read through the database's own view of the rule. */
export function useProjectOutcomes(projectId: string | null) {
  return useQuery({
    queryKey: ['project-outcomes', projectId],
    enabled: Boolean(projectId),
    staleTime: 30_000,
    queryFn: async (): Promise<ProjectOutcomes | null> => {
      const { data, error } = await supabase.rpc('project_outcomes', { p_project_id: projectId });
      if (error) throw error;
      return (data as ProjectOutcomes | null) ?? null;
    },
  });
}
