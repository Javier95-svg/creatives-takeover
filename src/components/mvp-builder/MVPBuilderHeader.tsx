import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCredits } from '@/hooks/useCredits';
import { Badge } from '@/components/ui/badge';

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
    <header className="flex items-center justify-between px-4 h-12 border-b border-border/50 bg-background/95 backdrop-blur-sm col-span-2 shrink-0">
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
            className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors group"
          >
            {projectName}
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </button>
        )}
      </div>

      {/* Right: credits + new project */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs font-normal hidden sm:flex">
          {totalCredits} credits
        </Badge>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onNewProject}>
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>
    </header>
  );
};
