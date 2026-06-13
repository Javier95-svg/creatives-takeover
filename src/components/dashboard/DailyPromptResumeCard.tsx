import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlarmClock, ArrowRight } from 'lucide-react';

interface DailyPromptResumeCardProps {
  mode: 'morning' | 'evening';
  onResume: () => void;
}

export function DailyPromptResumeCard({ mode, onResume }: DailyPromptResumeCardProps) {
  return (
    <Card className="border-warning bg-warning-subtle shadow-sm dark:border-warning/40 dark:bg-warning/20">
      <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <AlarmClock className="mt-0.5 h-5 w-5 text-warning" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warning dark:text-warning">Unresolved check-in</p>
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
