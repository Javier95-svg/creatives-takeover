import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Code2,
  FileCode2,
  RotateCcw,
  Save,
  TriangleAlert,
  Download,
  Eye,
  Layers3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  MVPProjectDependency,
  MVPProjectFile,
  MVPProjectFramework,
  MVPProjectSnapshot,
  MVPProjectType,
} from '@/lib/mvp-builder/project';
import { getMVPProjectTypeLabel } from '@/data/mvpProjectTypes';

interface MVPBuilderCodePanelProps {
  files: MVPProjectFile[];
  baselineFiles: MVPProjectFile[];
  projectFramework: MVPProjectFramework;
  projectType: MVPProjectType;
  projectSummary: string;
  projectDependencies: MVPProjectDependency[];
  projectSnapshots: MVPProjectSnapshot[];
  selectedFilePath: string | null;
  entryFilePath: string;
  codeChanges: Array<{ path: string; status: 'added' | 'modified' }>;
  isGenerating: boolean;
  onSelectFile: (path: string) => void;
  onSaveFile: (path: string, content: string) => void;
  onResetFile: (path: string) => void;
  onResetProject: () => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onSelectEntryFile: (path: string) => void;
}

export const MVPBuilderCodePanel: React.FC<MVPBuilderCodePanelProps> = ({
  files,
  baselineFiles,
  projectFramework,
  projectType,
  projectSummary,
  projectDependencies,
  projectSnapshots,
  selectedFilePath,
  entryFilePath,
  codeChanges,
  isGenerating,
  onSelectFile,
  onSaveFile,
  onResetFile,
  onResetProject,
  onCreateSnapshot,
  onRestoreSnapshot,
  onSelectEntryFile,
}) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const selectedFile =
    files.find((file) => file.path === selectedFilePath) ?? files[0] ?? null;

  useEffect(() => {
    if (!selectedFile && files[0]) {
      onSelectFile(files[0].path);
    }
  }, [files, onSelectFile, selectedFile]);

  const currentDraft = selectedFile
    ? drafts[selectedFile.path] ?? selectedFile.content
    : '';
  const isDirty = Boolean(selectedFile && currentDraft !== selectedFile.content);

  const htmlEntryOptions = useMemo(
    () => files.filter((file) => file.path.toLowerCase().endsWith('.html')),
    [files]
  );

  const changedPathSet = useMemo(
    () => new Map(codeChanges.map((change) => [change.path, change.status])),
    [codeChanges]
  );
  const baselineFileMap = useMemo(
    () => new Map(baselineFiles.map((file) => [file.path, file])),
    [baselineFiles]
  );
  const selectedBaselineFile = selectedFile
    ? baselineFileMap.get(selectedFile.path) ?? null
    : null;
  const selectedChangeStatus = selectedFile
    ? changedPathSet.get(selectedFile.path) ?? null
    : null;

  const selectedDiffStats = useMemo(() => {
    if (!selectedFile || !selectedBaselineFile) {
      return {
        added: selectedFile ? currentDraft.split('\n').length : 0,
        removed: 0,
        changed: selectedFile ? Number(Boolean(selectedChangeStatus)) : 0,
      };
    }

    const currentLines = currentDraft.split('\n');
    const baselineLines = selectedBaselineFile.content.split('\n');
    const maxLength = Math.max(currentLines.length, baselineLines.length);
    let added = 0;
    let removed = 0;
    let changed = 0;

    for (let index = 0; index < maxLength; index += 1) {
      const currentLine = currentLines[index];
      const baselineLine = baselineLines[index];
      if (baselineLine === undefined && currentLine !== undefined) {
        added += 1;
      } else if (currentLine === undefined && baselineLine !== undefined) {
        removed += 1;
      } else if (currentLine !== baselineLine) {
        changed += 1;
      }
    }

    return { added, removed, changed };
  }, [currentDraft, selectedBaselineFile, selectedChangeStatus, selectedFile]);

  const handleDraftChange = (value: string) => {
    if (!selectedFile) return;
    setDrafts((prev) => ({
      ...prev,
      [selectedFile.path]: value,
    }));
  };

  const handleSave = useCallback(() => {
    if (!selectedFile) return;
    onSaveFile(selectedFile.path, currentDraft);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[selectedFile.path];
      return next;
    });
  }, [currentDraft, onSaveFile, selectedFile]);

  const handleResetFile = () => {
    if (!selectedFile) return;
    onResetFile(selectedFile.path);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[selectedFile.path];
      return next;
    });
  };

  const handleSaveAll = useCallback(() => {
    const draftEntries = Object.entries(drafts);
    if (draftEntries.length === 0) return;

    for (const [path, content] of draftEntries) {
      onSaveFile(path, content);
    }
    setDrafts({});
  }, [drafts, onSaveFile]);

  const handleCopy = async () => {
    if (!selectedFile) return;
    await navigator.clipboard.writeText(currentDraft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleExportProject = () => {
    const payload = JSON.stringify(
      {
        entryFile: entryFilePath,
        files: files.map((file) => ({
          path: file.path,
          content: drafts[file.path] ?? file.content,
        })),
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mvp-project.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') {
        return;
      }

      event.preventDefault();

      if (Object.keys(drafts).length > 1) {
        handleSaveAll();
        return;
      }

      if (isDirty) {
        handleSave();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drafts, handleSave, handleSaveAll, isDirty]);

  if (files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/10 px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background">
            <Code2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No code yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate an MVP or import a repository to inspect and edit the underlying files.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="border-b border-border/50 bg-muted/20 lg:border-b-0 lg:border-r">
        <div className="border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Project files</p>
              <p className="text-xs text-muted-foreground">
                {files.length} files, {codeChanges.length} unsaved code changes
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExportProject}>
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
          {htmlEntryOptions.length > 0 && (
            <div className="mt-3 rounded-xl border border-border/60 bg-background/80 p-3">
              <label className="text-label font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Preview entry
              </label>
              <select
                value={entryFilePath}
                onChange={(event) => onSelectEntryFile(event.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              >
                {htmlEntryOptions.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.path}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <ScrollArea className="h-[calc(100%-104px)]">
          <div className="space-y-1 p-2">
            {files.map((file) => {
              const changeStatus = changedPathSet.get(file.path);
              const active = file.path === selectedFile?.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => onSelectFile(file.path)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                    active
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-transparent bg-background/70 text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <FileCode2 className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{file.path}</p>
                    <p className="truncate text-label uppercase tracking-[0.12em] text-muted-foreground">
                      {file.language}
                    </p>
                  </div>
                  {changeStatus && (
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-caption font-semibold uppercase tracking-[0.12em] text-warning">
                      {changeStatus}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="border-b border-border/50 bg-background/90 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {selectedFile?.path ?? 'Select a file'}
                </p>
                {selectedFile?.path === entryFilePath && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-caption font-semibold uppercase tracking-[0.12em] text-primary">
                    Preview entry
                  </span>
                )}
                {isDirty && (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-caption font-semibold uppercase tracking-[0.12em] text-warning">
                    Unsaved
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Edit the generated code directly. Save changes to refresh the preview when this project is previewable.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleSaveAll}
                disabled={Object.keys(drafts).length === 0 || isGenerating}
              >
                <Layers3 className="h-3.5 w-3.5" />
                Save all
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleCopy}
                disabled={!selectedFile}
              >
                <Eye className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy file'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleResetFile}
                disabled={!selectedFile}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset file
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={onResetProject}
                disabled={codeChanges.length === 0}
              >
                <TriangleAlert className="h-3.5 w-3.5" />
                Reset project
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={handleSave}
                disabled={!selectedFile || !isDirty || isGenerating}
              >
                <Save className="h-3.5 w-3.5" />
                Save changes
              </Button>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-h-0 border-b border-border/50 xl:border-b-0 xl:border-r">
            <Textarea
              value={currentDraft}
              onChange={(event) => handleDraftChange(event.target.value)}
              spellCheck={false}
              disabled={!selectedFile}
              className="h-full min-h-[420px] resize-none rounded-none border-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.08),transparent_42%),hsl(var(--background))] px-5 py-4 font-mono text-sm leading-6 focus-visible:ring-0"
            />
          </div>

          <div className="bg-muted/20 px-4 py-4">
            <div className="rounded-2xl border border-border/60 bg-background/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Project manifest
              </p>
              <div className="mt-3 space-y-3 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <span>Framework</span>
                  <span className="font-medium">{projectFramework}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Project type</span>
                  <span className="font-medium">{getMVPProjectTypeLabel(projectType)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dependencies</span>
                  <span className="font-medium">{projectDependencies.length}</span>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
                  {projectSummary}
                </div>
                {projectDependencies.length > 0 && (
                  <div className="space-y-2">
                    {projectDependencies.map((dependency) => (
                      <div
                        key={`${dependency.name}-${dependency.url ?? dependency.source}`}
                        className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
                      >
                        <p className="text-sm font-medium text-foreground">{dependency.name}</p>
                        <p className="text-label uppercase tracking-[0.12em] text-muted-foreground">
                          {dependency.version
                            ? `${dependency.source} · ${dependency.version}`
                            : dependency.source}
                        </p>
                        {dependency.purpose && (
                          <p className="mt-1 text-xs text-muted-foreground">{dependency.purpose}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border/60 bg-background/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Code state
              </p>
              <div className="mt-3 space-y-3 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <span>Selected file</span>
                  <span className="font-medium">{selectedFile?.language ?? 'none'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Unsaved edits</span>
                  <span className="font-medium">{isDirty ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Preview sync</span>
                  <span className="font-medium">
                    {selectedFile ? 'Updates on save' : 'Waiting for file'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Dirty files</span>
                  <span className="font-medium">{Object.keys(drafts).length}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-border/60 bg-background/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Snapshots
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={onCreateSnapshot}
                >
                  <Save className="h-3.5 w-3.5" />
                  Create snapshot
                </Button>
              </div>
              {projectSnapshots.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No snapshots yet. Create one before risky manual edits.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {projectSnapshots.slice(0, 5).map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="rounded-xl border border-border/60 bg-muted/30 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {snapshot.label}
                          </p>
                          <p className="text-label uppercase tracking-[0.12em] text-muted-foreground">
                            {snapshot.source} · {new Date(snapshot.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onRestoreSnapshot(snapshot.id)}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-border/60 bg-background/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Selected file diff
              </p>
              {!selectedFile ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Select a file to compare it against the last saved build.
                </p>
              ) : !selectedBaselineFile ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  This file is new in the current project and has no saved baseline yet.
                </p>
              ) : !selectedChangeStatus ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  This file matches the last saved build.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-border/60 bg-muted/30 px-2 py-3">
                      <p className="text-lg font-semibold text-foreground">{selectedDiffStats.added}</p>
                      <p className="text-label uppercase tracking-[0.12em] text-muted-foreground">Added</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 px-2 py-3">
                      <p className="text-lg font-semibold text-foreground">{selectedDiffStats.changed}</p>
                      <p className="text-label uppercase tracking-[0.12em] text-muted-foreground">Changed</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-muted/30 px-2 py-3">
                      <p className="text-lg font-semibold text-foreground">{selectedDiffStats.removed}</p>
                      <p className="text-label uppercase tracking-[0.12em] text-muted-foreground">Removed</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Compared with the last generated or imported baseline for <span className="font-medium text-foreground">{selectedFile.path}</span>.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-border/60 bg-background/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Change summary
              </p>
              {codeChanges.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No code changes since the last generated or imported baseline.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {codeChanges.map((change) => (
                    <div
                      key={change.path}
                      className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {change.path}
                      </p>
                      <p className="text-xs uppercase tracking-[0.12em] text-warning">
                        {change.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
