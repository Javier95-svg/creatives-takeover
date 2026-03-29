import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Download,
  Copy,
  Monitor,
  Smartphone,
  Check,
  Loader2,
  Wand2,
  Globe,
  Code2,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MVPBuilderDomainPanel } from './MVPBuilderDomainPanel';
import { MVPBuilderCodePanel } from './MVPBuilderCodePanel';
import type {
  MVPPreviewResult,
  MVPProjectDependency,
  MVPProjectFile,
  MVPProjectFramework,
  MVPProjectSnapshot,
  MVPProjectType,
} from '@/lib/mvp-builder/project';

const LOADING_STEPS = [
  'Understanding prompt...',
  'Planning file structure...',
  'Writing the build...',
  'Almost ready...',
];

type PreviewTab = 'preview' | 'code' | 'domain';

interface MVPBuilderPreviewProps {
  html: string | null;
  isGenerating: boolean;
  projectId: string;
  projectFiles: MVPProjectFile[];
  baselineFiles: MVPProjectFile[];
  projectFramework: MVPProjectFramework;
  projectType: MVPProjectType;
  projectSummary: string;
  projectDependencies: MVPProjectDependency[];
  projectSnapshots: MVPProjectSnapshot[];
  previewState: MVPPreviewResult;
  entryFilePath: string;
  selectedCodeFilePath: string | null;
  codeChanges: Array<{ path: string; status: 'added' | 'modified' }>;
  isShowingPreviewFallback: boolean;
  onSelectCodeFile: (path: string) => void;
  onSaveCodeFile: (path: string, content: string) => void;
  onResetCodeFile: (path: string) => void;
  onResetProjectCode: () => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onSelectEntryFile: (path: string) => void;
}

