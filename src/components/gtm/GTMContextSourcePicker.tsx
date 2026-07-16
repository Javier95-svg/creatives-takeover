import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FolderKanban, Loader2, PencilLine, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GTMMVPProjectOption } from '@/hooks/useGTMStrategist';

interface GTMContextSourcePickerProps {
  projects: GTMMVPProjectOption[];
  isLoading: boolean;
  onImportProject: (projectId: string) => void;
  onStartManual: () => void;
}

const projectStatus = (project: GTMMVPProjectOption) => {
  if (project.deploymentUrl || project.deploymentStatus === 'deployed') return 'Live';
  return 'Draft';
};

export default function GTMContextSourcePicker({ projects, isLoading, onImportProject, onStartManual }: GTMContextSourcePickerProps) {
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    if (selectedProjectId && !projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId('');
    }
  }, [projects, selectedProjectId]);

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="space-y-3 text-center">
        <h1 className="pb-2 text-3xl font-bold leading-tight creatives-font takeover-gradient sm:text-4xl md:text-5xl">
          GTM Strategist
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Choose how you want to add the product context for your go-to-market plan.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="flex min-h-80 flex-col rounded-3xl border border-primary/30 bg-background/90 p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Option 1</p>
            <h2 className="text-xl font-semibold">Import from MVP Builder</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pick one saved project and reuse its product name, launch status, audience, problem, and solution where available.
            </p>
          </div>

          <div className="mt-6 flex flex-1 flex-col justify-end gap-3">
            {isLoading ? (
              <div className="flex h-10 items-center gap-2 rounded-xl border border-border/60 px-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Loading MVP projects…
              </div>
            ) : projects.length > 0 ? (
              <>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger aria-label="Choose an MVP Builder project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProject ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                    <span className="truncate text-muted-foreground">{selectedProject.title}</span>
                    <span className="shrink-0 font-medium text-foreground">{projectStatus(selectedProject)}</span>
                  </div>
                ) : null}
                <Button type="button" disabled={!selectedProjectId} onClick={() => onImportProject(selectedProjectId)}>
                  Use this project<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                  You do not have a saved MVP Builder project yet.
                </p>
                <Button asChild type="button" variant="outline" className="w-full">
                  <Link to="/mvp-builder"><Rocket className="mr-2 h-4 w-4" />Open MVP Builder</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-80 flex-col rounded-3xl border border-border/70 bg-background/90 p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground">
            <PencilLine className="h-5 w-5" />
          </div>
          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Option 2</p>
            <h2 className="text-xl font-semibold">Fill out the form manually</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Start with a blank GTM intake and enter the product, customer, constraints, and six-week outcome yourself.
            </p>
          </div>
          <div className="mt-6 flex flex-1 items-end">
            <Button type="button" variant="outline" className="w-full" onClick={onStartManual}>
              Start manually<ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
