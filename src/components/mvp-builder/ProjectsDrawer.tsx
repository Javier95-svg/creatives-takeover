import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderOpen, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MVPProjectRecord } from '@/hooks/useMVPBuilder';

interface ProjectsDrawerProps {
  open: boolean;
  onClose: () => void;
  projects: MVPProjectRecord[];
  isLoading: boolean;
  activeProjectId?: string | null;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getCodeSnippet(project: MVPProjectRecord) {
  if (!project.generated_code) return 'No preview saved yet.';
  return project.generated_code
    .replace(/<!DOCTYPE html>/i, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

export const ProjectsDrawer: React.FC<ProjectsDrawerProps> = ({
  open,
  onClose,
  projects,
  isLoading,
  activeProjectId,
  onLoad,
  onDelete,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="absolute inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={onClose}
            aria-label="Close projects drawer"
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 z-40 flex w-full max-w-[440px] flex-col border-r border-border/60 bg-background/95 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">My Projects</p>
                <p className="text-xs text-muted-foreground">
                  Load a saved build or clean out old drafts.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-3xl border border-border/60 bg-muted/30 p-4 animate-pulse"
                    >
                      <div className="h-4 w-40 rounded bg-muted" />
                      <div className="mt-3 h-16 rounded-2xl bg-muted/80" />
                    </div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-muted/25 px-6 py-12 text-center">
                  <p className="text-sm font-medium">No saved projects yet</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Your autosaved and manually saved builds will show up here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <motion.div
                      key={project.id}
                      layout
                      className={`rounded-[26px] border p-4 transition-colors duration-200 ease-out ${
                        activeProjectId === project.id
                          ? 'border-primary/35 bg-primary/8'
                          : 'border-border/60 bg-card/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {project.title}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Last edited {formatTimestamp(project.updated_at)}
                          </p>
                        </div>
                        {activeProjectId === project.id && (
                          <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="mt-4 rounded-2xl border border-border/50 bg-slate-950 px-4 py-3">
                        <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-slate-200/80">
                          {getCodeSnippet(project)}
                        </pre>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 rounded-xl px-3 text-xs"
                          onClick={() => {
                            onLoad(project.id);
                            onClose();
                          }}
                        >
                          <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                          Load
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 rounded-xl px-3 text-xs"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `Delete "${project.title}"? This cannot be undone.`
                            );
                            if (confirmed) {
                              onDelete(project.id);
                            }
                          }}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
