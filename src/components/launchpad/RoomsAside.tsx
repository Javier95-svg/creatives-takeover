import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowBigUp, ArrowRight, CheckCircle2, Rocket } from 'lucide-react';
import { useLaunchRound, useTopicStats } from '@/hooks/useLaunchpad';
import { isMissingRoundsError, roundEnd, timeLeft } from '@/lib/launchpadLaunches';
import { LAUNCHPAD_TOPICS, roomPath } from '@/lib/launchpadTopics';
import { LaunchLogo } from './LaunchRoundParts';
import { roomIcon } from './roomVisuals';

const TIPS = [
  'Ask one specific question, not "thoughts?"',
  'Share the link, screenshot or numbers people need.',
  'Reply to every answer. Threads with an author reply get more of them.',
];

function AsideCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-border/70 bg-card p-4">
    <h2 className="mb-3 text-sm font-semibold">{title}</h2>
    {children}
  </section>;
}

function WeeklyLaunches() {
  const round = useLaunchRound(null, 'popular', 3);
  if (round.isError && isMissingRoundsError(round.error)) return null;
  const rows = round.data ?? [];
  const left = timeLeft(roundEnd());
  return <AsideCard title="This week's launches">
    <p className="-mt-2 mb-3 text-xs text-muted-foreground">Round closes in {left.days}d {left.hours}h</p>
    {round.isPending && <div className="h-20 animate-pulse rounded-lg bg-muted/60" />}
    {round.isSuccess && rows.length === 0 && <p className="text-sm text-muted-foreground">No launches yet this week. Be the first one on the board.</p>}
    <ol className="space-y-2.5">
      {rows.map((launch) => <li key={launch.id} className="flex items-center gap-2.5">
        <span className="w-4 text-xs font-semibold tabular-nums text-muted-foreground">{launch.rank}</span>
        <LaunchLogo name={launch.name} logoUrl={launch.logo_url} className="h-8 w-8 rounded-lg text-sm" />
        <a href={`/p/${launch.slug}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">{launch.name}</a>
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums text-muted-foreground"><ArrowBigUp className="h-3.5 w-3.5" aria-hidden="true" />{launch.upvotes}</span>
      </li>)}
    </ol>
    <Link to="/launchpad" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline">
      <Rocket className="h-3.5 w-3.5" aria-hidden="true" />{rows.length ? 'See all launches' : 'Enter your launch'}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  </AsideCard>;
}

function ActiveRooms() {
  const stats = useTopicStats();
  const active = LAUNCHPAD_TOPICS
    .map((room) => ({ room, stat: stats.data?.get(room.slug) }))
    .filter((entry) => entry.stat?.last_post_at)
    .sort((a, b) => new Date(b.stat!.last_post_at!).getTime() - new Date(a.stat!.last_post_at!).getTime())
    .slice(0, 4);
  if (active.length === 0) return null;
  return <AsideCard title="Active rooms">
    <ul className="space-y-1">
      {active.map(({ room, stat }) => {
        const Icon = roomIcon(room.slug);
        return <li key={room.slug}>
          <Link to={roomPath(room.slug)} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm hover:bg-muted">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1 truncate font-medium">{room.label}</span>
            <span className="text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(stat!.last_post_at!))}</span>
          </Link>
        </li>;
      })}
    </ul>
  </AsideCard>;
}

/** The right column on wide screens: what is launching, where people are talking, how to get answers. */
export function RoomsAside() {
  return <aside className="sticky top-24 hidden space-y-4 self-start xl:block" aria-label="Around Chat Rooms">
    <WeeklyLaunches />
    <ActiveRooms />
    <AsideCard title="Get better replies">
      <ul className="space-y-2">
        {TIPS.map((tip) => <li key={tip} className="flex gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{tip}
        </li>)}
      </ul>
    </AsideCard>
  </aside>;
}
