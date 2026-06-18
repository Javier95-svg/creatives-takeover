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
  TerminalSquare,
  Link2,
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
import { MVPBuilderPublishPanel } from './MVPBuilderPublishPanel';
import { MVPBuilderCodePanel } from './MVPBuilderCodePanel';
import { MVPBuilderIntegrationPanel } from './MVPBuilderIntegrationPanel';
import type {
  GitHubConnectionState,
  GitHubRepositorySummary,
  GitHubRepoSession,
  SupabaseConnectionState,
  SupabaseProjectSummary,
} from '@/hooks/useMVPBuilder';
import type { MVPBuilderIntegrationsHealth } from '@/lib/mvp-builder/integrations';
import type {
  MVPPreviewResult,
  MVPProjectDependency,
  MVPProjectFile,
  MVPProjectFramework,
  MVPProjectSnapshot,
  MVPProjectType,
} from '@/lib/mvp-builder/project';
import { mvpWebContainerRuntime, type MVPWebContainerState } from '@/lib/mvp-builder/webcontainerRuntime';
import { CREDIT_COSTS } from '@/config/constants';

const LOADING_STEPS = [
  'Understanding prompt...',
  'Planning file structure...',
  'Writing the build...',
  'Almost ready...',
];

const INITIAL_WEB_CONTAINER_STATE: MVPWebContainerState = {
  status: 'idle',
  previewUrl: null,
  error: null,
  logs: [],
};

type PreviewTab = 'preview' | 'code' | 'domain' | 'integrations';

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
  deploymentUrl: string | null;
  isDeploying: boolean;
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
  onExportZip: () => void;
  onDeploy: () => void;
  // Integrations (optional)
  integrations: MVPBuilderIntegrationsHealth;
  githubConnection: GitHubConnectionState;
  githubRepositories: GitHubRepositorySummary[];
  githubRepoSession: GitHubRepoSession | null;
  isGitHubBusy: boolean;
  supabaseConnection: SupabaseConnectionState;
  supabaseProjects: SupabaseProjectSummary[];
  isSupabaseBusy: boolean;
  onConnectGitHub: () => void | Promise<void>;
  onLoadGitHubRepositories: () => void | Promise<void>;
  onImportGitHubRepository: (fullName: string, branch?: string) => void | Promise<void>;
  onSaveSupabaseCredentials: (projectUrl: string, serviceRoleKey: string) => void | Promise<void>;
  onRefreshGitHub: () => void | Promise<void>;
  onRefreshSupabase: () => void | Promise<void>;
}

