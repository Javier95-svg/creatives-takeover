import { useState } from 'react';
import { Check, ListPlus, Pencil, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackPulseTaskAdded } from '@/lib/analytics';
import type { TaskSuggestion } from '@/lib/pulseActions';

type ChipState = { status: 'idle' | 'editing' | 'saving' | 'saved' | 'dismissed' | 'error'; title: string; edited: boolean };

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * "Add as task" under an answer. Pulse only proposes; the task exists once the
 * founder taps Add, written as them to daily_tasks (own rows under RLS), where
 * Today's focus and the Tasks page read it.
 */
export function PulseTaskChips({ suggestions, turnId, surface }: { suggestions: TaskSuggestion[]; turnId: string; surface: 'home' | 'widget' }) {
  const { user } = useAuth();
  const [chips, setChips] = useState<ChipState[]>(() => suggestions.map((item) => ({ status: 'idle', title: item.title, edited: false })));
  if (!user || !suggestions.length) return null;
  const patch = (index: number, next: Partial<ChipState>) => setChips((previous) => previous.map((chip, i) => (i === index ? { ...chip, ...next } : chip)));

  const add = async (index: number) => {
    const suggestion = suggestions[index];
    const title = chips[index].title.trim();
    if (title.length < 3) return;
    patch(index, { status: 'saving' });
    const due = suggestion.dueOn ? new Date(`${suggestion.dueOn}T00:00:00`) : new Date();
    const deadline = new Date(due); deadline.setHours(23, 59, 0, 0);
    const { error } = await supabase.from('daily_tasks').insert({
      user_id: user.id, task_text: title.slice(0, 140), priority: 'medium', task_date: localDate(due), deadline_time: deadline.toISOString(),
      is_completed: false, source_tool: 'pulse', task_source: 'pulse', recommendation_key: `pulse:${turnId}:${index}`,
    });
    if (error) { patch(index, { status: 'error' }); return; }
    patch(index, { status: 'saved' });
    trackPulseTaskAdded({ surface, edited: chips[index].edited, has_due_date: Boolean(suggestion.dueOn) });
  };

  return (
    <div className="mt-3 space-y-2">
      {suggestions.map((suggestion, index) => {
        const chip = chips[index];
        if (!chip || chip.status === 'dismissed') return null;
        return (
          <div key={`${suggestion.title}:${suggestion.dueOn ?? ''}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <ListPlus aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-semibold text-foreground">{chip.status === 'saved' ? 'Added' : 'Add as task'}</span>
            {chip.status === 'editing'
              ? <input autoFocus value={chip.title} maxLength={140} aria-label="Edit the task before adding it"
                  onChange={(event) => patch(index, { title: event.target.value, edited: true })}
                  onKeyDown={(event) => { if (event.key === 'Enter') void add(index); if (event.key === 'Escape') patch(index, { status: 'idle' }); }}
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary" />
              : <span className="min-w-0 flex-1 text-foreground">{chip.title}{suggestion.dueOn ? <span className="text-muted-foreground"> · due {suggestion.dueOn}</span> : null}</span>}
            {chip.status === 'saved'
              ? <span className="inline-flex items-center gap-1 text-primary"><Check className="h-3.5 w-3.5" /> On your task list</span>
              : <span className="flex items-center gap-1">
                  <button type="button" disabled={chip.status === 'saving'} onClick={() => void add(index)} className="rounded-md bg-foreground px-2 py-1 font-medium text-background disabled:opacity-60">Add</button>
                  {chip.status !== 'editing' && <button type="button" aria-label="Edit before adding" onClick={() => patch(index, { status: 'editing' })} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>}
                  <button type="button" aria-label="Don't add this task" onClick={() => patch(index, { status: 'dismissed' })} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </span>}
            {chip.status === 'error' && <span className="w-full text-destructive">Couldn’t add that. Try again.</span>}
          </div>
        );
      })}
    </div>
  );
}
