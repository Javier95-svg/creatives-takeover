import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackPulseAnswerRated } from '@/lib/analytics';
import { cn } from '@/lib/utils';

type Reason = 'wrong' | 'generic' | 'not_actionable' | 'other';
const REASONS: { value: Reason; label: string }[] = [
  { value: 'wrong', label: 'Wrong' }, { value: 'generic', label: 'Too generic' },
  { value: 'not_actionable', label: 'Not actionable' }, { value: 'other', label: 'Other' },
];

/**
 * Thumbs up/down under a Pulse answer. One rating per answer (re-rating
 * replaces it); a thumbs down asks for one reason. Written straight to
 * pulse_message_feedback under RLS; the answer's model and depth live on its
 * saved metadata under the same turn id.
 */
export function PulseAnswerFeedback({ sessionId, turnId, surface }: { sessionId: string; turnId: string; surface: 'home' | 'widget' }) {
  const { user } = useAuth();
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [failed, setFailed] = useState(false);

  const save = async (nextRating: 1 | -1, nextReason: Reason | null) => {
    if (!user) return;
    setRating(nextRating); setReason(nextReason); setFailed(false);
    const { error } = await (supabase as any).from('pulse_message_feedback').upsert(
      { user_id: user.id, session_id: sessionId, turn_id: turnId, rating: nextRating, reason: nextReason, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,turn_id' },
    );
    if (error) { setFailed(true); return; }
    trackPulseAnswerRated({ surface, rating: nextRating, reason: nextReason ?? 'none' });
  };

  if (!user) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <button type="button" aria-label="Helpful answer" aria-pressed={rating === 1} onClick={() => void save(1, null)}
        className={cn('rounded-md p-1 transition-colors hover:bg-muted hover:text-foreground', rating === 1 && 'text-accent-teal')}>
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" aria-label="Not helpful" aria-pressed={rating === -1} onClick={() => void save(-1, reason)}
        className={cn('rounded-md p-1 transition-colors hover:bg-muted hover:text-foreground', rating === -1 && 'text-destructive')}>
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
      {rating === 1 && <span>Thanks, noted.</span>}
      {rating === -1 && <>
        <span>What was off?</span>
        {REASONS.map(option => (
          <button key={option.value} type="button" aria-pressed={reason === option.value} onClick={() => void save(-1, option.value)}
            className={cn('rounded-full border border-border px-2 py-0.5 transition-colors hover:text-foreground', reason === option.value && 'border-foreground/40 text-foreground')}>
            {option.label}
          </button>
        ))}
      </>}
      {failed && <span className="text-destructive">Couldn’t save that. Try again.</span>}
    </div>
  );
}
