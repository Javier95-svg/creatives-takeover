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
  const { loading, nudges, activationMode } = useRetentionFeed();

  if (!loading && nudges.length === 0) {
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
          Every prompt here is tied to a real user state. Generic reminders are intentionally excluded.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-border/60 bg-background/70 p-4">
                <div className="mb-3 h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mb-2 h-5 w-5/6 animate-pulse rounded bg-muted" />
                <div className="mb-4 h-12 w-full animate-pulse rounded bg-muted" />
                <div className="h-9 w-32 animate-pulse rounded bg-muted" />
              </div>
            ))
          : nudges.map((nudge) => {
              const Icon = iconByNudgeId[nudge.id as keyof typeof iconByNudgeId] ?? Sparkles;
              return (
                <div key={nudge.id} className="rounded-xl border border-border/60 bg-background/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    <Icon className="h-3.5 w-3.5" />
                    {nudge.eyebrow}
                  </div>
                  <p className="text-base font-semibold leading-6">{nudge.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{nudge.description}</p>
                  <Button asChild className="mt-4">
                    <Link to={nudge.actionUrl}>
                      {nudge.actionLabel}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
      </CardContent>
    </Card>
  );
}
