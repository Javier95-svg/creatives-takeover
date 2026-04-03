import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlarmClock, ArrowRight } from 'lucide-react';

interface DailyPromptResumeCardProps {
  mode: 'morning' | 'evening';
  onResume: () => void;
}

export function DailyPromptResumeCard({ mode, onResume }: DailyPromptResumeCardProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/70 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20">
      <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <AlarmClock className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">Unresolved check-in</p>
            <p className="mt-1 text-base font-semibold">
              {mode === 'morning'
                ? 'Your daily goal is still waiting'
                : 'Your evening reflection is still open'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Snoozing no longer ends the loop for the day. Come back and close this out with one small commitment.
            </p>
          </div>
        </div>
        <Button type="button" onClick={onResume}>
          Resume check-in
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
