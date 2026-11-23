/**
 * The profile's startup name and description were copied into the workspace
 * project at onboarding. Editing them on the profile used to leave the project
 * (which every tool and Pulse read) on the old text. A project follows the edit
 * only while it still holds what the profile said before, so an imported or
 * project-specific title or summary is never overwritten. The projects trigger
 * keeps the change in the decision history.
 *
 * Import-free so node tests can load it.
 */

export interface ProfileStartupCopy {
  name: string | null | undefined;
  description: string | null | undefined;
}

export interface ProjectCopy {
  title: string | null;
  idea_summary: string | null;
}

const clean = (value: string | null | undefined) => (value ?? '').trim();

export function projectPatchFromProfileEdit(
  project: ProjectCopy,
  before: ProfileStartupCopy,
  after: ProfileStartupCopy,
): Partial<ProjectCopy> {
  const patch: Partial<ProjectCopy> = {};
  const [oldName, newName] = [clean(before.name), clean(after.name)];
  const [oldDescription, newDescription] = [clean(before.description), clean(after.description)];
  if (newName && newName !== oldName && (clean(project.title) === oldName || !clean(project.title))) {
    patch.title = newName;
  }
  if (newDescription && newDescription !== oldDescription
    && (clean(project.idea_summary) === oldDescription || !clean(project.idea_summary))) {
    patch.idea_summary = newDescription;
  }
  return patch;
}
