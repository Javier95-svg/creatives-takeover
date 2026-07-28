import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useFounderCycle } from '@/hooks/useFounderCycle';
import { cn } from '@/lib/utils';

export default function FounderCycleActionFeedback({
  actionKey,
  className,
}: {
  actionKey: string;
  className?: string;
}) {
  const cycle = useFounderCycle();
  const [pending, setPending] = useState<'remind_later' | 'not_relevant' | null>(null);

  const submit = async (status: 'remind_later' | 'not_relevant') => {
    setPending(status);
    try {
      await cycle.recordActionFeedback(actionKey, status);
      toast.success(status === 'remind_later'
        ? 'We will bring this action back tomorrow.'
        : 'The cycle is showing a different action.');
    } catch (error) {
      console.error(error);
      toast.error('The recommendation feedback could not be saved.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending !== null}
        onClick={() => void submit('remind_later')}
      >
        {pending === 'remind_later' ? 'Saving…' : 'Remind me later'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending !== null}
        onClick={() => void submit('not_relevant')}
      >
        {pending === 'not_relevant' ? 'Saving…' : 'Not relevant'}
      </Button>
    </div>
  );
}
