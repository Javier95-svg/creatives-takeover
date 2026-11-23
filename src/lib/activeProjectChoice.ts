/**
 * Which project a founder is working in: the one this browser last chose when
 * it is still active, else the newest active project. Import-free so node
 * tests can load it; src/lib/activeProject.ts and useProjects use it.
 */
export function pickActiveProjectId(
  storedId: string | null,
  activeProjectIdsNewestFirst: string[],
): string | null {
  if (storedId && activeProjectIdsNewestFirst.includes(storedId)) return storedId;
  return activeProjectIdsNewestFirst[0] ?? null;
}
