import { useAccountContext } from '@/hooks/useAccountContext';

/**
 * Whether this account still owes us a project.
 *
 * A thin read over useAccountContext, which is the single call the workspace
 * makes for who is signed in. It used to be its own RPC and its own cache
 * entry, which meant the shell asked the same question twice on every load.
 *
 * The rule itself lives in the database because the exemption depends on the
 * mentors, services and angel_investors tables that a normal account cannot
 * scan. Defaulting to "no project needed" while the answer is in flight
 * matters: the opposite default would flash the setup prompt at every mentor.
 */
export function useProjectSetup() {
  const { requiresProject, hasProject, startupName, userType, isLoading, refresh } = useAccountContext();

  return {
    requiresProject,
    hasProject,
    startupName,
    // Kept for the prompt's copy, which reads differently for the two.
    segment: userType === 'founder' || userType === 'builder' ? userType : null,
    isLoading,
    /** The one question the prompt cares about. */
    needsSetup: requiresProject && !hasProject,
    refresh,
  };
}