// Make any generated HTML render reliably in the sandboxed preview:
// 1) guard `tailwind.config = ...` so it never throws "tailwind is not defined"
//    when the CDN hasn't initialized yet (the page would otherwise look unstyled),
// 2) guarantee the Tailwind Play CDN is present and loads first.
function hardenPreviewHtml(rawHtml: string | null | undefined): string {
  if (!rawHtml || typeof rawHtml !== 'string') return rawHtml ?? '';
  let out = rawHtml;

  // Guard the `tailwind` global so a premature config assignment can't crash the page.
  out = out.replace(
    /\btailwind\.config\s*=/g,
    'window.tailwind=window.tailwind||{};window.tailwind.config='
  );

  // Ensure the Tailwind CDN is loaded (inject as the first <head> child if missing).
  if (!/cdn\.tailwindcss\.com/.test(out)) {
    const cdnTag = '<script src="https://cdn.tailwindcss.com"></script>';
    if (/<head[^>]*>/i.test(out)) {
      out = out.replace(/<head[^>]*>/i, (m) => `${m}\n    ${cdnTag}`);
    } else if (/<html[^>]*>/i.test(out)) {
      out = out.replace(/<html[^>]*>/i, (m) => `${m}\n  <head>${cdnTag}</head>`);
    } else {
      out = `${cdnTag}\n${out}`;
    }
  }

  return out;
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
  deploymentUrl,
  isDeploying,
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
  onExportZip,
  onDeploy,
  integrations,
  githubConnection,
  githubRepositories,
  githubRepoSession,
  isGitHubBusy,
  supabaseConnection,
  supabaseProjects,
  isSupabaseBusy,
  onConnectGitHub,
  onLoadGitHubRepositories,
  onImportGitHubRepository,
  onSaveSupabaseCredentials,
  onRefreshGitHub,
  onRefreshSupabase,
}) => {
  const [previewKey, setPreviewKey] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<PreviewTab>('preview');
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [webContainerState, setWebContainerState] = useState<MVPWebContainerState>(INITIAL_WEB_CONTAINER_STATE);

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
    return mvpWebContainerRuntime.subscribe(setWebContainerState);
  }, []);

  useEffect(() => {
    if (projectFramework !== 'react-vite' || isGenerating || projectFiles.length === 0) return;
    const timer = window.setTimeout(() => {
      void mvpWebContainerRuntime.start(projectFiles, { devCommand: 'npm run dev', port: 5173 });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [isGenerating, projectFiles, projectFramework, previewKey]);

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

  const previewHtml = useMemo(() => hardenPreviewHtml(html), [html]);

  const handleRefresh = () => setPreviewKey((key) => key + 1);

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
    <span className="flex items-center gap-1.5 text-xs font-medium text-warning">
      <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse shrink-0" />
      Building...
    </span>
  ) : projectFramework === 'react-vite' && webContainerState.status === 'ready' ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
      WebContainer ready
    </span>
  ) : projectFramework === 'react-vite' && ['booting', 'mounting', 'installing', 'starting'].includes(webContainerState.status) ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-warning">
      <Loader2 className="h-3 w-3 animate-spin" />
      {webContainerState.status}
    </span>
  ) : previewState.canPreview && html ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" />
      {previewState.runtimeMode === 'sandbox' ? 'Sandbox ready' : 'Preview ready'}
    </span>
  ) : projectFiles.length > 0 ? (
    <span className="flex items-center gap-1.5 text-xs font-medium text-warning">
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
            <button
              onClick={() => setActiveTab('integrations')}
              className={cn(
                'h-6 rounded-full px-3 text-xs font-medium transition-all duration-200 flex items-center gap-1.5',
                activeTab === 'integrations'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Link2 className="h-3 w-3" />
              Integrations
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
                      disabled={!html && projectFramework !== 'react-vite'}
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
                      disabled={!html && projectFramework !== 'react-vite'}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-success" />
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
                      onClick={onExportZip}
                      disabled={!html && projectFramework !== 'react-vite'}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export ZIP
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download the full project as a ZIP</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2 text-xs"
                      onClick={onDeploy}
                      disabled={(!html && projectFramework !== 'react-vite') || isDeploying}
                    >
                      {isDeploying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
                      Publish
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Publish to a public .creatives-takeover.com link for {CREDIT_COSTS.APP_BUILDER_DEPLOY} credits</TooltipContent>
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
            <MVPBuilderPublishPanel projectId={projectId} publishedUrl={deploymentUrl} />
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

        {activeTab === 'integrations' && (
          <div className="min-h-0 flex-1 overflow-y-auto bg-background">
            <MVPBuilderIntegrationPanel
              integrations={integrations}
              githubConnection={githubConnection}
              githubRepositories={githubRepositories}
              githubRepoSession={githubRepoSession}
              isGitHubBusy={isGitHubBusy}
              supabaseConnection={supabaseConnection}
              supabaseProjects={supabaseProjects}
              isSupabaseBusy={isSupabaseBusy}
              onConnectGitHub={onConnectGitHub}
              onLoadGitHubRepositories={onLoadGitHubRepositories}
              onImportGitHubRepository={onImportGitHubRepository}
              onSaveSupabaseCredentials={onSaveSupabaseCredentials}
              onRefreshGitHub={onRefreshGitHub}
              onRefreshSupabase={onRefreshSupabase}
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

            {!html && projectFramework !== 'react-vite' && !isGenerating && projectFiles.length > 0 && (
              <div className="mx-6 max-w-xl rounded-3xl border border-border/60 bg-background/95 p-6 text-left shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-2xl bg-warning/10 p-2 text-warning">
                    <TriangleAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Preview needs a runtime entry
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This project&apos;s code is available in the Code tab, but the builder could not find a previewable HTML or running framework entry point yet.
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

            {(html || projectFramework === 'react-vite') && (
              projectFramework === 'react-vite' ? (
                <div className="flex h-full w-full flex-col bg-slate-950 text-muted-foreground">
                  {webContainerState.previewUrl ? (
                    <iframe
                      key={`${previewKey}-${webContainerState.previewUrl}`}
                      title="MVP Builder WebContainer Preview"
                      src={webContainerState.previewUrl}
                      className="h-full w-full border-0 bg-white"
                      sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                    />
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-6 text-center">
                      <div className="max-w-md">
                        {webContainerState.status === 'unsupported' ? (
                          <TriangleAlert className="mx-auto h-10 w-10 text-warning" />
                        ) : webContainerState.status === 'error' ? (
                          <TriangleAlert className="mx-auto h-10 w-10 text-destructive" />
                        ) : (
                          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                        )}
                        <p className="mt-4 text-sm font-medium">
                          {webContainerState.error || 'Starting React/Vite preview...'}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          WebContainer installs dependencies and runs the Vite dev server in your browser.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="max-h-40 overflow-y-auto border-t border-white/10 bg-black/70 px-3 py-2 font-mono text-label">
                    <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                      <TerminalSquare className="h-3.5 w-3.5" />
                      Runtime logs
                    </div>
                    {webContainerState.logs.length === 0 ? (
                      <div className="text-muted-foreground">No runtime logs yet.</div>
                    ) : (
                      webContainerState.logs.slice(-8).map((log) => (
                        <div
                          key={log.id}
                          className={cn(
                            'truncate',
                            log.level === 'error'
                              ? 'text-destructive'
                              : log.level === 'warn'
                              ? 'text-warning'
                              : 'text-muted-foreground'
                          )}
                        >
                          {log.message}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
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
                      <div className="rounded-2xl border border-warning/25 bg-background/95 px-4 py-3 text-sm text-warning shadow-lg backdrop-blur">
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
                    <div className="rounded-2xl border border-destructive/25 bg-background/95 px-4 py-3 text-sm text-destructive shadow-lg backdrop-blur">
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
                  srcDoc={previewHtml}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups"
                  className={cn(
                    'h-full w-full border-0',
                    viewMode === 'mobile' && 'rounded-xl'
                  )}
                  title="App Preview"
                />
              </div>
              )
            )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
