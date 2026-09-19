import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProjects } from '@/hooks/useProjects';
import { useProjectSetup } from '@/hooks/useProjectSetup';
import { toast } from 'sonner';

/**
 * Asks for a project from the founders and builders who do not have one.
 *
 * Projects arrived after most accounts signed up, so 190 of them hold outcomes
 * with nothing to attach those outcomes to. The one-outcome-per-project rule is
 * meaningless until each of those accounts names a project, which is why this
 * is asked rather than offered.
 *
 * It can be closed, and it comes back on the next workspace load. That is
 * deliberate: the prompt is mandatory in effect, but someone who opened the
 * platform to answer a message should not be held hostage to finish first, and
 * if the exemption ever misfires nobody is locked out of their account.
 *
 * Mentors and marketplace providers never see it. requiresProject is false for
 * them, and it defaults to false while the answer is loading, so the dialog
 * cannot flash at somebody who is exempt.
 */
export function ProjectSetupGate() {
  const { needsSetup, startupName, segment, isLoading, refresh } = useProjectSetup();
  const { createProject } = useProjects();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!isLoading && needsSetup) setOpen(true);
  }, [isLoading, needsSetup]);

  // Seed once from the startup name they already gave, so the common case is a
  // confirmation rather than a blank form. Seeding on every render would fight
  // anyone who deliberately cleared the field.
  useEffect(() => {
    if (!seeded && startupName) {
      setTitle(startupName);
      setSeeded(true);
    }
  }, [seeded, startupName]);

  if (!needsSetup) return null;

  const submit = async () => {
    const name = title.trim();
    if (!name) return;
    try {
      await createProject.mutateAsync({ title: name, ideaSummary: summary.trim() || undefined });
      await refresh();
      setOpen(false);
      toast.success(`${name} is set up. Everything you build now attaches to it.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the project.');
    }
  };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Name your project</DialogTitle>
        <DialogDescription>
          {segment === 'builder'
            ? 'Every builder works on one project at a time. Name the thing you are here to build, and each stage you complete attaches its result to it.'
            : 'Every founder works on one project at a time. Name the venture you are building, and each stage you complete attaches its result to it.'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-setup-title">Project name</Label>
          <Input
            id="project-setup-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Throughline"
            maxLength={120}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-setup-summary">What is it, in one line? (optional)</Label>
          <Textarea
            id="project-setup-summary"
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="One growth view for creators publishing across several platforms."
            maxLength={280}
            rows={2}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          You can rename it later. One project keeps your results comparable, which is what makes the stage decisions mean anything.
        </p>
      </div>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={createProject.isPending}>
          Not now
        </Button>
        <Button onClick={() => void submit()} disabled={!title.trim() || createProject.isPending}>
          {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create project
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

export default ProjectSetupGate;
