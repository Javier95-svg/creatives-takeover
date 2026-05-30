import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Database, Github, Loader2, RefreshCw, ShieldAlert, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  GitHubConnectionState,
  GitHubRepositorySummary,
  GitHubRepoSession,
  SupabaseConnectionState,
  SupabaseProjectSummary,
} from '@/hooks/useMVPBuilder';
import type { MVPBuilderIntegrationsHealth, MVPIntegrationStatus } from '@/lib/mvp-builder/integrations';

interface MVPBuilderIntegrationPanelProps {
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

const STATUS_LABEL: Record<MVPIntegrationStatus, string> = {
  disconnected: 'Not connected',
  connecting: 'Connecting',
  connected: 'Connected',
  syncing: 'Syncing',
  expired: 'Re-auth needed',
  error: 'Error',
};

function StatusBadge({ status }: { status: MVPIntegrationStatus }) {
  const healthy = status === 'connected';
  const warn = status === 'expired' || status === 'error';
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 text-[11px]',
        healthy && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
        warn && 'border-amber-300/30 bg-amber-300/10 text-amber-100',
        !healthy && !warn && 'border-white/10 bg-white/5 text-slate-400'
      )}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export const MVPBuilderIntegrationPanel: React.FC<MVPBuilderIntegrationPanelProps> = ({
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
  const [selectedRepo, setSelectedRepo] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const githubStatus = integrations.github.status;
  const supabaseStatus = integrations.supabase.status;

  const selectedRepoMeta = useMemo(
    () => githubRepositories.find((r) => r.fullName === selectedRepo) ?? null,
    [githubRepositories, selectedRepo]
  );

  useEffect(() => {
    if (githubConnection.connected && githubRepositories.length === 0) {
      void onLoadGitHubRepositories();
    }
  }, [githubConnection.connected, githubRepositories.length, onLoadGitHubRepositories]);

  useEffect(() => {
    if (!selectedRepo && githubRepositories.length > 0) {
      const main = githubRepositories.find((r) => r.defaultBranch === 'main') ?? githubRepositories[0];
      setSelectedRepo(main.fullName);
    }
  }, [githubRepositories, selectedRepo]);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-white">Integrations</h2>
        <p className="text-xs leading-relaxed text-slate-400">
          Connect GitHub to push code to a repo and Supabase to manage your backend. Both are optional — the builder works without them.
        </p>
      </div>

      {/* GitHub Card */}
      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20">
              <Github className="h-4.5 w-4.5 text-white" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">GitHub</p>
              <p className="text-[11px] text-slate-400">
                {githubRepoSession
                  ? `${githubRepoSession.fullName} · main`
                  : githubConnection.connected
                  ? 'Select a repository to link'
                  : 'Push generated code to a repo'}
              </p>
            </div>
          </div>
          <StatusBadge status={githubStatus} />
        </div>

        {(githubStatus === 'error' || githubStatus === 'expired') && githubConnection.lastError && (
          <div className="mb-3 flex gap-2 rounded-lg border border-amber-300/20 bg-amber-300/10 p-2.5 text-xs text-amber-100">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{githubConnection.lastError}</span>
          </div>
        )}

        {githubRepoSession ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>Connected to <strong>{githubRepoSession.fullName}</strong> · main branch</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefreshGitHub}
              disabled={isGitHubBusy}
              className="h-7 gap-1.5 px-2 text-xs text-slate-400 hover:text-white"
            >
              <Unplug className="h-3 w-3" />
              Disconnect
            </Button>
          </div>
        ) : githubConnection.connected ? (
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <label className="flex-1 space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Repository</span>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  disabled={isGitHubBusy}
                  className="h-8 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400/30"
                >
                  <option value="">Select repository</option>
                  {githubRepositories.map((r) => (
                    <option key={r.id} value={r.fullName}>{r.fullName}</option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLoadGitHubRepositories}
                disabled={isGitHubBusy}
                className="h-8 border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            {selectedRepoMeta?.defaultBranch && selectedRepoMeta.defaultBranch !== 'main' && (
              <p className="text-[11px] text-amber-200">
                Default branch is <code>{selectedRepoMeta.defaultBranch}</code> — import will use main.
              </p>
            )}
            <Button
              type="button"
              onClick={() => onImportGitHubRepository(selectedRepo, 'main')}
              disabled={!selectedRepo || isGitHubBusy}
              className="h-8 w-full gap-2 text-sm"
            >
              {isGitHubBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
              Import main branch
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={onConnectGitHub}
            disabled={isGitHubBusy}
            className="h-8 w-full gap-2 text-sm"
          >
            {isGitHubBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
            Connect GitHub
          </Button>
        )}
      </section>

      {/* Supabase Card */}
      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/20">
              <Database className="h-4.5 w-4.5 text-white" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Supabase</p>
              <p className="text-[11px] text-slate-400">
                {supabaseConnection.project?.ref
                  ? `${supabaseConnection.project.ref}.supabase.co`
                  : 'Paste your project URL and service role key'}
              </p>
            </div>
          </div>
          <StatusBadge status={supabaseStatus} />
        </div>

        {(supabaseStatus === 'error' || supabaseStatus === 'expired') && supabaseConnection.lastError && (
          <div className="mb-3 flex gap-2 rounded-lg border border-amber-300/20 bg-amber-300/10 p-2.5 text-xs text-amber-100">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{supabaseConnection.lastError}</span>
          </div>
        )}

        {supabaseStatus === 'connected' && supabaseConnection.project ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>Connected to <strong>{supabaseConnection.project.ref}.supabase.co</strong></span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefreshSupabase}
              disabled={isSupabaseBusy}
              className="h-7 gap-1.5 px-2 text-xs text-slate-400 hover:text-white"
            >
              <Unplug className="h-3 w-3" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Project URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxxxxxxxxxx.supabase.co"
                disabled={isSupabaseBusy}
                className="h-8 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 text-sm text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sky-400/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Service Role Key
              </label>
              <div className="relative">
                <input
                  ref={keyInputRef}
                  type={showKey ? 'text' : 'password'}
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp..."
                  disabled={isSupabaseBusy}
                  className="h-8 w-full rounded-lg border border-white/10 bg-[#0b1020] px-3 pr-14 text-sm text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-sky-400/30"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-white"
                >
                  {showKey ? 'hide' : 'show'}
                </button>
              </div>
              <p className="text-[10px] text-slate-600">
                Found in Supabase Dashboard → Project Settings → API → service_role key
              </p>
            </div>
            <Button
              type="button"
              onClick={() => onSaveSupabaseCredentials(supabaseUrl, supabaseKey)}
              disabled={!supabaseUrl.trim() || !supabaseKey.trim() || isSupabaseBusy}
              className="h-8 w-full gap-2 text-sm"
            >
              {isSupabaseBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              Connect Supabase
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};
