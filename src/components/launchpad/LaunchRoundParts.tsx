import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowBigUp, BriefcaseBusiness, Crown, ExternalLink, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useEnteredLaunchProjects, useEnterLaunch } from '@/hooks/useLaunchpad';
import { founderStageLabel } from '@/lib/bizmapStageOrder';
import { listProjects } from '@/lib/demoStudio/api';
import { INVESTOR_READY_STAGE, roundEnd, timeLeft, type RoundLaunch } from '@/lib/launchpadLaunches';
import { cn } from '@/lib/utils';

/** Time left in the current round, refreshed every 30 seconds. */
export function RoundCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const left = timeLeft(roundEnd(now), now);
  const units = [
    { value: left.days, label: left.days === 1 ? 'day' : 'days' },
    { value: left.hours, label: left.hours === 1 ? 'hour' : 'hours' },
    { value: left.minutes, label: left.minutes === 1 ? 'min' : 'mins' },
  ];
  return <div aria-label={`Round closes in ${left.days} days, ${left.hours} hours and ${left.minutes} minutes`} className="flex items-center gap-2">
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Round closes in</span>
    <div className="flex gap-1.5" aria-hidden="true">
      {units.map((unit) => <div key={unit.label} className="min-w-12 rounded-lg border border-border/70 bg-card px-2 py-1 text-center">
        <span className="block font-space-grotesk text-lg font-semibold leading-tight">{unit.value}</span>
        <span className="block text-xs text-muted-foreground">{unit.label}</span>
      </div>)}
    </div>
  </div>;
}

function MakerAvatar({ launch }: { launch: RoundLaunch }) {
  const name = launch.maker_name || launch.maker_username || 'A founder';
  return <Avatar className="h-5 w-5">
    {launch.maker_avatar && <AvatarImage src={launch.maker_avatar} alt="" />}
    <AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
  </Avatar>;
}

export function LaunchLogo({ name, logoUrl, className }: { name: string; logoUrl: string | null; className?: string }) {
  return logoUrl
    ? <img src={logoUrl} alt="" className={cn('h-12 w-12 shrink-0 rounded-xl object-cover', className)} loading="lazy" decoding="async" />
    : <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-space-grotesk text-lg font-bold text-primary', className)}>{name.charAt(0).toUpperCase()}</div>;
}

/**
 * What a maker can do with their own launch: services to grow it, angels once
 * they reach Traction, or pull it from the round.
 */
export function MyLaunchTools({ myStage, onWithdraw }: { myStage: number | null; onWithdraw: () => void }) {
  const investorReady = (myStage ?? 0) >= INVESTOR_READY_STAGE;
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    <span className="font-medium text-muted-foreground">Grow it:</span>
    <Link to="/marketplace" className="inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-card px-3 font-medium hover:border-primary/60 hover:text-primary">
      <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" />Growth services
    </Link>
    {investorReady && <Link to="/investors" className="inline-flex h-8 items-center gap-1 rounded-full border border-border/70 bg-card px-3 font-medium hover:border-primary/60 hover:text-primary">
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Find your Angel
    </Link>}
    <button type="button" onClick={onWithdraw} className="inline-flex h-8 items-center rounded-full px-3 text-muted-foreground hover:bg-muted hover:text-destructive">Withdraw</button>
  </div>;
}

