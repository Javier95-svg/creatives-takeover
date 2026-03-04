import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCredits } from '@/hooks/useCredits';

interface MVPBuilderHeaderProps {
  projectName: string;
  setProjectName: (name: string) => void;
  onNewProject: () => void;
}

export const MVPBuilderHeader: React.FC<MVPBuilderHeaderProps> = ({
  projectName,
  setProjectName,
  onNewProject,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);
  const { balance, monthlyQuota } = useCredits();

  const totalCredits = (balance ?? 0) + (monthlyQuota ?? 0);

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

  return (
    <>
      <header className="relative flex items-center justify-between px-5 h-13 col-span-2 shrink-0 bg-primary/[0.07] backdrop-blur-2xl border-b border-primary/15 overflow-hidden"
        style={{ height: '52px' }}
      >
        {/* Subtle radial glow behind center */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-96 h-12 bg-primary/10 rounded-full blur-3xl" />
        </div>

        {/* Left: back link */}
        <Link
          to="/"
          className="relative flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Platform
        </Link>

        {/* Center: editable project name */}
        <div className="relative flex items-center gap-1.5">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                className="h-7 w-48 text-sm text-center px-2 py-0 bg-background/60 border-primary/30 focus-visible:ring-primary/30"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-foreground/70 hover:text-foreground" onClick={commit}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setDraft(projectName);
                setIsEditing(true);
              }}
              className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity group bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
            >
              {projectName}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity text-foreground" />
            </button>
          )}
        </div>

        {/* Right: credits pill + new project */}
        <div className="relative flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 bg-primary/15 border border-primary/25 text-primary text-xs px-2.5 py-0.5 rounded-full font-medium backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            {totalCredits} credits
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 bg-background/30 border-border/40 hover:bg-background/50 backdrop-blur-sm"
            onClick={onNewProject}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </header>
      {/* Gradient bottom border */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent shrink-0" />
    </>
  );
};
