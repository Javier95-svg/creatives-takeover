import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Clapperboard, Coins, Megaphone, Rocket, Trophy } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShell';
import { EnterLaunchDialog, LaunchLogo, LaunchRow, RoundCountdown } from '@/components/launchpad/LaunchRoundParts';
import { useLaunchRound, useMyStage, useSupporterStatus, useToggleLaunchVote, useWithdrawLaunch } from '@/hooks/useLaunchpad';
import { listPublicLaunches } from '@/lib/demoStudio/api';
import { isMissingRoundsError, previousRoundStart, type LaunchSort } from '@/lib/launchpadLaunches';
import { cn } from '@/lib/utils';

const STEPS = [
  { icon: Clapperboard, title: 'Publish a launch page', detail: 'Build it in Demo Studio with an interactive demo, a pitch and an early access list.', to: '/demo-studio', cta: 'Open Demo Studio' },
  { icon: Megaphone, title: 'Enter this week\'s round', detail: 'Rounds run Monday to Sunday (UTC). Founders upvote the launches they would use.', to: '/launchpad/topics/launch', cta: 'Get feedback in #Launch first' },
  { icon: BriefcaseBusiness, title: 'Keep the momentum', detail: 'Marketplace services and, from the Traction stage, the angel network pick up where the round leaves off.', to: '/marketplace', cta: 'Browse Marketplace' },
];

function HowItWorks() {
  return <section aria-labelledby="how-heading">
    <h2 id="how-heading" className="mb-3 font-space-grotesk text-lg font-semibold">How a launch works here</h2>
    <ol className="grid gap-3 md:grid-cols-3">
      {STEPS.map(({ icon: Icon, title, detail, to, cta }, index) => <li key={title}>
        <Card className="h-full border-border/70"><CardContent className="flex h-full flex-col gap-2 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Icon className="h-4 w-4" aria-hidden="true" />Step {index + 1}</div>
          <p className="font-medium">{title}</p>
          <p className="flex-1 text-sm text-muted-foreground">{detail}</p>
          <Link to={to} className="text-sm font-medium text-primary underline-offset-4 hover:underline">{cta}</Link>
        </CardContent></Card>
      </li>)}
    </ol>
  </section>;
}

/** Used until the round functions are deployed: the published launch pages. */
function PublishedLaunches() {
  const launches = useQuery({ queryKey: ['launchpad-launches'], queryFn: () => listPublicLaunches(24) });
  const rows = launches.data ?? [];
  return <>
    {rows.length > 0 && <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((launch) => <Link key={launch.slug} to={`/p/${launch.slug}`} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Card className="h-full border-border/70 transition-shadow group-hover:shadow-md"><CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center gap-3"><LaunchLogo name={launch.name} logoUrl={launch.logo_url} className="h-10 w-10" /><span className="font-semibold group-hover:underline">{launch.name}</span></div>
          <p className="flex-1 text-sm text-muted-foreground">{launch.headline || launch.tagline || 'See the demo and founder pitch.'}</p>
          {launch.category && <Badge variant="secondary" className="w-fit">{launch.category}</Badge>}
        </CardContent></Card>
      </Link>)}
    </div>}
    {launches.isSuccess && rows.length === 0 && <Card className="mb-10 border-dashed"><CardContent className="space-y-3 py-10 text-center">
      <h2 className="font-space-grotesk text-lg font-semibold">Be the first launch on the board</h2>
      <p className="mx-auto max-w-md text-sm text-muted-foreground">Publish your launch page in Demo Studio to appear here.</p>
      <Button asChild className="gap-2"><Link to="/demo-studio">Build your launch page <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></Button>
    </CardContent></Card>}
  </>;
}

/**
 * The Launchpad tab: this week's round, ranked by upvotes from founders, with
 * last week's top three underneath. Supporters earn a capped credit reward for
 * backing launches that are not their own.
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
  const lastRows = lastWeek.data ?? [];
  const status = supporter.data;

  return <LaunchpadShell seoTitle="Launchpad" title="This week's launches"
    intro="Products founders are launching on Creatives Takeover, ranked by upvotes from other founders. Every launch is a Demo Studio launch page with a demo, a pitch and a way to sign up."
    actions={!roundsMissing && <Button onClick={() => setEntering(true)} className="gap-2"><Rocket className="h-4 w-4" aria-hidden="true" />Enter your launch</Button>}>
    {roundsMissing ? <>
      <PublishedLaunches />
      <HowItWorks />
    </> : <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <RoundCountdown />
        <div role="tablist" aria-label="Sort launches" className="flex rounded-lg border border-border/70 p-0.5">
          {(['popular', 'latest'] as const).map((value) => <button key={value} role="tab" type="button" aria-selected={sort === value} onClick={() => setSort(value)}
            className={cn('rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors', sort === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {value}
          </button>)}
        </div>
      </div>

      {status && <p className="mb-5 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <Coins className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{status.eligible
          ? <>Upvote launches you would use and earn 1 credit each, up to {status.weeklyCap} a week. <strong>{status.earnedThisWeek} of {status.weeklyCap}</strong> earned this week.</>
          : <>Upvote launches you would use. Supporter credits unlock once your account is a week old and your email is confirmed.</>}</span>
      </p>}

      {round.isError && !roundsMissing && <p role="alert" className="mb-4 text-sm text-destructive">Could not load this round. <button className="underline" onClick={() => void round.refetch()}>Retry</button></p>}
      {round.isPending && <div role="status" className="space-y-3"><span className="sr-only">Loading launches…</span>
        {[0, 1, 2].map((index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted/60" />)}
      </div>}

      {round.isSuccess && rows.length === 0 && <Card className="mb-8 border-dashed"><CardContent className="space-y-3 py-10 text-center">
        <h2 className="font-space-grotesk text-lg font-semibold">No launches in this round yet</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">Enter a published Demo Studio launch page and you will lead the round from day one.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => setEntering(true)}>Enter your launch</Button>
          <Button variant="outline" asChild><Link to="/demo-studio">Open Demo Studio</Link></Button>
        </div>
      </CardContent></Card>}

      <div className="mb-10 space-y-3">
        {rows.map((launch) => <LaunchRow key={launch.id} launch={launch} closed={false} myStage={myStage}
          onVote={() => vote.mutate({ launchId: launch.id, on: !launch.voted })}
          onWithdraw={() => setWithdrawing(launch.id)} />)}
      </div>

      {lastRows.length > 0 && <section aria-labelledby="last-week-heading" className="mb-10">
        <h2 id="last-week-heading" className="mb-3 flex items-center gap-2 font-space-grotesk text-lg font-semibold"><Trophy className="h-5 w-5 text-primary" aria-hidden="true" />Last week's top launches</h2>
        <div className="space-y-3">
          {lastRows.map((launch) => <LaunchRow key={launch.id} launch={launch} closed myStage={myStage} onVote={() => undefined} onWithdraw={() => undefined} />)}
        </div>
      </section>}

      <HowItWorks />
    </>}

    <EnterLaunchDialog open={entering} onOpenChange={setEntering} />
    <AlertDialog open={Boolean(withdrawing)} onOpenChange={(open) => { if (!open) setWithdrawing(null); }}>
      <AlertDialogContent>
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
