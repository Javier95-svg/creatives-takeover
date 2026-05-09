import { ArrowUpRight, Bell, BookOpen, CalendarClock, CheckCircle2, ClipboardList, Compass, Newspaper, RefreshCw, Sparkles, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useDailyFounderFeed, type FounderFeedCard, type FounderFeedCardKind } from '@/hooks/useDailyFounderFeed';

type PromptMode = 'start' | 'end';

interface DailyFounderFeedProps {
  hasUnresolvedPrompt: boolean;
  unresolvedMode: PromptMode;
  onPromptResume: () => void;
}

const iconByKind: Record<FounderFeedCardKind | 'daily_prompt', typeof Sparkles> = {
  comeback: Sparkles,
  task: ClipboardList,
  routine: CalendarClock,
  focus_funnel: Compass,
  recommendation: Sparkles,
  retention_nudge: Bell,
  newspaper: Newspaper,
  mentor: Users,
  investor: Users,
  community: Users,
  announcement: Bell,
  daily_prompt: CheckCircle2,
};

const labelToneByLayer = {
  founder: 'bg-primary/10 text-primary border-primary/20',
  platform: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300',
};

function isExternalRoute(route: string) {
  return /^https?:\/\//i.test(route);
}

function formatFreshness(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Updated today';

  return formatDistanceToNow(date, { addSuffix: true });
}

function FeedCard({
  card,
  onAction,
}: {
  card: FounderFeedCard & { onAction?: () => void };
  onAction: (card: FounderFeedCard & { onAction?: () => void }) => void;
}) {
  const Icon = iconByKind[card.kind] ?? Sparkles;
  const progress = typeof card.metadata?.stageProgress === 'number' ? Number(card.metadata.stageProgress) : null;
  const communityStats =
    typeof card.metadata?.upvotes === 'number' || typeof card.metadata?.comments === 'number'
      ? `${Number(card.metadata?.upvotes ?? 0)} upvotes · ${Number(card.metadata?.comments ?? 0)} comments`
      : null;

  return (
    <Card className="overflow-hidden rounded-lg border-border/70 bg-card/95 shadow-sm hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('border text-[11px]', labelToneByLayer[card.layer])}>
                {card.sourceLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatFreshness(card.freshnessDate)}</span>
              {communityStats ? <span className="text-xs text-muted-foreground">{communityStats}</span> : null}
            </div>

            <div className="space-y-1">
              <h2 className="font-space-grotesk text-lg font-semibold leading-snug text-foreground">
                {card.title}
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {card.description}
              </p>
            </div>

            {progress !== null ? (
              <div className="max-w-sm space-y-1.5">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{progress}% complete</p>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            size="sm"
            className="shrink-0 rounded-full"
            variant={card.kind === 'comeback' ? 'default' : 'outline'}
            onClick={() => onAction(card)}
          >
            {card.actionLabel}
            {isExternalRoute(card.actionRoute) ? (
              <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading daily feed">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-32 animate-pulse rounded-lg border border-border/70 bg-muted/50" />
      ))}
    </div>
  );
}

export function DailyFounderFeed({
  hasUnresolvedPrompt,
  unresolvedMode,
  onPromptResume,
}: DailyFounderFeedProps) {
  const navigate = useNavigate();
  const { cards, feedDayKey, founderName, loading, isRefreshing, error, trackActivity } = useDailyFounderFeed();

  const promptCard: (FounderFeedCard & { onAction?: () => void }) | null = hasUnresolvedPrompt
    ? {
        id: 'daily-prompt-resume',
        layer: 'founder',
        kind: 'daily_prompt' as FounderFeedCardKind,
        title: unresolvedMode === 'end' ? 'Finish today with a quick reflection' : 'Your daily founder prompt is waiting',
        description:
          unresolvedMode === 'end'
            ? 'Close the loop before tomorrow so your streak and next action stay accurate.'
            : 'Answer the prompt before you start browsing; it keeps the dashboard focused on today.',
        actionLabel: 'Resume prompt',
        actionRoute: '/dashboard',
        priority: 118,
        freshnessDate: new Date().toISOString(),
        sourceLabel: 'Daily Prompt',
        onAction: onPromptResume,
      }
    : null;

  const visibleCards = promptCard ? [promptCard, ...cards].slice(0, 10) : cards;

  const handleAction = (card: FounderFeedCard & { onAction?: () => void }) => {
    void trackActivity('dashboard_feed_card_clicked', {
      card_id: card.id,
      card_kind: card.kind,
      card_layer: card.layer,
      feed_day_key: feedDayKey,
    });

    if (card.onAction) {
      card.onAction();
      return;
    }

    if (isExternalRoute(card.actionRoute)) {
      window.open(card.actionRoute, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(card.actionRoute);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d')} · Daily feed
          </p>
          <h1 className="font-space-grotesk text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Good to see you, {founderName}
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isRefreshing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          <span>Refreshes daily at 6 AM</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Some platform updates could not load. Your founder actions are still available.
        </div>
      ) : null}

      {loading ? (
        <FeedSkeleton />
      ) : visibleCards.length > 0 ? (
        <div className="space-y-3">
          {visibleCards.map((card) => (
            <FeedCard key={card.id} card={card} onAction={handleAction} />
          ))}
        </div>
      ) : (
        <Card className="rounded-lg border-border/70 bg-card/95">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h2 className="font-space-grotesk text-lg font-semibold">Your feed is clear for now</h2>
                <p className="text-sm text-muted-foreground">
                  Open the Focus Funnel to choose the next founder action, then new feed cards will appear as you make progress.
                </p>
                <Button type="button" size="sm" className="rounded-full" onClick={() => navigate('/dashboard/focus-funnel')}>
                  Open Focus Funnel
                  <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
