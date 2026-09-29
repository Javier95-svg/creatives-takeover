import { useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackPulseCommitmentUpdated } from '@/lib/analytics';
import type { CommitmentCheck } from '@/lib/pulseMemory';

type Outcome = 'done' | 'not_yet' | 'dropped';
const LABEL: Record<Outcome, string> = { done: 'Marked done', not_yet: 'Kept open. Pulse will check again another day.', dropped: 'Dropped' };

/** Done / Not yet / Drop for a saved commitment Pulse asked about. */
export function PulseCommitmentCheck({ commitment, surface }: { commitment: CommitmentCheck; surface: 'home' | 'widget' }) {
  const { user } = useAuth();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failed, setFailed] = useState(false);
  if (!user) return null;

  const answer = async (next: Outcome) => {
    setFailed(false);
    if (next !== 'not_yet') {
      const { error } = await (supabase as any).from('pulse_memories')
        .update({ status: next, updated_at: new Date().toISOString() }).eq('id', commitment.id).eq('user_id', user.id);
      if (error) { setFailed(true); return; }
    }
    setOutcome(next);
    trackPulseCommitmentUpdated({ surface, outcome: next });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-xs">
      <CalendarCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent-teal" />
      <span className="min-w-0 flex-1 text-foreground">{commitment.text}{commitment.dueOn ? <span className="text-muted-foreground"> · due {commitment.dueOn}</span> : null}</span>
      {outcome ? <span className="text-muted-foreground">{LABEL[outcome]}</span> : <span className="flex gap-1">
        <button type="button" onClick={() => void answer('done')} className="rounded-md bg-foreground px-2 py-1 font-medium text-background">Done</button>
        <button type="button" onClick={() => void answer('not_yet')} className="rounded-md border border-border px-2 py-1 text-foreground hover:bg-muted">Not yet</button>
        <button type="button" onClick={() => void answer('dropped')} className="rounded-md px-2 py-1 text-muted-foreground hover:text-foreground">Drop</button>
      </span>}
      {failed && <span className="w-full text-destructive">Couldn’t update that. Try again.</span>}
    </div>
  );
}
