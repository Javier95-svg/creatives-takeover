import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Clapperboard, Coins, Megaphone, Rocket, Trophy } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ExampleLaunches } from '@/components/launchpad/CommunityExamples';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShell';
import { EnterLaunchDialog, LaunchLogo, LaunchRow, MyLaunchTools, PodiumCard, RoundCountdown } from '@/components/launchpad/LaunchRoundParts';
import { useLaunchRound, useMyStage, useSupporterStatus, useToggleLaunchVote, useWithdrawLaunch } from '@/hooks/useLaunchpad';
import { listPublicLaunches } from '@/lib/demoStudio/api';
import { isMissingRoundsError, previousRoundStart, roundEnd, roundStart, type LaunchSort } from '@/lib/launchpadLaunches';
import { roomPath } from '@/lib/launchpadTopics';
import { cn } from '@/lib/utils';
import CommunityLaunchesWallpaper, { LaunchTrajectoryChart } from '@/components/wallpapers/CommunityLaunchesWallpaper';

const STEPS = [
  { icon: Clapperboard, title: 'Publish a launch page', detail: 'Demo, pitch and early access list, built in Demo Studio.', to: '/demo-studio', cta: 'Open Demo Studio' },
  { icon: Megaphone, title: 'Get feedback first', detail: 'Ask the Launch room what to fix before the round starts.', to: roomPath('launch'), cta: 'Go to the Launch room' },
  { icon: BriefcaseBusiness, title: 'Keep the momentum', detail: 'Marketplace services and, from Traction, the angel network.', to: '/marketplace', cta: 'Browse Marketplace' },
];

const DAY = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function roundLabel() {
  const start = roundStart();
  const last = new Date(roundEnd().getTime() - 1);
  return `${DAY.format(start)} – ${DAY.format(last)}`;
}

function HowItWorks() {
  return <section aria-labelledby="how-heading" className="rounded-2xl border border-border/70 bg-muted/30 p-5">
    <h2 id="how-heading" className="mb-4 font-space-grotesk text-lg font-semibold">How a launch works here</h2>
    <ol className="grid gap-4 md:grid-cols-3">
      {STEPS.map(({ icon: Icon, title, detail, to, cta }, index) => <li key={title} className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
          <p className="font-medium">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
          <Link to={to} className="mt-1 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">{cta}</Link>
        </div>
      </li>)}
    </ol>
  </section>;
}

/** Used until the round functions are deployed: the published launch pages. */
function PublishedLaunches() {
  const launches = useQuery({ queryKey: ['launchpad-launches'], queryFn: () => listPublicLaunches(24) });
  const rows = launches.data ?? [];
  return <div className="mb-8">
    {rows.length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((launch) => <Link key={launch.slug} to={`/p/${launch.slug}`} className="group rounded-xl border border-border/70 bg-card p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-center gap-3"><LaunchLogo name={launch.name} logoUrl={launch.logo_url} className="h-10 w-10" /><span className="font-semibold group-hover:underline">{launch.name}</span></div>
        <p className="mt-3 text-sm text-muted-foreground">{launch.headline || launch.tagline || 'See the demo and founder pitch.'}</p>
        {launch.category && <Badge variant="secondary" className="mt-3 w-fit">{launch.category}</Badge>}
      </Link>)}
    </div>}
    {launches.isSuccess && rows.length === 0 && <div className="rounded-2xl border border-dashed border-border/80 px-6 py-10 text-center">
      <h2 className="font-space-grotesk text-lg font-semibold">Be the first launch on the board</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">Publish your launch page in Demo Studio to appear here.</p>
      <Button asChild className="mt-4 gap-2"><Link to="/demo-studio">Build your launch page <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
    </div>}
  </div>;
}

/**
 * Launchpad: this week's round, ranked by upvotes from other founders. The top
 * three sit on a podium; supporters see what their upvotes have earned.
 */