export const MVPBuilderPreview: React.FC<MVPBuilderPreviewProps> = ({
  html,
  isGenerating,
  projectId,
  projectFiles,
  baselineFiles,
  projectFramework,
  projectType,
  projectSummary,
  projectDependencies,
  projectSnapshots,
  previewState,
  entryFilePath,
  selectedCodeFilePath,
  codeChanges,
  isShowingPreviewFallback,
  onSelectCodeFile,
  onSaveCodeFile,
  onResetCodeFile,
  onResetProjectCode,
  onCreateSnapshot,
  onRestoreSnapshot,
  onSelectEntryFile,
}) => {
  const [previewKey, setPreviewKey] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<PreviewTab>('preview');
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0);
      return;
    }
    const id = setInterval(() => {
      setLoadingStep((step) => (step + 1) % LOADING_STEPS.length);
    }, 1400);
    return () => clearInterval(id);
  }, [isGenerating]);

  useEffect(() => {
    setRuntimeError(null);
  }, [html, previewKey, projectId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data;
      if (!payload || payload.source !== 'ct-mvp-builder-runtime') return;

      if (payload.type === 'build-log') {
        const level =
          payload.payload?.level === 'warn' || payload.payload?.level === 'error'
            ? payload.payload.level
            : 'info';
        const message =
          typeof payload.payload?.message === 'string'
            ? payload.payload.message
            : 'Build event';
        if (level === 'error') {
          setRuntimeError(message);
        }
        return;
      }

      if (payload.type === 'runtime-error') {
        const message =
          typeof payload.payload?.message === 'string'
            ? payload.payload.message
            : 'Runtime error';
        setRuntimeError(message);
        return;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const htmlEntryOptions = useMemo(
    () => projectFiles.filter((file) => file.path.toLowerCase().endsWith('.html')),
    [projectFiles]
  );

  const handleRefresh = () => setPreviewKey((key) => key + 1);

  const handleExport = useCallback(() => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = entryFilePath || 'preview.html';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Preview HTML downloaded');
  }, [entryFilePath, html]);

  const handleCopy = useCallback(async () => {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      toast.success('Preview HTML copied');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy the preview HTML');
    }
  }, [html]);

  const statusBadge = isGenerating ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
      Building...
    </span>
  ) : previewState.canPreview && html ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
      {previewState.runtimeMode === 'sandbox' ? 'Sandbox ready' : 'Preview ready'}
    </span>
  ) : projectFiles.length > 0 ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
      <TriangleAlert className="h-3 w-3" />
      Code-only preview
    </span>
  ) : (
    <span className="text-xs font-medium text-muted-foreground">Workspace</span>
  );

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-border/40 bg-background/80 px-3 h-10 shrink-0">
          <div className="flex items-center rounded-full bg-muted p-0.5">
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                'h-6 rounded-full px-3 text-xs font-medium transition-all duration-200 flex items-center gap-1.5',
                activeTab === 'preview'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Monitor className="h-3 w-3" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={cn(
                'h-6 rounded-full px-3 text-xs font-medium transition-all duration-200 flex items-center gap-1.5',
                activeTab === 'code'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Code2 className="h-3 w-3" />
              Code
            </button>
            <button
              onClick={() => setActiveTab('domain')}
              className={cn(
                'h-6 rounded-full px-3 text-xs font-medium transition-all duration-200 flex items-center gap-1.5',
                activeTab === 'domain'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Globe className="h-3 w-3" />
              Domain
            </button>
          </div>

          {statusBadge}

          {activeTab === 'preview' ? (
            <div className="flex items-center gap-1">
              {htmlEntryOptions.length > 1 && (
                <select
                  value={entryFilePath}
                  onChange={(event) => onSelectEntryFile(event.target.value)}
                  className="mr-2 h-7 rounded-full border border-border bg-muted/70 px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {htmlEntryOptions.map((file) => (
                    <option key={file.path} value={file.path}>
                      {file.path}
                    </option>
                  ))}
                </select>
              )}

              <div className="mr-1 flex items-center rounded-full bg-muted p-0.5">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={cn(
                    'flex h-6 w-7 items-center justify-center rounded-full transition-all duration-200',
                    viewMode === 'desktop'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={cn(
                    'flex h-6 w-7 items-center justify-center rounded-full transition-all duration-200',
                    viewMode === 'mobile'
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 px-1 py-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleRefresh}
                      disabled={!html}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh preview</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopy}
                      disabled={!html}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy preview HTML</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-xs"
                      onClick={handleExport}
                      disabled={!html}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export HTML
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download the rendered preview HTML</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : activeTab === 'code' ? (
            <div className="text-xs text-muted-foreground">
              {projectFiles.length} files
            </div>
          ) : (
            <div className="w-24" />
          )}
        </div>

        {activeTab === 'domain' && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <MVPBuilderDomainPanel projectId={projectId} />
          </div>
        )}

        {activeTab === 'code' && (
          <div className="min-h-0 flex-1">
            <MVPBuilderCodePanel
              files={projectFiles}
              baselineFiles={baselineFiles}
              projectFramework={projectFramework}
              projectType={projectType}
              projectSummary={projectSummary}
              projectDependencies={projectDependencies}
              projectSnapshots={projectSnapshots}
              selectedFilePath={selectedCodeFilePath}
              entryFilePath={entryFilePath}
              codeChanges={codeChanges}
              isGenerating={isGenerating}
              onSelectFile={onSelectCodeFile}
              onSaveFile={onSaveCodeFile}
              onResetFile={onResetCodeFile}
              onResetProject={onResetProjectCode}
              onCreateSnapshot={onCreateSnapshot}
              onRestoreSnapshot={onRestoreSnapshot}
              onSelectEntryFile={onSelectEntryFile}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div
              className={cn(
                'flex flex-1 min-h-0 items-center justify-center overflow-hidden',
                viewMode === 'mobile' ? 'bg-muted/20 p-4' : 'bg-muted/10 p-0'
              )}
              style={
                !html
                  ? {
                      backgroundImage:
                        'radial-gradient(circle, hsl(var(--border)/0.6) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }
                  : undefined
              }
            >
            {!html && !isGenerating && projectFiles.length === 0 && (
              <div className="select-none px-8 py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/20 to-primary/5">
                  <Wand2 className="h-8 w-8 text-primary/50" />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Your product will appear here
                  </p>
                </div>
              </div>
            )}

            {!html && !isGenerating && projectFiles.length > 0 && (
              <div className="mx-6 max-w-xl rounded-3xl border border-border/60 bg-background/95 p-6 text-left shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-amber-500/10 p-2 text-amber-600">
                    <TriangleAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Preview needs a runtime entry
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This project&apos;s code is available in the Code tab, but the builder could not find a previewable HTML or framework entry point yet.
                    </p>
                    <div className="mt-4">
                      <Button size="sm" className="gap-1.5" onClick={() => setActiveTab('code')}>
                        <Code2 className="h-3.5 w-3.5" />
                        Open Code tab
                      </Button>
                    </div>
                    {previewState.errors.length > 0 && (
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {previewState.errors.map((error) => (
                          <li key={error}>• {error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!html && isGenerating && (
              <div className="px-8 py-12 text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                <div className="mt-4 space-y-1">
                  <p className="text-sm font-medium">{LOADING_STEPS[loadingStep]}</p>
                  <p className="text-xs text-muted-foreground">
                    This usually takes 15-30 seconds
                  </p>
                </div>
              </div>
            )}

            {html && (
              <div
                className={cn(
                  'relative h-full transition-all duration-300',
                  viewMode === 'desktop'
                    ? 'w-full'
                    : 'w-[375px] overflow-hidden rounded-xl shadow-2xl'
                )}
              >
                {(previewState.warnings.length > 0 || isShowingPreviewFallback) && (
                  <div className="absolute left-4 right-4 top-4 z-20 space-y-2">
                    {isShowingPreviewFallback && (
                      <div className="rounded-2xl border border-amber-500/25 bg-background/95 px-4 py-3 text-sm text-amber-700 shadow-lg backdrop-blur">
                        Showing the last working preview because the latest code cannot be rendered safely yet.
                      </div>
                    )}
                    {previewState.warnings.map((warning) => (
                      <div
                        key={warning}
                        className="rounded-2xl border border-border/60 bg-background/95 px-4 py-3 text-sm text-muted-foreground shadow-lg backdrop-blur"
                      >
                        {warning}
                      </div>
                    ))}
                  </div>
                )}

                {runtimeError && !isGenerating && (
                  <div className="absolute left-4 right-4 top-4 z-20">
                    <div className="rounded-2xl border border-red-500/25 bg-background/95 px-4 py-3 text-sm text-red-700 shadow-lg backdrop-blur">
                      {runtimeError}
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating preview...
                    </div>
                  </div>
                )}

                <iframe
                  key={previewKey}
                  srcDoc={html}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  className={cn(
                    'h-full w-full border-0',
                    viewMode === 'mobile' && 'rounded-xl'
                  )}
                  title="App Preview"
                />
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
