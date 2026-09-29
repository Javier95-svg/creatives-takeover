import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Check, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MEMORY_KIND_LABEL, MEMORY_KINDS, type MemoryKind } from '@/lib/pulseMemory';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface MemoryRow { id: string; kind: MemoryKind; text: string; status: 'active' | 'done' | 'dropped' | 'superseded'; due_on: string | null; project_id: string | null; created_at: string }

const STATUS_LABEL: Record<MemoryRow['status'], string> = { active: 'Active', done: 'Done', dropped: 'Dropped', superseded: 'Replaced' };

/**
 * "Pulse remembers (N)": everything Pulse uses as memory for this project and
 * the account, editable and deletable by the founder. Transparent by design.
 */
export function PulseMemoryPanel({ projectId }: { projectId: string | null }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MemoryRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    let query = (supabase as any).from('pulse_memories').select('id,kind,text,status,due_on,project_id,created_at').eq('user_id', user.id);
    query = projectId ? query.or(`project_id.eq.${projectId},project_id.is.null`) : query.is('project_id', null);
    const { data, error: loadError } = await query.order('created_at', { ascending: false }).limit(100);
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

  if (!user) return null;
  const active = rows.filter(row => row.status === 'active');
  const ordered = [...active, ...rows.filter(row => row.status !== 'active')];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-foreground hover:border-accent-teal/50">
          <Bookmark aria-hidden="true" className="h-3 w-3 text-accent-teal" />Pulse remembers{loaded ? ` (${active.length})` : ''}
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>What Pulse remembers</SheetTitle>
          <SheetDescription>Decisions, hypotheses, commitments and facts you saved. Pulse uses active ones in every conversation. Edit, close or delete anything.</SheetDescription>
        </SheetHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loaded && !rows.length && <p className="text-sm text-muted-foreground">Nothing yet. When you tell Pulse a decision or a plan, it will offer to remember it.</p>}
        <ul className="space-y-3">
          {ordered.map(row => (
            <li key={row.id} className={cn('rounded-xl border border-border p-3', row.status !== 'active' && 'opacity-60')}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{MEMORY_KIND_LABEL[row.kind] ?? row.kind}</span>
                <span>{row.project_id ? 'This project' : 'Account'}</span>
                {row.due_on && <span>· due {row.due_on}</span>}
                <span>· saved {row.created_at.slice(0, 10)}</span>
              </div>
              {editing?.id === row.id
                ? <div className="flex gap-2">
                    <input autoFocus value={editing.text} maxLength={280} aria-label="Edit memory" onChange={event => setEditing({ id: row.id, text: event.target.value })}
                      className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent-teal" />
                    <button type="button" aria-label="Save edit" disabled={editing.text.trim().length < 3}
                      onClick={() => { void update(row.id, { text: editing.text.trim() }); setEditing(null); }} className="rounded-md bg-foreground px-2 text-background disabled:opacity-50"><Check className="h-4 w-4" /></button>
                  </div>
                : <p className="text-sm text-foreground">{row.text}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <select aria-label="Status" value={row.status} onChange={event => void update(row.id, { status: event.target.value as MemoryRow['status'] })}
                  className="rounded-md border border-border bg-background px-2 py-1">
                  {(['active', 'done', 'dropped'] as const).map(status => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
                  {row.status === 'superseded' && <option value="superseded">{STATUS_LABEL.superseded}</option>}
                </select>
                {MEMORY_KINDS.includes(row.kind) && <button type="button" onClick={() => setEditing({ id: row.id, text: row.text })} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" />Edit</button>}
                <button type="button" onClick={() => void remove(row.id)} className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" />Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
