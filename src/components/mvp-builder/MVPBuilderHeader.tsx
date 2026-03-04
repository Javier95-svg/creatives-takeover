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
      <header className="flex items-center justify-between px-4 h-12 bg-background/95 backdrop-blur-sm col-span-2 shrink-0">
        {/* Left: back link */}
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Platform
        </Link>

        {/* Center: editable project name */}
        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                className="h-7 w-48 text-sm text-center px-2 py-0"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={commit}>
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setDraft(projectName);
                setIsEditing(true);
              }}
              className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity group bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent"
            >
              {projectName}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity text-foreground" />
            </button>
          )}
        </div>

        {/* Right: credits pill + new project */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs px-2.5 py-0.5 rounded-full font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            {totalCredits} credits
          </span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onNewProject}>
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </header>
      {/* Gradient bottom border */}
      <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent shrink-0" />
    </>
  );
};
