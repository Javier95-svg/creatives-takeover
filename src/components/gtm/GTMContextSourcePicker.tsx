import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FolderKanban, Loader2, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GTMMVPProjectOption } from '@/hooks/useGTMStrategist';

interface GTMContextSourcePickerProps {
  projects: GTMMVPProjectOption[];
  isLoading: boolean;
  onImportProject: (projectId: string) => void;
}

const projectStatus = (project: GTMMVPProjectOption) =>
  project.deploymentUrl || project.deploymentStatus === 'deployed' ? 'Live' : 'Draft';

export default function GTMContextSourcePicker({ projects, isLoading, onImportProject }: GTMContextSourcePickerProps) {
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />Loading your MVP Builder projects…
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
          <FolderKanban className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">No saved MVP Builder projects found</p>
            <p className="mt-1 text-sm text-muted-foreground">Save a project in MVP Builder first, then return here to import its context.</p>
          </div>
        </div>
        <Button asChild type="button" variant="outline" className="w-full">
          <Link to="/mvp-builder"><Rocket className="mr-2 h-4 w-4" />Open MVP Builder</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
        <SelectTrigger aria-label="Choose an MVP Builder project">
          <SelectValue placeholder="Select an MVP Builder project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedProject ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
          <span className="truncate text-muted-foreground">{selectedProject.title}</span>
          <span className="shrink-0 font-medium text-foreground">{projectStatus(selectedProject)}</span>
        </div>
      ) : null}

      <Button type="button" className="w-full" disabled={!selectedProjectId} onClick={() => onImportProject(selectedProjectId)}>
        Import selected project<ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
