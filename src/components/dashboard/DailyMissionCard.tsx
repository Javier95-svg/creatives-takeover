import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyMission } from '@/hooks/useDailyMission';

export function DailyMissionCard() {
  const { mission, loading, completing, markAsDone, stageLabel } = useDailyMission();

  return (
    <Card className="border-primary/25 bg-gradient-to-br from-primary/12 via-card to-card shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Today&apos;s Mission
            </div>
            <CardTitle className="text-xl">One specific move for today</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs uppercase tracking-wide">
            {stageLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-h-16 max-w-3xl">
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
              <div className="h-4 w-8/12 animate-pulse rounded bg-muted" />
            </div>
          ) : (
            <p className="text-base font-medium leading-7 text-foreground">
              {mission?.mission_text ?? 'Write down the top 3 pains your ideal customer feels and save them in ICP Builder.'}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <Button
            type="button"
            onClick={markAsDone}
            disabled={loading || completing || !mission || mission.completed}
            className="min-w-36"
            variant={mission?.completed ? 'secondary' : 'default'}
          >
            {loading || completing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : mission?.completed ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Completed
              </>
            ) : (
              'Mark as Done'
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Cached once per day from your current BizMap stage and latest activity.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
