import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bookmark, Check, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  MEMORY_EVIDENCE_LABEL,
  MEMORY_KIND_LABEL,
  MEMORY_KINDS,
  MEMORY_SOURCE_LABEL,
  memoryTopicLabel,
  type MemoryKind,
} from '@/lib/pulseMemory';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type MemoryStatus = 'active' | 'done' | 'dropped' | 'superseded' | 'needs_review';
interface MemoryRow {
  id: string; kind: MemoryKind; text: string; status: MemoryStatus; due_on: string | null; project_id: string | null; created_at: string;
  topic: string | null; source_tool: string | null; evidence: string | null; superseded_by: string | null;
}

const STATUS_LABEL: Record<MemoryStatus, string> = { active: 'Active', done: 'Done', dropped: 'Dropped', superseded: 'Replaced', needs_review: 'Needs your call' };
const FIELDS = 'id,kind,text,status,due_on,project_id,created_at,topic,source_tool,evidence,superseded_by';

/** Topic, source and evidence: where an entry came from and how far it is proven. */
function MemoryMeta({ row }: { row: MemoryRow }) {
  const topic = memoryTopicLabel(row.topic);
  const evidence = row.evidence ? MEMORY_EVIDENCE_LABEL[row.evidence] : null;
  return (
    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">{topic ?? MEMORY_KIND_LABEL[row.kind] ?? row.kind}</span>
      <span>· {MEMORY_SOURCE_LABEL[row.source_tool ?? 'pulse'] ?? row.source_tool}</span>
      {evidence && (
        <span className={cn('rounded-full px-1.5 py-0.5', row.evidence === 'verified' ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>{evidence}</span>
      )}
      {!row.project_id && <span>· Account</span>}
      {row.due_on && <span>· due {row.due_on}</span>}
      <span>· {row.created_at.slice(0, 10)}</span>
    </div>
  );
}

/**
 * "Pulse remembers (N)": the project's decision history. Founders' own entries
 * from Pulse, plus what each tool recorded when they saved a result. When a
 * tool's result disagrees with the founder's own call, both are shown here and
 * nothing is used until they choose. Every entry is editable and deletable.
 */
export function PulseMemoryPanel({ projectId }: { projectId: string | null }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MemoryRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    let query = (supabase as any).from('pulse_memories').select(FIELDS).eq('user_id', user.id);
    query = projectId ? query.or(`project_id.eq.${projectId},project_id.is.null`) : query.is('project_id', null);
    const { data, error: loadError } = await query.order('created_at', { ascending: false }).limit(150);
    if (loadError) { setError('Memory could not be loaded.'); return; }
    setRows((data ?? []) as MemoryRow[]); setLoaded(true); setError('');
  }, [user, projectId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (open) void load(); }, [open, load]);

  const update = async (id: string, patch: Partial<MemoryRow>) => {
    const { error: updateError } = await (supabase as any).from('pulse_memories').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (updateError) { setError('That change was not saved.'); return; }
    setRows(previous => previous.map(row => row.id === id ? { ...row, ...patch } : row));
  };
  const remove = async (id: string) => {
    const { error: deleteError } = await (supabase as any).from('pulse_memories').delete().eq('id', id);
    if (deleteError) { setError('That memory was not deleted.'); return; }
    setRows(previous => previous.filter(row => row.id !== id));
  };
  const keep = async (id: string) => {
    setResolving(id);
    const { error: resolveError } = await (supabase as any).rpc('resolve_pulse_memory_conflict', { p_keep_id: id });
    setResolving(null);
    if (resolveError) { setError('That choice was not saved. Try again.'); return; }
    await load();
  };

  if (!user) return null;
  const active = rows.filter(row => row.status === 'active');
  const pending = rows.filter(row => row.status === 'needs_review');
  const history = rows.filter(row => row.status !== 'active' && row.status !== 'needs_review');
  const sameTopic = (row: MemoryRow) => active.filter(other => other.topic === row.topic && other.project_id === row.project_id);
  // An active entry inside a conflict is shown there, marked "In use now", not twice.
  const inConflict = new Set(pending.flatMap(row => sameTopic(row).map(other => other.id)));
  const current = active.filter(row => !inConflict.has(row.id));

  const renderCurrent = (row: MemoryRow) => (
    <li key={row.id} className="rounded-xl border border-border p-3">
      <MemoryMeta row={row} />
      {editing?.id === row.id
        ? <div className="flex gap-2">
            <input autoFocus value={editing.text} maxLength={280} aria-label="Edit memory" onChange={event => setEditing({ id: row.id, text: event.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent-teal" />
            <button type="button" aria-label="Save edit" disabled={editing.text.trim().length < 3}
              onClick={() => { void update(row.id, { text: editing.text.trim() }); setEditing(null); }} className="rounded-md bg-foreground px-2 text-background disabled:opacity-50"><Check className="h-4 w-4" /></button>
          </div>
        : <p className="text-sm text-foreground">{row.text}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <select aria-label="Status" value={row.status} onChange={event => void update(row.id, { status: event.target.value as MemoryStatus })}
          className="rounded-md border border-border bg-background px-2 py-1">
          {(['active', 'done', 'dropped'] as const).map(status => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
        </select>
        {MEMORY_KINDS.includes(row.kind) && <button type="button" onClick={() => setEditing({ id: row.id, text: row.text })} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" />Edit</button>}
        <button type="button" onClick={() => void remove(row.id)} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" />Delete</button>
      </div>
    </li>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="pulse-composer-chip">
          <Bookmark aria-hidden="true" className="h-3 w-3 text-accent-teal" />Pulse remembers{loaded ? ` (${active.length})` : ''}
          {pending.length > 0 && <span className="ml-1 rounded-full bg-warning/20 px-1.5 text-warning">{pending.length} to review</span>}
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>What Pulse remembers</SheetTitle>
          <SheetDescription>
            Your decisions from Pulse and onboarding, and what your tools recorded when you saved a result. Pulse and the tools use the active ones. Each shows where it came from and how far it is proven. Edit, close or delete anything.
          </SheetDescription>
        </SheetHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loaded && !rows.length && <p className="text-sm text-muted-foreground">Nothing yet. Tell Pulse a decision, or save a result in a tool, and it shows up here.</p>}

        {pending.length > 0 && (
          <section aria-labelledby="memory-review" className="space-y-3">
            <h3 id="memory-review" className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle aria-hidden="true" className="h-4 w-4 text-warning" />Needs your call
            </h3>
            <p className="text-xs text-muted-foreground">A tool result and your own decision disagree. Pulse and the tools keep using the one marked "In use now" until you choose which one stands.</p>
            {pending.map(row => (
              <div key={row.id} className="space-y-2 rounded-xl border border-warning/40 bg-warning/5 p-3">
                {[...sameTopic(row), row].map(option => (
                  <div key={option.id} className="rounded-lg border border-border bg-background p-2">
                    {option.status === 'active' && <p className="mb-1 text-xs font-semibold text-accent-teal">In use now</p>}
                    <MemoryMeta row={option} />
                    <p className="text-sm text-foreground">{option.text}</p>
                    <button type="button" disabled={resolving !== null} onClick={() => void keep(option.id)}
                      className="mt-2 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background disabled:opacity-60">
                      {resolving === option.id ? 'Saving…' : 'Keep this one'}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {current.length > 0 && <ul className="space-y-3" aria-label="Current">{current.map(renderCurrent)}</ul>}

        {history.length > 0 && (
          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">History ({history.length})</summary>
            <ul className="mt-3 space-y-3">
              {history.map(row => (
                <li key={row.id} className="opacity-70">
                  <MemoryMeta row={row} />
                  <p className="text-sm text-foreground">{row.text}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{STATUS_LABEL[row.status]}</span>
                    <button type="button" onClick={() => void remove(row.id)} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 hover:text-destructive"><Trash2 className="h-3 w-3" />Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </SheetContent>
    </Sheet>
  );
}
