import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Check, Database, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getMVPModelLabel } from '@/data/mvpModels';
import { cn } from '@/lib/utils';
import type { MVPBuilderIntegrationsHealth, MVPIntegrationStatus } from '@/lib/mvp-builder/integrations';

interface MVPBuilderHeaderProps {
  projectName: string;
  setProjectName: (name: string) => void;
  selectedModels: string[];
  creditsAvailable: number;
  integrations: MVPBuilderIntegrationsHealth;
  onNewProject: () => void;
}

export const MVPBuilderHeader: React.FC<MVPBuilderHeaderProps> = ({
  projectName,
  setProjectName,
  selectedModels,
  creditsAvailable,
  integrations,
  onNewProject,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);
  const primaryModelLabel = getMVPModelLabel(selectedModels[0]) ?? 'AI model';
  const additionalModels = Math.max(selectedModels.length - 1, 0);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

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
          'hidden lg:flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
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

  return (
    <>
      <header className="relative flex items-center justify-between px-5 h-13 col-span-2 shrink-0 bg-[#060b16]/96 backdrop-blur-2xl border-b border-white/8 overflow-hidden"
        style={{ height: '52px' }}
      >
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-14 w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_65%)] blur-3xl" />
        </div>

        <Link
          to="/"
          className="relative flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Platform
        </Link>

        <div className="relative flex items-center gap-1.5">
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
              onClick={() => {
                setDraft(projectName);
                setIsEditing(true);
              }}
              className="group flex items-center gap-1.5 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-sm font-semibold text-transparent transition-opacity hover:opacity-80"
            >
              {projectName}
              <Pencil className="h-3 w-3 text-white opacity-0 transition-opacity group-hover:opacity-40" />
            </button>
          )}
        </div>

        <div className="relative flex items-center gap-2">
          {renderStatusChip('GitHub', integrations.github.status, Github)}
          {renderStatusChip('Supabase', integrations.supabase.status, Database)}
          <span className="hidden md:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
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
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-white/10 bg-white/5 text-xs text-white hover:bg-white/10 hover:text-white backdrop-blur-sm"
            onClick={onNewProject}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </header>
      <div className="h-px shrink-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </>
  );
};
