import { useState } from 'react';
import { Archive, ArchiveRestore, Check, ChevronDown, FolderPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { projectLimitMessage } from '@/lib/projectLimits';
import { enterWorkspaceRoute } from '@/lib/workspaceNavigation';

/**
 * Switch, create and archive projects.
 *
 * The plan limit is stated before it is hit, and creating is disabled rather
 * than failing, because a founder should see the trade-off ahead of the action.
 * Archiving is the exit that keeps the outcomes; it is never a delete.
 */
export function ProjectSwitcher() {
  const {
    activeProjects, archivedProjects, activeProject, activeProjectId,
    selectProject, createProject, setArchived, limit, atLimit, plan, isLoading,
  } = useProjects();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');

  if (isLoading || !activeProject) return null;

  const submitCreate = async () => {
    try {
      await createProject.mutateAsync({ title });
      toast.success('Project created');
      setCreateOpen(false);
      setTitle('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the project.');
    }
  };

  const toggleArchived = async (projectId: string, archived: boolean) => {
    try {
      await setArchived.mutateAsync({ projectId, archived });
      toast.success(archived ? 'Project archived' : 'Project restored');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the project.');
    }
  };

  return <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Active project: ${activeProject.title}. Switch project.`}
          className="flex max-w-[12rem] items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-foreground hover:bg-muted">
          <span className="truncate">{activeProject.title}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b border-border/60 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">
            {activeProjects.length} of {limit} project{limit === 1 ? '' : 's'} in use
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {activeProjects.map((project) => (
            <div key={project.id} className="flex items-center gap-1 px-1">
              <button type="button" onClick={() => { selectProject(project.id); setOpen(false); }}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted">
                <Check className={`h-4 w-4 shrink-0 ${project.id === activeProjectId ? 'opacity-100' : 'opacity-0'}`} />
                <span className="truncate">{project.title}</span>
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                aria-label={`Archive ${project.title}`}
                disabled={setArchived.isPending}
                onClick={() => void toggleArchived(project.id, true)}>
                <Archive className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {archivedProjects.length > 0 && <>
            <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Archived</p>
            {archivedProjects.map((project) => (
              <div key={project.id} className="flex items-center gap-1 px-1">
                <span className="min-w-0 flex-1 truncate px-2 py-2 text-sm text-muted-foreground">{project.title}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  aria-label={`Restore ${project.title}`}
                  disabled={setArchived.isPending || atLimit}
                  title={atLimit ? projectLimitMessage(plan) : undefined}
                  onClick={() => void toggleArchived(project.id, false)}>
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </>}
        </div>

        <div className="border-t border-border/60 p-2">
          {atLimit ? (
            <div className="space-y-2 px-1 py-1">
              <p className="text-xs leading-5 text-muted-foreground">{projectLimitMessage(plan)}</p>
              <Button size="sm" className="w-full" onClick={() => { setOpen(false); enterWorkspaceRoute('/pricing'); }}>
                Upgrade
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="w-full justify-start"
              onClick={() => { setOpen(false); setCreateOpen(true); }}>
              <FolderPlus className="mr-2 h-4 w-4" />New project
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>

    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Each project carries one outcome per stage, so your draft, demo and plan stay tied to a single idea.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="project-title">What are you building?</Label>
          <Input id="project-title" autoFocus value={title} maxLength={80}
            placeholder="e.g. Apiceflow" onChange={(event) => setTitle(event.target.value)} />
          <Badge variant="secondary" className="mt-2">{activeProjects.length + 1} of {limit} after this</Badge>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={() => void submitCreate()} disabled={!title.trim() || createProject.isPending}>
            {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

export default ProjectSwitcher;