export default function LaunchpadHome() {
  const [sort, setSort] = useState<LaunchSort>('popular');
  const [entering, setEntering] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const round = useLaunchRound(null, sort);
  const lastWeek = useLaunchRound(previousRoundStart(), 'popular', 3);
  const supporter = useSupporterStatus();
  const myStage = useMyStage().data ?? null;
  const vote = useToggleLaunchVote();
  const withdraw = useWithdrawLaunch();
  const roundsMissing = round.isError && isMissingRoundsError(round.error);
  const rows = round.data ?? [];
  const mine = rows.find((launch) => launch.is_mine);
  const podium = sort === 'popular' ? rows.slice(0, 3) : [];
  const rest = sort === 'popular' ? rows.slice(3) : rows;
  const lastRows = lastWeek.data ?? [];
  const status = supporter.data;
  const totalVotes = rows.reduce((sum, launch) => sum + launch.upvotes, 0);
  const voteFor = (id: string, on: boolean) => vote.mutate({ launchId: id, on });

  return <LaunchpadShell theme="launches" wallpaper={<CommunityLaunchesWallpaper />} headerArt={<LaunchTrajectoryChart />}
    seoTitle="Launchpad | Community" title="Launchpad"
    intro="Weekly rounds of products founders are launching on Creatives Takeover, ranked by upvotes from other founders.">
    {roundsMissing ? <>
      <PublishedLaunches />
      <HowItWorks />
    </> : <>
      <section aria-label="This week's round" className="relative mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-primary/5 to-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 max-w-md">
            <Badge variant="outline" className="border-primary/40 bg-card/70 text-xs text-primary">Round · {roundLabel()}</Badge>
            <h2 className="mt-3 font-space-grotesk text-2xl font-semibold">This week's launches</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length > 0 ? `${rows.length} ${rows.length === 1 ? 'launch' : 'launches'} · ${totalVotes} ${totalVotes === 1 ? 'upvote' : 'upvotes'} so far` : 'The round is open. Be the first launch on the board.'}
            </p>
            {mine
              ? <div className="mt-4 space-y-3">
                  <p className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-card px-3 py-2 text-sm">
                    <Rocket className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span><strong>{mine.name}</strong> is #{mine.rank} with {mine.upvotes} {mine.upvotes === 1 ? 'upvote' : 'upvotes'}</span>
                  </p>
                  <MyLaunchTools myStage={myStage} onWithdraw={() => setWithdrawing(mine.id)} />
                </div>
              : <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button onClick={() => setEntering(true)} className="gap-2"><Rocket className="h-4 w-4" aria-hidden="true" />Enter your launch</Button>
                  <Button variant="ghost" asChild><Link to={roomPath('launch')}>Ask the Launch room</Link></Button>
                </div>}
          </div>
          <RoundCountdown />
        </div>
      </section>

      {status && <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning"><Coins className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{status.eligible ? 'Support launches, earn credits' : 'Supporter credits unlock soon'}</p>
          <p className="text-xs text-muted-foreground">{status.eligible
            ? `1 credit for each product you upvote, up to ${status.weeklyCap} a week.`
            : 'Your account needs to be a week old with a confirmed email. Your upvotes still count.'}</p>
        </div>
        {status.eligible && <div className="w-full sm:w-48">
          <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">This week</span><span className="font-semibold tabular-nums">{status.earnedThisWeek}/{status.weeklyCap}</span></div>
          <Progress className="h-2 bg-muted" value={(status.earnedThisWeek / Math.max(1, status.weeklyCap)) * 100} aria-label={`${status.earnedThisWeek} of ${status.weeklyCap} supporter credits earned this week`} />
        </div>}
      </div>}

      {round.isError && !roundsMissing && <p role="alert" className="mb-4 text-sm text-destructive">Could not load this round. <button className="underline" onClick={() => void round.refetch()}>Retry</button></p>}
      {round.isPending && <div role="status" className="grid gap-3 md:grid-cols-3"><span className="sr-only">Loading launches…</span>
        {[0, 1, 2].map((index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted/60" />)}
      </div>}

      {round.isSuccess && rows.length > 0 && <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-space-grotesk text-lg font-semibold">{sort === 'popular' ? 'Leaderboard' : 'Newest first'}</h2>
        <div role="tablist" aria-label="Sort launches" className="flex rounded-lg border border-border/70 bg-muted/40 p-0.5">
          {(['popular', 'latest'] as const).map((value) => <button key={value} role="tab" type="button" aria-selected={sort === value} onClick={() => setSort(value)}
            className={cn('rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors', sort === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {value}
          </button>)}
        </div>
      </div>}

      {podium.length > 0 && <div className="mb-4 grid gap-3 md:grid-cols-3">
        {podium.map((launch) => <PodiumCard key={launch.id} launch={launch} onVote={() => voteFor(launch.id, !launch.voted)} />)}
      </div>}

      {rest.length > 0 && <div className="mb-8 space-y-3">
        {rest.map((launch) => <LaunchRow key={launch.id} launch={launch} closed={false} onVote={() => voteFor(launch.id, !launch.voted)} />)}
      </div>}

      {round.isSuccess && rows.length === 0 && <ExampleLaunches />}

      {lastRows.length > 0 && <section aria-labelledby="last-week-heading" className="mb-8">
        <h2 id="last-week-heading" className="mb-3 flex items-center gap-2 font-space-grotesk text-lg font-semibold"><Trophy className="h-5 w-5 text-warning" aria-hidden="true" />Last week's winners</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {lastRows.map((launch) => <a key={launch.id} href={`/p/${launch.slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 transition-shadow hover:shadow-md">
            <span className="w-5 text-center font-space-grotesk text-sm font-semibold text-muted-foreground">#{launch.rank}</span>
            <LaunchLogo name={launch.name} logoUrl={launch.logo_url} className="h-9 w-9 rounded-lg text-sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{launch.name}</span>
              <span className="block text-xs text-muted-foreground">{launch.upvotes} upvotes</span>
            </span>
          </a>)}
        </div>
      </section>}

      <HowItWorks />
    </>}

    <EnterLaunchDialog open={entering} onOpenChange={setEntering} />
    <AlertDialog open={Boolean(withdrawing)} onOpenChange={(open) => { if (!open) setWithdrawing(null); }}>
      <AlertDialogContent className="tool-theme-launches">
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw your launch?</AlertDialogTitle>
          <AlertDialogDescription>It leaves this round and loses its upvotes. You can enter it again in a later round.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (withdrawing) withdraw.mutate(withdrawing); setWithdrawing(null); }}>Withdraw</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </LaunchpadShell>;
}
