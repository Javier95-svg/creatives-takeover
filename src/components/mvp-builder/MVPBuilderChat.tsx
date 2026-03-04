import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, CheckSquare, Layout, Hash, User, BarChart3, DollarSign, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MVPMessageItem } from './MVPMessageItem';
import type { MVPMessage } from '@/hooks/useMVPBuilder';

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
  onSend: (prompt: string) => void;
  isGenerating: boolean;
}

export const MVPBuilderChat: React.FC<MVPBuilderChatProps> = ({
  messages,
  onSend,
  isGenerating,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = messages.length === 0;

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

  return (
    <div className="flex flex-col h-full min-h-0">
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
                  Describe your app or pick a template below
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
                  ? 'Describe the app you want to build...'
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
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
