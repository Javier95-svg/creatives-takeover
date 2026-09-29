import { useState } from 'react';
import { Bookmark, Check, Pencil, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackPulseMemorySaved } from '@/lib/analytics';
import { MEMORY_KIND_LABEL, type MemorySuggestion } from '@/lib/pulseMemory';

type ChipState = { status: 'idle' | 'editing' | 'saving' | 'saved' | 'dismissed' | 'error'; text: string; edited: boolean };

/**
 * "Remember this?" under an answer. Pulse only suggests; nothing is stored
 * until the founder saves it (pulse_memories, own rows under RLS).
 */
export function PulseMemoryChips({ suggestions, projectId, turnId, surface }: {
  suggestions: MemorySuggestion[]; projectId: string | null; turnId: string; surface: 'home' | 'widget';
}) {
  const { user } = useAuth();
  const [chips, setChips] = useState<ChipState[]>(() => suggestions.map(item => ({ status: 'idle', text: item.text, edited: false })));
  if (!user || !suggestions.length) return null;
  const patch = (index: number, next: Partial<ChipState>) => setChips(previous => previous.map((chip, i) => i === index ? { ...chip, ...next } : chip));

  const save = async (index: number) => {
    const suggestion = suggestions[index];
    const text = chips[index].text.trim();
    if (text.length < 3) return;
    patch(index, { status: 'saving' });
    const { error } = await (supabase as any).from('pulse_memories').insert({
      user_id: user.id, project_id: projectId, kind: suggestion.kind, text: text.slice(0, 280),
      due_on: suggestion.kind === 'commitment' ? suggestion.dueOn : null, source_turn_id: turnId,
    });
    if (error) { patch(index, { status: 'error' }); return; }
    patch(index, { status: 'saved' });
    trackPulseMemorySaved({ surface, kind: suggestion.kind, edited: chips[index].edited });
  };

  return (
    <div className="mt-3 space-y-2">
      {suggestions.map((suggestion, index) => {
        const chip = chips[index];
        if (!chip || chip.status === 'dismissed') return null;
        return (
          <div key={`${suggestion.kind}:${suggestion.text}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-accent-teal/30 bg-accent-teal/5 px-3 py-2 text-xs">
            <Bookmark aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent-teal" />
            <span className="font-semibold text-foreground">{chip.status === 'saved' ? 'Saved' : 'Remember'} · {MEMORY_KIND_LABEL[suggestion.kind]}</span>
            {chip.status === 'editing'
              ? <input autoFocus value={chip.text} maxLength={280} aria-label="Edit what Pulse remembers"
                  onChange={event => patch(index, { text: event.target.value, edited: true })}
                  onKeyDown={event => { if (event.key === 'Enter') void save(index); if (event.key === 'Escape') patch(index, { status: 'idle' }); }}
                  className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-accent-teal" />
              : <span className="min-w-0 flex-1 text-foreground">{chip.text}{suggestion.dueOn ? <span className="text-muted-foreground"> · due {suggestion.dueOn}</span> : null}</span>}
            {chip.status === 'saved'
              ? <span className="inline-flex items-center gap-1 text-accent-teal"><Check className="h-3.5 w-3.5" /> Pulse will remember this</span>
              : <span className="flex items-center gap-1">
                  <button type="button" disabled={chip.status === 'saving'} onClick={() => void save(index)} className="rounded-md bg-foreground px-2 py-1 font-medium text-background disabled:opacity-60">Save</button>
                  {chip.status !== 'editing' && <button type="button" aria-label="Edit before saving" onClick={() => patch(index, { status: 'editing' })} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>}
                  <button type="button" aria-label="Don't remember this" onClick={() => patch(index, { status: 'dismissed' })} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                </span>}
            {chip.status === 'error' && <span className="w-full text-destructive">Couldn’t save that. Try again.</span>}
          </div>
        );
      })}
    </div>
  );
}
