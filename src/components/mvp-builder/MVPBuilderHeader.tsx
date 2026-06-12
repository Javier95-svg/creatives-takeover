import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pencil, Check, Database, Github,
  FolderOpen, Save, Clock, ChevronRight, Loader2, AlertCircle,
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
import { getMVPModelLabel } from '@/data/mvpModels';
import { cn } from '@/lib/utils';
import type { MVPBuilderIntegrationsHealth, MVPIntegrationStatus } from '@/lib/mvp-builder/integrations';
import type { MVPProjectRecord } from '@/hooks/useMVPBuilder';

interface MVPBuilderHeaderProps {
  projectName: string;
  setProjectName: (name: string) => void;
  selectedModels: string[];
  creditsAvailable: number;
  integrations: MVPBuilderIntegrationsHealth;
  onNewProject: () => void;
  savedProjects: MVPProjectRecord[];
  onLoadProject: (id: string) => void;
  onSaveProject: () => void;
  hasUnsavedChanges: boolean;
  isSavingProject: boolean;
  lastSavedAt: string | null;
  hasActiveProject: boolean;
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
  selectedModels,
  creditsAvailable,
  integrations,
  onNewProject,
  savedProjects,
  onLoadProject,
  onSaveProject,
  hasUnsavedChanges,
  isSavingProject,
  lastSavedAt,
  hasActiveProject,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [confirmNewOpen, setConfirmNewOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const primaryModelLabel = getMVPModelLabel(selectedModels[0]) ?? 'AI model';
  const additionalModels = Math.max(selectedModels.length - 1, 0);

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

  const renderStatusChip = (
    label: string,
    status: MVPIntegrationStatus,
    Icon: React.ComponentType<{ className?: string }>
  ) => {
    const healthy = status === 'connected';
    const needsAuth = status === 'expired' || status === 'error';
    return (
      <span
        className={cn(
          'hidden lg:flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-label font-medium',
          healthy && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
          needsAuth && 'border-amber-300/25 bg-amber-300/10 text-amber-100',
          !healthy && !needsAuth && 'border-white/10 bg-white/5 text-slate-300'
        )}
      >
        <Icon className="h-3 w-3" />
        {label}: {healthy ? 'live' : needsAuth ? 'reauth' : 'setup'}
      </span>
    );
  };

  const saveIndicator = () => {
    if (isSavingProject) {
      return (
        <span className="hidden sm:flex items-center gap-1 text-label text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving…
        </span>
      );
    }
    if (hasUnsavedChanges) {
      return (
        <button
          onClick={onSaveProject}
          className="hidden sm:flex items-center gap-1 text-label text-amber-300 hover:text-amber-200 transition-colors"
        >
          <AlertCircle className="h-3 w-3" />
          Unsaved
        </button>
      );
    }
    if (lastSavedAt) {
      return (
        <span className="hidden sm:flex items-center gap-1 text-label text-slate-500">
          <Check className="h-3 w-3 text-emerald-400" />
          Saved {formatRelativeTime(lastSavedAt)}
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <header
        className="relative flex h-13 items-center justify-between px-5 col-span-2 shrink-0 bg-surface-deep/95 backdrop-blur-2xl border-b border-white/8 overflow-hidden"
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-14 w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_65%)] blur-3xl" />
        </div>

        {/* Left — back + projects */}
        <div className="relative flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Platform</span>
          </Link>
          <Button
            variant="ghost"
            size="pill-sm"
            onClick={() => setProjectsOpen(true)}
            className="gap-1.5 border border-white/10 bg-white/[0.04] px-2.5 font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-colors"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Projects</span>
            {savedProjects.length > 0 && (
              <span className="ml-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-caption text-slate-300">
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
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-white" onClick={commit}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => { setDraft(projectName); setIsEditing(true); }}
              className="group flex items-center gap-1.5 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-sm font-semibold text-transparent transition-opacity hover:opacity-80"
            >
              {projectName}
              <Pencil className="h-3 w-3 text-white opacity-0 transition-opacity group-hover:opacity-40" />
            </button>
          )}
          {saveIndicator()}
        </div>

        {/* Right — status chips + actions */}
        <div className="relative flex items-center gap-2">
          {renderStatusChip('GitHub', integrations.github.status, Github)}
          {renderStatusChip('Supabase', integrations.supabase.status, Database)}
          <span className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-label font-medium text-emerald-300">
            {primaryModelLabel}
            {additionalModels > 0 ? ` +${additionalModels}` : ''}
          </span>
          <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-0.5 text-xs font-medium text-sky-200 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shrink-0" />
            {creditsAvailable} credits
          </span>
          {creditsAvailable === 0 && (
            <Link
              to="/pricing#credit-packs"
              className="hidden lg:inline-flex h-7 items-center rounded-md border border-amber-300/25 bg-amber-300/10 px-2 text-xs font-medium text-amber-100 hover:bg-amber-300/15"
            >
              Buy Credits
            </Link>
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
      <div className="h-px shrink-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Projects drawer */}
      <Sheet open={projectsOpen} onOpenChange={setProjectsOpen}>
        <SheetContent side="left" className="dark mvp-surface w-[320px] sm:w-[380px] p-0 bg-background border-white/10 text-slate-100">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-white/8">
            <SheetTitle className="text-white text-sm font-semibold">Your Projects</SheetTitle>
            <SheetDescription className="text-slate-400 text-xs">
              Click a project to load it. Your current project auto-saves every 30 seconds.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1 h-[calc(100vh-100px)]">
            <div className="p-4 space-y-2">
              {savedProjects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                  <p className="text-xs text-slate-500">No saved projects yet. Build something and it will appear here.</p>
                </div>
              ) : (
                savedProjects
                  .slice()
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleLoadProject(project.id)}
                      className="w-full text-left rounded-xl border border-white/8 bg-white/[0.03] p-3.5 hover:bg-white/[0.07] hover:border-white/15 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{project.title || 'Untitled Project'}</p>
                          <div className="mt-1 flex items-center gap-2 text-label text-slate-500">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{formatRelativeTime(project.updated_at)}</span>
                            {project.deployment_url && (
                              <>
                                <span>·</span>
                                <span className="text-emerald-400">Deployed</span>
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
                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                      </div>
                    </button>
                  ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Confirm "New" when there's an active project */}
      <AlertDialog open={confirmNewOpen} onOpenChange={setConfirmNewOpen}>
        <AlertDialogContent className="dark mvp-surface bg-background border-white/10 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Start a new project?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Your current project is auto-saved. It will appear in your Projects list and you can come back to it any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white">
              Keep working
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-white text-slate-950 hover:bg-slate-100"
              onClick={() => { onNewProject(); setConfirmNewOpen(false); }}
            >
              New project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
