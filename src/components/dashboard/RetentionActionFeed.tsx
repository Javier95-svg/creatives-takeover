import { Link } from 'react-router-dom';
import { ArrowRight, BookmarkCheck, MessageSquareReply, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRetentionFeed } from '@/hooks/useRetentionFeed';

const iconByNudgeId = {
  activation: Sparkles,
  messages: MessageSquareReply,
  'saved-mentors': BookmarkCheck,
  bookings: Sparkles,
} as const;

export function RetentionActionFeed() {
  const { loading, primaryNudge, secondaryNudges, activationMode } = useRetentionFeed();

  if (!loading && !primaryNudge && secondaryNudges.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Retention Loop
            </div>
            <CardTitle className="text-xl">
              {activationMode ? 'Complete your first return trigger' : 'What should bring you back next?'}
            </CardTitle>
          </div>
          <Badge variant="secondary">
            {activationMode ? 'Activation mode' : 'Contextual prompts'}
          </Badge>
        </div>
        <CardDescription>
          The top card is the strongest return path we can identify from your current account state. Everything else is secondary.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-5">
              <div className="mb-3 h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="mb-2 h-6 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mb-4 h-14 w-full animate-pulse rounded bg-muted" />
              <div className="h-10 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <div className="mb-3 h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="mb-2 h-5 w-5/6 animate-pulse rounded bg-muted" />
                  <div className="mb-4 h-12 w-full animate-pulse rounded bg-muted" />
                  <div className="h-9 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {primaryNudge ? (
              <div className="rounded-2xl border border-primary/20 bg-background/80 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {primaryNudge.eyebrow}
                </div>
                <p className="text-xl font-semibold leading-7">{primaryNudge.title}</p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{primaryNudge.description}</p>
                <Button asChild className="mt-4">
                  <Link to={primaryNudge.actionUrl}>
                    {primaryNudge.actionLabel}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : null}

            {secondaryNudges.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {secondaryNudges.map((nudge) => {
                  const Icon = iconByNudgeId[nudge.id as keyof typeof iconByNudgeId] ?? Sparkles;
                  return (
                    <div key={nudge.id} className="rounded-xl border border-border/60 bg-background/70 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        <Icon className="h-3.5 w-3.5" />
                        {nudge.eyebrow}
                      </div>
                      <p className="text-base font-semibold leading-6">{nudge.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{nudge.description}</p>
                      <Button asChild className="mt-4" variant="outline">
                        <Link to={nudge.actionUrl}>
                          {nudge.actionLabel}
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
