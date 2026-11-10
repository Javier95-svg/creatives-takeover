import { useCallback, useEffect, useState } from 'react';
import { History, MessageSquare, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { PulseScope } from '@/lib/pulseScope';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const homeDb = supabase.schema('public');

// Enough for anyone's history today (the heaviest account has 21); beyond it
// the count shows "100+" rather than a wrong number.
const LIST_LIMIT = 100;

export interface PulseConversationSummary { id: string; sessionId: string; title: string; preview: string; lastActiveAt: string }

/** Markdown answers read as plain text in a one-line preview. */
const plain = (text: string) => text.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*_`~|]|\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000);
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

/**
 * "Conversations (N)": the founder's saved Pulse conversations in the current
 * workspace scope, most recent first. Opening one resumes it with its full
 * history; a conversation counts once it has a message, never per message.
 * Rows come from chatbot_conversations, which RLS limits to the owner.
 */
export function PulseConversations({ userId, scope, currentSessionId, refreshKey, disabled, onOpen, onDeleted }: {
  userId: string;
  scope: PulseScope;
  currentSessionId: string | null;
  /** Bumped by the owner after a turn finishes or a conversation starts. */
  refreshKey: number;
  /** True while Pulse is answering: switching then would lose the stream. */
  disabled?: boolean;
  onOpen: (conversation: PulseConversationSummary) => Promise<boolean>;
  onDeleted: (conversation: PulseConversationSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PulseConversationSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [capped, setCapped] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await homeDb.from('chatbot_conversations')
      .select('id, session_id, updated_at, chatbot_messages(role, content, created_at)')
      .eq('user_id', userId).eq('purpose', 'pulse_home').contains('business_context', { pulseScope: { ...scope } })
      .or('business_context->pulseScope->>channel.is.null,business_context->pulseScope->>channel.eq.home')
      .order('updated_at', { ascending: false })
      // The first two messages give the title (the question) and the preview (the answer).
      .order('created_at', { referencedTable: 'chatbot_messages', ascending: true })
      .limit(2, { referencedTable: 'chatbot_messages' })
      .limit(LIST_LIMIT);
    if (loadError) { setError('Your conversations could not be loaded.'); return; }
    const rows = (data ?? []) as unknown as { id: string; session_id: string; updated_at: string; chatbot_messages: { role: string; content: string }[] }[];
    setItems(rows.filter(row => row.chatbot_messages?.length).map(row => {
      const question = row.chatbot_messages.find(message => message.role === 'user');
      const answer = row.chatbot_messages.find(message => message.role === 'assistant');
      return { id: row.id, sessionId: row.session_id, title: plain(question?.content ?? '') || 'Conversation with Pulse', preview: plain(answer?.content ?? ''), lastActiveAt: row.updated_at };
    }));
    setCapped(rows.length === LIST_LIMIT);
    setLoaded(true); setError('');
  }, [userId, scope]);

  useEffect(() => { void load(); }, [load, refreshKey]);
  useEffect(() => { if (open) { setConfirming(null); void load(); } }, [open, load]);
  // Another tab or device may have added or removed one.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [load]);

  const openConversation = async (item: PulseConversationSummary) => {
    if (item.sessionId === currentSessionId) { setOpen(false); return; }
    setWorking(item.id);
    const ok = await onOpen(item);
    setWorking(null);
    if (ok) setOpen(false); else setError('That conversation could not be opened. Please retry.');
  };

  const remove = async (item: PulseConversationSummary) => {
    setWorking(item.id);
    const { data, error: deleteError } = await homeDb.from('chatbot_conversations').delete()
      .eq('id', item.id).eq('user_id', userId).eq('purpose', 'pulse_home').select('id');
    setWorking(null); setConfirming(null);
    // RLS turns a refused delete into zero rows rather than an error.
    if (deleteError || !data?.length) { setError('That conversation could not be deleted.'); return; }
    setItems(previous => previous.filter(row => row.id !== item.id));
    setError('');
    onDeleted(item);
  };

  const count = loaded ? (capped && items.length >= LIST_LIMIT ? `${LIST_LIMIT}+` : String(items.length)) : null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="pulse-composer-chip">
          <History aria-hidden="true" className="h-3 w-3 text-accent-teal" />Conversations{count !== null ? ` (${count})` : ''}
        </button>
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-4 sm:max-w-lg" style={{ maxHeight: '85vh' }}>
        <DialogHeader>
          <DialogTitle>Your conversations with Pulse</DialogTitle>
          <DialogDescription>{scope.projectId ? 'Everything you have asked Pulse about this project' : 'Everything you have asked Pulse'}, most recent first. Open one to pick up where you left off.</DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error} <button type="button" onClick={() => void load()} className="underline">Retry</button></p>}
        {!loaded && !error && <p role="status" className="text-sm text-muted-foreground">Loading your conversations…</p>}
        {loaded && !items.length && <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
          <MessageSquare aria-hidden="true" className="mx-auto mb-3 h-6 w-6 text-accent-teal" />
          <p className="text-sm font-medium text-foreground">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Ask Pulse anything and the conversation is saved here, so you can come back to it later.</p>
        </div>}
        {items.length > 0 && <ul className="-mx-1 space-y-1 overflow-y-auto px-1">
          {items.map(item => {
            const current = item.sessionId === currentSessionId;
            return <li key={item.id} className={cn('group relative rounded-xl border border-transparent transition-colors hover:border-border hover:bg-muted/40', current && 'border-border bg-muted/40')}>
              {confirming === item.id
                ? <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 flex-1 text-foreground">Delete this conversation? This cannot be undone.</span>
                    <button type="button" onClick={() => setConfirming(null)} className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground">Cancel</button>
                    <button type="button" disabled={working === item.id} onClick={() => void remove(item)} className="rounded-md bg-destructive px-3 py-1 font-medium text-destructive-foreground disabled:opacity-50">Delete</button>
                  </div>
                : <>
                    <button type="button" disabled={disabled || working !== null} onClick={() => void openConversation(item)} className="block w-full rounded-xl px-4 py-3 pr-12 text-left disabled:cursor-not-allowed disabled:opacity-60">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{current ? 'Open now' : formatWhen(item.lastActiveAt)}</span>
                      </span>
                      {item.preview && <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{item.preview}</span>}
                    </button>
                    <button type="button" aria-label={`Delete “${item.title}”`} disabled={working !== null} onClick={() => setConfirming(item.id)}
                      className="absolute right-2 top-2.5 rounded-md p-1.5 text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>}
            </li>;
          })}
        </ul>}
        {disabled && items.length > 0 && <p className="text-xs text-muted-foreground">Pulse is answering. You can switch conversations when it finishes.</p>}
      </DialogContent>
    </Dialog>
  );
}
