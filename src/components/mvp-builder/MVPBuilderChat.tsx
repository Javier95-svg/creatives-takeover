import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MVPMessageItem } from './MVPMessageItem';
import type { MVPMessage } from '@/hooks/useMVPBuilder';

// ── Quick-start templates ────────────────────────────────────────────────────

const TEMPLATES = [
  {
    label: 'Todo App',
    prompt:
      'Build a beautiful todo app with add, complete, and delete tasks. Support categories (Work, Personal, Urgent) and persist everything in localStorage.',
  },
  {
    label: 'Landing Page',
    prompt:
      'Build a modern SaaS landing page with a hero section, features grid, pricing table (3 tiers), FAQ accordion, and a sticky CTA nav bar.',
  },
  {
    label: 'Calculator',
    prompt:
      'Build a sleek calculator with standard and scientific modes. Dark/light theme toggle. Show calculation history.',
  },
  {
    label: 'Portfolio',
    prompt:
      'Build a minimal personal portfolio with an about section, projects grid with modal previews, skills list, and a contact form.',
  },
  {
    label: 'Dashboard',
    prompt:
      'Build an analytics dashboard with a sidebar nav, stats cards (revenue, users, orders, churn), a line chart (Chart.js CDN), and a recent activity feed.',
  },
  {
    label: 'Budget Tracker',
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

  // Auto-scroll to bottom on new messages
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

  const handleTemplate = (prompt: string) => {
    onSend(prompt);
  };

  return (
    <div className="flex flex-col h-full min-h-0 border-r border-border/50">
      {/* Message list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {isEmpty ? (
            /* Empty state with template chips */
            <div className="flex flex-col items-center justify-center h-full py-8 gap-6 text-center">
              <div className="space-y-1">
                <p className="text-base font-semibold">What do you want to build?</p>
                <p className="text-xs text-muted-foreground">
                  Describe your app or pick a template below
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => handleTemplate(t.prompt)}
                    disabled={isGenerating}
                    className="rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/80 hover:border-primary/40 px-3 py-2.5 text-xs font-medium transition-all duration-150 text-left disabled:opacity-50"
                  >
                    {t.label}
                  </button>
                ))}
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

      {/* Input area */}
      <div className="p-3 border-t border-border/50 bg-background/80 shrink-0">
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
            className="min-h-[52px] max-h-32 resize-none text-sm leading-relaxed py-3"
            disabled={isGenerating}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            size="icon"
            className="h-[52px] w-10 shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
