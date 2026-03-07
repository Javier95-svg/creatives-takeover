import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Loader2, CheckSquare, Layout, Hash, User, BarChart3, DollarSign, Wand2, History, RotateCcw, Clock3, Bot, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MVPMessageItem } from './MVPMessageItem';
import type { MVPMessage, MVPPromptHistoryItem } from '@/hooks/useMVPBuilder';
import {
  MVP_DEFAULT_MODEL,
  MVP_MODEL_OPTIONS,
  getMVPModelLabel,
} from '@/data/mvpModels';

// ── Quick-start templates ────────────────────────────────────────────────────

const TEMPLATES = [
  {
    label: 'Todo App',
    icon: CheckSquare,
    prompt:
      'Build a beautiful todo app with add, complete, and delete tasks. Support categories (Work, Personal, Urgent) and persist everything in localStorage.',
  },
  {
    label: 'Landing Page',
    icon: Layout,
    prompt:
      'Build a modern SaaS landing page with a hero section, features grid, pricing table (3 tiers), FAQ accordion, and a sticky CTA nav bar.',
  },
  {
    label: 'Calculator',
    icon: Hash,
    prompt:
      'Build a sleek calculator with standard and scientific modes. Dark/light theme toggle. Show calculation history.',
  },
  {
    label: 'Portfolio',
    icon: User,
    prompt:
      'Build a minimal personal portfolio with an about section, projects grid with modal previews, skills list, and a contact form.',
  },
  {
    label: 'Dashboard',
    icon: BarChart3,
    prompt:
      'Build an analytics dashboard with a sidebar nav, stats cards (revenue, users, orders, churn), a line chart (Chart.js CDN), and a recent activity feed.',
  },
  {
    label: 'Budget Tracker',
    icon: DollarSign,
    prompt:
      'Build a personal budget tracker. Add income and expense entries with categories, show a running balance, a category breakdown chart, and monthly summary.',
  },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

interface MVPBuilderChatProps {
  messages: MVPMessage[];
  promptHistory: MVPPromptHistoryItem[];
  selectedModels: string[];
  onSelectedModelsChange: (models: string[]) => void;
  onSend: (prompt: string) => void;
  isGenerating: boolean;
}

export const MVPBuilderChat: React.FC<MVPBuilderChatProps> = ({
  messages,
  promptHistory,
  selectedModels,
  onSelectedModelsChange,
  onSend,
  isGenerating,
}) => {
  const [input, setInput] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = messages.length === 0;
  const sortedHistory = useMemo(
    () =>
      [...promptHistory].sort(
        (a, b) => new Date(b.committedAt).getTime() - new Date(a.committedAt).getTime()
      ),
    [promptHistory]
  );
  const selectedModelLabels = useMemo(
    () => selectedModels.map((id) => getMVPModelLabel(id) ?? id),
    [selectedModels]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;
    onSend(trimmed);
    setInput('');
  }, [input, isGenerating, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatHistoryDateTime = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleRestorePrompt = (prompt: string) => {
    setInput(prompt);
    setHistoryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleReusePrompt = (prompt: string) => {
    if (isGenerating) return;
    onSend(prompt);
    setHistoryOpen(false);
  };

  const toggleModel = (modelId: string) => {
    const isSelected = selectedModels.includes(modelId);
    const next = isSelected
      ? selectedModels.filter((id) => id !== modelId)
      : [...selectedModels, modelId];
    onSelectedModelsChange(next);
  };

  const setSingleModel = (modelId: string) => {
    onSelectedModelsChange([modelId]);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pt-2 pb-1 shrink-0 flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">Prompt Sidebar</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5"
            onClick={() => setModelsOpen(true)}
          >
            <Bot className="h-3.5 w-3.5" />
            Models
            <span className="text-[10px] text-muted-foreground">({selectedModels.length})</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-3.5 w-3.5" />
            View History
            <span className="text-[10px] text-muted-foreground">({sortedHistory.length})</span>
          </Button>
        </div>
      </div>
      <div className="px-3 pb-1">
        <p className="text-[10px] text-muted-foreground truncate">
          Active: {selectedModelLabels.join(' + ')}
        </p>
      </div>

      {/* Message list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {isEmpty ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full py-8 gap-6 text-center">
              <div className="space-y-2">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10 flex items-center justify-center mx-auto">
                  <Wand2 className="h-7 w-7 text-primary/70" />
                </div>
                <p className="text-lg font-semibold">What are we building today?</p>
                <p className="text-xs text-muted-foreground/70">
                  Describe your product idea, key features, and workflow in plain language
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.label}
                      onClick={() => onSend(t.prompt)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-card hover:bg-muted/60 hover:border-primary/40 hover:shadow-sm px-3 py-2.5 text-xs font-medium transition-all duration-150 text-left disabled:opacity-50"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Conversation */
            <>
              {messages.map((msg) => (
                <MVPMessageItem key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input area — card with focus glow */}
      <div className="px-3 pb-3 pt-2 shrink-0">
        <div className="rounded-2xl border border-border/60 bg-card/50 focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)] transition-all duration-200 p-2">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isEmpty
                  ? 'Describe your MVP idea, core features, and user flow...'
                  : 'Describe a change to make...'
              }
              className="min-h-[44px] max-h-28 resize-none text-sm leading-relaxed py-2.5 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-1"
              disabled={isGenerating}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              size="icon"
              className="h-9 w-9 rounded-xl shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 text-right">
          Natural language works best: idea + features + workflow · Enter to send · Shift+Enter for new line
        </p>
      </div>

      <Sheet open={modelsOpen} onOpenChange={setModelsOpen}>
        <SheetContent side="right" className="w-[95vw] sm:max-w-lg p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="px-4 py-4 border-b border-border/50">
              <SheetTitle className="text-base">Model Router</SheetTitle>
              <SheetDescription>
                Choose one model or combine multiple models. First selected model is the primary generator.
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Active combination: <span className="text-foreground">{selectedModelLabels.join(' + ')}</span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSelectedModelsChange([MVP_DEFAULT_MODEL])}
              >
                Reset Default
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {MVP_MODEL_OPTIONS.map((model) => {
                  const isSelected = selectedModels.includes(model.id);
                  const isDefault = model.id === MVP_DEFAULT_MODEL;
                  return (
                    <div
                      key={model.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleModel(model.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleModel(model.id);
                        }
                      }}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${
                        isSelected
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border/60 bg-card/60 hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {model.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{model.description}</p>
                          <p className="text-[11px] text-muted-foreground/90">
                            Best for: {model.bestFor}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isDefault && (
                            <span className="text-[10px] rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                              Default
                            </span>
                          )}
                          <span
                            className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background'
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSingleModel(model.id);
                          }}
                        >
                          Use Only This
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-[95vw] sm:max-w-md p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="px-4 py-4 border-b border-border/50">
              <SheetTitle className="text-base">Prompt History</SheetTitle>
              <SheetDescription>
                Most recent first. Stored for this MVP project session.
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {sortedHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
                    No committed prompts yet. Generate or refine your MVP to build history.
                  </div>
                ) : (
                  sortedHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/60 bg-card/60 p-3 space-y-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatHistoryDateTime(item.committedAt)}
                        </div>
                        {item.commitRef && (
                          <p className="text-[11px] text-muted-foreground">
                            Ref: <span className="font-mono">{item.commitRef}</span>
                          </p>
                        )}
                      </div>

                      <div className="rounded-md border border-border/50 bg-background/70 p-2 max-h-36 overflow-y-auto">
                        <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">
                          {item.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleRestorePrompt(item.prompt)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Restore
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleReusePrompt(item.prompt)}
                          disabled={isGenerating}
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Reuse
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