export function LaunchRow({ launch, closed, onVote }: {
  launch: RoundLaunch;
  closed: boolean;
  onVote: () => void;
}) {
  const makerName = launch.maker_name || launch.maker_username || 'A founder';
  const stageLabel = founderStageLabel(launch.maker_stage);
  const canVote = !closed && !launch.is_mine;
  return <Card className={cn('border-border/70 transition-shadow hover:shadow-md', launch.is_mine && 'border-primary/40')}>
    <CardContent className="flex items-start gap-3 p-4 sm:gap-4">
      <span className={cn('mt-3 w-6 shrink-0 text-center sm:w-7 font-space-grotesk text-sm font-semibold', launch.rank <= 3 ? 'text-primary' : 'text-muted-foreground')}>
        {launch.rank === 1 ? <Crown className="mx-auto h-4 w-4" aria-label="Rank 1" /> : `#${launch.rank}`}
      </span>
      <div className="hidden sm:block"><LaunchLogo name={launch.name} logoUrl={launch.logo_url} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <a href={`/p/${launch.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-space-grotesk font-semibold underline-offset-4 hover:underline">
            {launch.name}<ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </a>
          {launch.is_mine && <Badge variant="outline" className="border-primary/40 text-xs text-primary">Your launch</Badge>}
          {launch.category && <Badge variant="outline" className="text-xs font-normal text-muted-foreground">{launch.category}</Badge>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{launch.headline || launch.tagline || 'See the demo and founder pitch.'}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MakerAvatar launch={launch} />
            {launch.maker_username
              ? <Link to={`/profile/${encodeURIComponent(launch.maker_username)}`} className="no-touch-target !min-h-0 !min-w-0 truncate font-medium text-foreground underline-offset-4 hover:underline">{makerName}</Link>
              : <span className="truncate font-medium text-foreground">{makerName}</span>}
          </span>
          {stageLabel && <span>· Stage {launch.maker_stage} {stageLabel}</span>}
        </div>
      </div>
      <button type="button" onClick={onVote} disabled={!canVote}
        aria-pressed={launch.voted}
        aria-label={launch.is_mine ? `${launch.upvotes} upvotes on your launch` : closed ? `${launch.upvotes} upvotes, round closed` : launch.voted ? `Remove upvote, ${launch.upvotes} upvotes` : `Upvote ${launch.name}, ${launch.upvotes} upvotes`}
        title={launch.is_mine ? 'You cannot upvote your own launch' : closed ? 'This round has closed' : undefined}
        className={cn('flex h-14 w-12 shrink-0 flex-col sm:h-16 sm:w-14 items-center justify-center rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
          launch.voted ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 bg-background',
          canVote && !launch.voted && 'hover:border-primary/60 hover:text-primary')}>
        <ArrowBigUp className={cn('h-5 w-5', launch.voted && 'fill-current')} aria-hidden="true" />
        {launch.upvotes}
      </button>
    </CardContent>
  </Card>;
}

/** Picks one of the founder's published Demo Studio launch pages to enter. */
export function EnterLaunchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const projects = useQuery({ queryKey: ['launchpad-demo-projects', user?.id], queryFn: () => listProjects(user!.id), enabled: Boolean(open && user) });
  const entered = useEnteredLaunchProjects();
  const enter = useEnterLaunch();
  const eligible = (projects.data ?? []).filter((project) => project.launch_published && project.slug && !project.superseded_at);
  const available = eligible.filter((project) => !entered.data?.has(project.id));

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="tool-theme-launches max-w-lg">
      <DialogHeader>
        <DialogTitle>Enter this week's round</DialogTitle>
        <DialogDescription>Pick a published launch page. Each page can be entered once, and you can have one launch per round.</DialogDescription>
      </DialogHeader>
      {projects.isPending && <div role="status" className="h-24 animate-pulse rounded-lg bg-muted/60"><span className="sr-only">Loading your launch pages…</span></div>}
      {projects.isError && <p role="alert" className="text-sm text-destructive">Could not load your launch pages.</p>}
      {projects.isSuccess && available.length === 0 && <div className="space-y-3 rounded-lg border border-dashed p-4 text-sm">
        <p>{eligible.length > 0 ? 'Every published launch page of yours has already been in a round.' : 'You have no published launch page yet.'}</p>
        <Button asChild size="sm"><Link to="/demo-studio">{eligible.length > 0 ? 'Build a new launch page' : 'Publish one in Demo Studio'}</Link></Button>
      </div>}
      <ul className="space-y-2">
        {available.map((project) => <li key={project.id} className="flex items-center gap-3 rounded-lg border border-border/70 p-3">
          <LaunchLogo name={project.name} logoUrl={project.logo_url} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{project.name}</p>
            {project.tagline && <p className="truncate text-sm text-muted-foreground">{project.tagline}</p>}
          </div>
          <Button size="sm" disabled={enter.isPending} onClick={() => enter.mutate(project.id, { onSuccess: () => onOpenChange(false) })}>Enter</Button>
        </li>)}
      </ul>
    </DialogContent>
  </Dialog>;
}

const MEDALS = [
  'from-warning/20 border-warning/50 text-warning',
  'from-muted-foreground/15 border-muted-foreground/40 text-muted-foreground',
  'from-primary/15 border-primary/40 text-primary',
];

/** One of the top three in a round: bigger, with the medal colour of its place. */
export function PodiumCard({ launch, onVote }: { launch: RoundLaunch; onVote: () => void }) {
  const medal = MEDALS[launch.rank - 1] ?? MEDALS[2];
  const makerName = launch.maker_name || launch.maker_username || 'A founder';
  const canVote = !launch.is_mine;
  return <div className={cn('relative flex h-full flex-col rounded-2xl border bg-gradient-to-b to-card p-5 transition-shadow hover:shadow-lg', medal, launch.is_mine && 'ring-2 ring-primary/40')}>
    <div className="flex items-start justify-between gap-3">
      <span className={cn('inline-flex h-8 items-center gap-1 rounded-full border bg-card px-2.5 text-sm font-semibold', medal)}>
        {launch.rank === 1 && <Crown className="h-4 w-4" aria-hidden="true" />}#{launch.rank}
      </span>
      {launch.is_mine && <Badge variant="outline" className="border-primary/40 bg-card text-xs text-primary">Your launch</Badge>}
    </div>
    <div className="mt-4 flex items-center gap-3">
      <LaunchLogo name={launch.name} logoUrl={launch.logo_url} className="h-14 w-14" />
      <div className="min-w-0">
        <a href={`/p/${launch.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-space-grotesk text-lg font-semibold text-foreground underline-offset-4 hover:underline">
          <span className="truncate">{launch.name}</span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </a>
        <p className="truncate text-xs text-muted-foreground">by {makerName}</p>
      </div>
    </div>
    <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">{launch.headline || launch.tagline || 'See the demo and founder pitch.'}</p>
    <button type="button" onClick={onVote} disabled={!canVote} aria-pressed={launch.voted}
      aria-label={launch.is_mine ? `${launch.upvotes} upvotes on your launch` : launch.voted ? `Remove upvote, ${launch.upvotes} upvotes` : `Upvote ${launch.name}, ${launch.upvotes} upvotes`}
      title={launch.is_mine ? 'You cannot upvote your own launch' : undefined}
      className={cn('mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
        launch.voted ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 bg-card text-foreground',
        canVote && !launch.voted && 'hover:border-primary/60 hover:text-primary')}>
      <ArrowBigUp className={cn('h-5 w-5', launch.voted && 'fill-current')} aria-hidden="true" />
      {launch.voted ? 'Upvoted' : launch.is_mine ? 'Upvotes' : 'Upvote'} · {launch.upvotes}
    </button>
  </div>;
}
