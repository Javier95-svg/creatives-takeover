import React, { useEffect, useMemo, useState } from 'react';
import { Check, Database, Github, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type {
  GitHubConnectionState,
  GitHubRepositorySummary,
  GitHubRepoSession,
  SupabaseConnectionState,
  SupabaseProjectSummary,
} from '@/hooks/useMVPBuilder';
import type { MVPBuilderIntegrationsHealth, MVPIntegrationStatus } from '@/lib/mvp-builder/integrations';

interface MVPBuilderIntegrationGateProps {
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
  onConnectSupabase: () => void | Promise<void>;
  onLoadSupabaseProjects: () => void | Promise<void>;
  onSelectSupabaseProject: (projectRef: string) => void | Promise<void>;
  onRefreshGitHub: () => void | Promise<void>;
  onRefreshSupabase: () => void | Promise<void>;
}

const statusCopy: Record<MVPIntegrationStatus, string> = {
  disconnected: 'Not connected',
  connecting: 'Connecting',
  connected: 'Connected',
  syncing: 'Syncing',
  expired: 'Re-auth required',
  error: 'Needs attention',
};

function StatusBadge({ status }: { status: MVPIntegrationStatus }) {
  const healthy = status === 'connected';
  return (
    <Badge
      variant={healthy ? 'secondary' : 'outline'}
      className={cn(
        'shrink-0',
        healthy && 'border-success/30 bg-success/10 text-success',
        status === 'expired' && 'border-warning/30 bg-warning/10 text-warning',
        status === 'error' && 'border-destructive/30 bg-destructive/10 text-destructive'
      )}
    >
      {statusCopy[status]}
    </Badge>
  );
}

export const MVPBuilderIntegrationGate: React.FC<MVPBuilderIntegrationGateProps> = ({
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
  onConnectSupabase,
  onLoadSupabaseProjects,
  onSelectSupabaseProject,
  onRefreshGitHub,
  onRefreshSupabase,
}) => {
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedProjectRef, setSelectedProjectRef] = useState('');

  const githubReady = integrations.github.status === 'connected';
  const supabaseReady = integrations.supabase.status === 'connected';
  const selectedRepoMeta = useMemo(
    () => githubRepositories.find((repo) => repo.fullName === selectedRepo) ?? null,
    [githubRepositories, selectedRepo]
  );

  useEffect(() => {
    if (githubConnection.connected && githubRepositories.length === 0) {
      void onLoadGitHubRepositories();
    }
  }, [githubConnection.connected, githubRepositories.length, onLoadGitHubRepositories]);

  useEffect(() => {
    if (supabaseConnection.connected && supabaseProjects.length === 0) {
      void onLoadSupabaseProjects();
    }
  }, [onLoadSupabaseProjects, supabaseConnection.connected, supabaseProjects.length]);

  useEffect(() => {
    if (!selectedRepo && githubRepositories.length > 0) {
      const mainRepo = githubRepositories.find((repo) => repo.defaultBranch === 'main') ?? githubRepositories[0];
      setSelectedRepo(mainRepo.fullName);
    }
  }, [githubRepositories, selectedRepo]);

  useEffect(() => {
    if (!selectedProjectRef && supabaseProjects.length > 0) {
      setSelectedProjectRef(supabaseProjects[0].ref);
    }
  }, [selectedProjectRef, supabaseProjects]);

  return (
    <div className="absolute inset-x-0 top-13 bottom-0 z-40 bg-surface-deep/95 backdrop-blur-xl">
      <ScrollArea className="h-full">
        <div className="mx-auto flex min-h-[calc(100vh-53px)] w-full max-w-5xl flex-col justify-center px-4 py-8">
          <div className="mb-6 space-y-2">
            <Badge className="border-info/20 bg-info/10 text-info">MVP Builder setup</Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Connect your repo and backend before building
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The builder syncs code to GitHub main and manages Supabase infrastructure from this workspace. Both connections stay attached to this build session.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/20 text-white">
                    <Github className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-white">GitHub repository</h2>
                    <p className="text-xs text-muted-foreground">
                      {githubRepoSession ? githubRepoSession.fullName : 'Install the GitHub App and import main.'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={integrations.github.status} />
              </div>

              {githubConnection.lastError && (
                <div className="mb-3 flex gap-2 rounded-md border border-warning/20 bg-warning/10 p-2 text-xs text-warning">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {githubConnection.lastError}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={githubConnection.connected ? onRefreshGitHub : onConnectGitHub}
                  disabled={isGitHubBusy}
                  className="h-9 w-full justify-center gap-2"
                >
                  {isGitHubBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                  {githubConnection.connected ? 'Refresh GitHub status' : 'Connect GitHub App'}
                </Button>

                {githubConnection.connected && (
                  <>
                    <div className="flex items-end gap-2">
                      <label className="flex-1 space-y-1.5">
                        <span className="text-label font-medium uppercase text-muted-foreground">Repository</span>
                        <select
                          value={selectedRepo}
                          onChange={(event) => setSelectedRepo(event.target.value)}
                          disabled={isGitHubBusy}
                          className="h-9 w-full rounded-md border border-white/10 bg-card px-3 text-sm text-white outline-none focus:ring-2 focus:ring-info/40"
                        >
                          <option value="">Select repository</option>
                          {githubRepositories.map((repo) => (
                            <option key={repo.id} value={repo.fullName}>
                              {repo.fullName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 border-white/10 bg-white/5 text-white hover:bg-white/10"
                        onClick={onLoadGitHubRepositories}
                        disabled={isGitHubBusy}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="rounded-md border border-white/10 bg-black/20 p-2 text-xs text-muted-foreground">
                      Branch is locked to <span className="font-mono text-muted-foreground">main</span>. Repositories without a main branch need one before import.
                      {selectedRepoMeta?.defaultBranch && selectedRepoMeta.defaultBranch !== 'main' && (
                        <span className="mt-1 block text-warning">
                          Default branch is {selectedRepoMeta.defaultBranch}; import will still require main.
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={() => onImportGitHubRepository(selectedRepo, 'main')}
                      disabled={!selectedRepo || isGitHubBusy}
                      className="h-9 w-full gap-2"
                    >
                      {githubReady ? <Check className="h-4 w-4" /> : <Github className="h-4 w-4" />}
                      {githubReady ? 'GitHub main connected' : 'Import main branch'}
                    </Button>
                  </>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/20 text-white">
                    <Database className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Supabase project</h2>
                    <p className="text-xs text-muted-foreground">
                      {supabaseConnection.project?.name ?? 'Connect OAuth and select a project.'}
                    </p>
                  </div>
                </div>
                <StatusBadge status={integrations.supabase.status} />
              </div>

              {supabaseConnection.lastError && (
                <div className="mb-3 flex gap-2 rounded-md border border-warning/20 bg-warning/10 p-2 text-xs text-warning">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {supabaseConnection.lastError}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={supabaseConnection.connected ? onRefreshSupabase : onConnectSupabase}
                  disabled={isSupabaseBusy}
                  className="h-9 w-full justify-center gap-2"
                >
                  {isSupabaseBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {supabaseConnection.connected ? 'Refresh Supabase status' : 'Connect Supabase OAuth'}
                </Button>

                {supabaseConnection.connected && (
                  <>
                    <div className="flex items-end gap-2">
                      <label className="flex-1 space-y-1.5">
                        <span className="text-label font-medium uppercase text-muted-foreground">Project</span>
                        <select
                          value={selectedProjectRef}
                          onChange={(event) => setSelectedProjectRef(event.target.value)}
                          disabled={isSupabaseBusy}
                          className="h-9 w-full rounded-md border border-white/10 bg-card px-3 text-sm text-white outline-none focus:ring-2 focus:ring-info/40"
                        >
                          <option value="">Select project</option>
                          {supabaseProjects.map((project) => (
                            <option key={project.ref} value={project.ref}>
                              {project.name} ({project.ref})
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 border-white/10 bg-white/5 text-white hover:bg-white/10"
                        onClick={onLoadSupabaseProjects}
                        disabled={isSupabaseBusy}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="rounded-md border border-white/10 bg-black/20 p-2 text-xs text-muted-foreground">
                      Grants cover project metadata, database schema, auth config, storage, and edge functions. Destructive backend changes require confirmation.
                    </div>

                    <Button
                      type="button"
                      onClick={() => onSelectSupabaseProject(selectedProjectRef)}
                      disabled={!selectedProjectRef || isSupabaseBusy}
                      className="h-9 w-full gap-2"
                    >
                      {supabaseReady ? <Check className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                      {supabaseReady ? 'Supabase project linked' : 'Link Supabase project'}
                    </Button>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

