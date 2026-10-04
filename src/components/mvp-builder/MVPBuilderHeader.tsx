import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pencil, Check, Database, Github,
  FolderOpen, Save, Clock, ChevronRight, Loader2, AlertCircle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { MVPBuilderIntegrationsHealth, MVPIntegrationStatus } from '@/lib/mvp-builder/integrations';
import type { MvpNextStep } from '@/lib/mvp-builder/nextStep';
import type { MVPProjectRecord } from '@/hooks/useMVPBuilder';

interface MVPBuilderHeaderProps {
  projectName: string;
  setProjectName: (name: string) => void;
  selectedModels: string[];
  creditsAvailable: number;
  integrations: MVPBuilderIntegrationsHealth;
  onNewProject: () => void;
  savedProjects: MVPProjectRecord[];
  currentProjectId: string;
  onLoadProject: (id: string) => void;
  onDeleteProject: (id: string) => Promise<boolean> | boolean;
  onSaveProject: () => void;
  hasUnsavedChanges: boolean;
  isSavingProject: boolean;
  lastSavedAt: string | null;
  /** Why the last save failed; cleared when a save succeeds. */
  saveError: string | null;
  onRetrySave: () => void;
  nextStep: MvpNextStep;
  /** The workspace project switcher; the app shown follows the chosen project. */
  projectSwitcher?: React.ReactNode;
  hasActiveProject: boolean;
  onBuyCredits: () => void;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const MVPBuilderHeader: React.FC<MVPBuilderHeaderProps> = ({
  projectName,
  setProjectName,
  creditsAvailable,
  integrations,
  onNewProject,
  savedProjects,
  currentProjectId,
  onLoadProject,
  onDeleteProject,
  onSaveProject,
  hasUnsavedChanges,
  isSavingProject,
  lastSavedAt,
  saveError,
  onRetrySave,
  nextStep,
  projectSwitcher,
  hasActiveProject,
  onBuyCredits,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MVPProjectRecord | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteTargetTitle = deleteTarget?.title?.trim() || 'Untitled Project';
  const deletingCurrentProject = deleteTarget?.id === currentProjectId;
  const deletingPublishedProject = Boolean(deleteTarget?.deployment_url || deleteTarget?.subdomain_slug);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setDraft(projectName);
  }, [projectName]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) setProjectName(trimmed);
    else setDraft(projectName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') {
      setDraft(projectName);
      setIsEditing(false);
    }
  };

  const handleNewClick = () => {
    if (hasActiveProject) {
      setConfirmNewOpen(true);
    } else {
      onNewProject();
    }
  };

  const handleLoadProject = (id: string) => {
    onLoadProject(id);
    setProjectsOpen(false);
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open && !isDeletingProject) {
      setDeleteTarget(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeletingProject) return;

    setIsDeletingProject(true);
    try {
      const deleted = await onDeleteProject(deleteTarget.id);
      if (deleted) {
        setDeleteTarget(null);
      }
    } finally {
      setIsDeletingProject(false);
    }
  };

  const renderStatusChip = (
    label: string,
    status: MVPIntegrationStatus,
    Icon: React.ComponentType<{ className?: string }>
  ) => {
    const healthy = status === 'connected';
    const needsAuth = status === 'expired' || status === 'error';
    if (!healthy && !needsAuth) return null;
    return (
      <span
        className={cn(
          'hidden lg:flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-label font-medium',
          healthy && 'border-white/10 text-muted-foreground',
          needsAuth && 'border-warning/25 bg-warning/10 text-warning'
        )}
      >
        <Icon className="h-3 w-3" />
        {label}{needsAuth ? ': reconnect' : ''}
      </span>
    );
  };

  const saveIndicator = () => {
    if (saveError && !isSavingProject) {
      return (
        <span className="flex items-center gap-1.5 text-label" role="status" title={saveError}>
          <AlertCircle className="h-3 w-3 text-destructive" aria-hidden="true" />
          <span className="text-destructive">Not saved</span>
          <button type="button" onClick={onRetrySave} className="font-medium text-primary underline-offset-4 hover:underline">
            Retry
          </button>
        </span>
      );
    }
    if (isSavingProject) {
      return (
        <span className="hidden sm:flex items-center gap-1 text-label text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving
        </span>
      );
    }
    if (hasUnsavedChanges) {
      return (
        <button
          onClick={onSaveProject}
          className="hidden sm:flex items-center gap-1 text-label text-warning hover:text-warning transition-colors"
        >
          Unsaved changes
        </button>
      );
    }
    if (lastSavedAt) {
      return (
        <span className="hidden sm:flex items-center gap-1 text-label text-muted-foreground">
          Saved {formatRelativeTime(lastSavedAt)}
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <header
        className="relative flex h-13 items-center justify-between gap-3 px-5 col-span-2 shrink-0 bg-surface-deep border-b border-white/8 overflow-hidden"
      >

        {/* Left — back + projects */}
        <div className="relative flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Platform</span>
          </Link>
          <Button
            variant="ghost"
            size="pill-sm"
            onClick={() => setProjectsOpen(true)}
            className="gap-1.5 border border-white/10 bg-white/[0.04] px-2.5 font-medium text-muted-foreground hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Projects</span>
            {savedProjects.length > 0 && (
              <span className="ml-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-caption text-muted-foreground">
                {savedProjects.length}
              </span>
            )}
          </Button>
        </div>

        {/* Centre — project name */}
        <div className="relative flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                className="h-7 w-48 border-white/10 bg-white/5 px-2 py-0 text-center text-sm text-white focus-visible:ring-white/20"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={commit}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => { setDraft(projectName); setIsEditing(true); }}
              className="group flex items-center gap-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
            >
              {projectName}
              <Pencil className="h-3 w-3 text-white opacity-0 transition-opacity group-hover:opacity-40" />
            </button>
          )}
          {saveIndicator()}
          {projectSwitcher ? <span className="hidden md:inline-flex">{projectSwitcher}</span> : null}
        </div>

        {/* Right — status chips + actions */}
        <div className="relative flex items-center gap-2">
          {/* The one thing to do next; the hint explains it on hover. */}
          <span className="hidden max-w-[22rem] truncate text-xs text-muted-foreground xl:inline" title={nextStep.hint}>
            Next: <span className="font-medium text-primary">{nextStep.label}</span>
          </span>
          {renderStatusChip('GitHub', integrations.github.status, Github)}
          {renderStatusChip('Supabase', integrations.supabase.status, Database)}
          <button
            type="button"
            onClick={onBuyCredits}
            title="Buy more credits"
            className="hidden sm:inline text-xs text-muted-foreground underline-offset-4 hover:text-white hover:underline"
          >
            {creditsAvailable} credits
          </button>
          {creditsAvailable === 0 && (
            <Button
              type="button"
              variant="ghost"
              size="pill-sm"
              onClick={onBuyCredits}
              className="hidden h-7 min-h-0 rounded-md border border-warning/25 bg-warning/10 px-2 text-xs font-medium text-warning hover:bg-warning/15 hover:text-warning lg:inline-flex"
            >
              Buy Credits
            </Button>
          )}
          {hasActiveProject && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 hover:text-white backdrop-blur-sm disabled:opacity-50"
              onClick={onSaveProject}
              disabled={isSavingProject || !hasUnsavedChanges}
            >
              {isSavingProject ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Save</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
            onClick={handleNewClick}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </header>

      {/* Projects drawer */}
      <Sheet open={projectsOpen} onOpenChange={setProjectsOpen}>
        <SheetContent side="left" className="dark mvp-surface w-[320px] sm:w-[380px] p-0 bg-background border-white/10 text-muted-foreground">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/8">
            <SheetTitle className="text-white text-sm font-semibold">Your Projects</SheetTitle>
            <SheetDescription className="text-muted-foreground text-xs">
              Click a project to open it. Your work saves a few seconds after each change.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 h-[calc(100vh-100px)]">
            <div className="p-4 space-y-2">
              {savedProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                  <p className="text-xs text-muted-foreground">No saved projects yet. Build something and it will appear here.</p>
                </div>
              ) : (
                savedProjects
                  .slice()
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .map((project) => (
                    <div
                      key={project.id}
                      className="group flex w-full items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3.5 transition-all hover:border-white/15 hover:bg-white/[0.07]"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadProject(project.id)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{project.title || 'Untitled Project'}</p>
                          <div className="mt-1 flex items-center gap-2 text-label text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{formatRelativeTime(project.updated_at)}</span>
                            {project.deployment_url && (
                              <>
                                <span>·</span>
                                <span className="text-success">Published</span>
                              </>
                            )}
                            {project.project_files && project.project_files.length > 0 && (
                              <>
                                <span>·</span>
                                <span>{project.project_files.length} file{project.project_files.length !== 1 ? 's' : ''}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground shrink-0 transition-colors" />
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={`Delete ${project.title || 'Untitled Project'}`}
                        title="Delete project"
                        onClick={() => setDeleteTarget(project)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Confirm "New" when there's an active project */}
      <AlertDialog open={confirmNewOpen} onOpenChange={setConfirmNewOpen}>
        <AlertDialogContent className="dark mvp-surface bg-background border-white/10 text-muted-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Start a new project?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Your current project stays in your Projects list, so you can come back to it any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white">
              Keep working
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-white text-foreground hover:bg-muted"
              onClick={() => { onNewProject(); setConfirmNewOpen(false); }}
            >
              New project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm project delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent className="dark mvp-surface bg-background border-white/10 text-muted-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete project?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove "{deleteTargetTitle}" from Your Projects
              {deletingCurrentProject ? ' and clear the current workspace' : ''}. This cannot be undone.
              {deletingPublishedProject ? ' Published links for this project will stop working.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingProject}
              className="border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {isDeletingProject ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : (
                'Delete project'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
