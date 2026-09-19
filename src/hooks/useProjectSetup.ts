import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type ProjectSetupStatus = {
  /** False for mentors and marketplace providers, who are here to offer a service. */
  requiresProject: boolean;
  hasProject: boolean;
  /** What the founder already called their startup, used to seed the name. */
  startupName: string | null;
  segment: 'founder' | 'builder' | null;
};

const UNKNOWN: ProjectSetupStatus = {
  requiresProject: false,
  hasProject: true,
  startupName: null,
  segment: null,
};

/**
 * Whether this account still owes us a project.
 *
 * The rule lives in the database because the exemption depends on the mentors
 * and services tables, which a normal account cannot scan. Defaulting to "no
 * project needed" while the answer is in flight matters: the opposite default
 * would flash the setup prompt at every provider on every load.
 */
export function useProjectSetup() {
  const { user } = useAuth();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ['project-setup-status', userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<ProjectSetupStatus> => {
      const { data, error } = await supabase.rpc('project_setup_status' as never);
      if (error) throw error;
      const row = (data ?? {}) as Partial<ProjectSetupStatus>;
      return {
        requiresProject: row.requiresProject === true,
        hasProject: row.hasProject === true,
        startupName: typeof row.startupName === 'string' ? row.startupName : null,
        segment: row.segment === 'founder' || row.segment === 'builder' ? row.segment : null,
      };
    },
  });

  const status = query.data ?? UNKNOWN;
  return {
    ...status,
    isLoading: query.isPending,
    /** The one question the prompt cares about. */
    needsSetup: status.requiresProject && !status.hasProject,
    refresh: query.refetch,
  };
}
