import { Link } from 'react-router-dom';
import { Bookmark, LayoutGrid, Star, type LucideIcon } from 'lucide-react';
import { useFollowedTopics, useTopicStats } from '@/hooks/useLaunchpad';
import { LAUNCHPAD_TOPIC_GROUP_LABEL, LAUNCHPAD_TOPICS, ROOMS_PATH, roomPath } from '@/lib/launchpadTopics';
import { cn } from '@/lib/utils';
import { roomIcon } from './roomVisuals';

export type RoomView = { kind: 'all' } | { kind: 'following' } | { kind: 'saved' } | { kind: 'room'; slug: string };

const FEEDS: ReadonlyArray<{ kind: 'all' | 'following' | 'saved'; label: string; icon: LucideIcon; to: string }> = [
  { kind: 'all', label: 'All rooms', icon: LayoutGrid, to: ROOMS_PATH },
  { kind: 'following', label: 'Following', icon: Star, to: `${ROOMS_PATH}?view=following` },
  { kind: 'saved', label: 'Saved', icon: Bookmark, to: `${ROOMS_PATH}?view=saved` },
];

function isActive(view: RoomView, kind: RoomView['kind'], slug?: string) {
  return view.kind === kind && (kind !== 'room' || (view.kind === 'room' && view.slug === slug));
}

function RailLink({ to, active, icon: Icon, label, count, followed }: {
  to: string; active: boolean; icon: LucideIcon; label: string; count?: number; followed?: boolean;
}) {
  return <Link to={to} aria-current={active ? 'page' : undefined} className={cn(
    'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground hover:bg-muted',
  )}>
    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} aria-hidden="true" />
    <span className="min-w-0 flex-1 truncate">{label}</span>
    {followed && <Star className="h-3 w-3 shrink-0 fill-warning text-warning" aria-label="Following" />}
    {typeof count === 'number' && count > 0 && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>}
  </Link>;
}

/** The room list: a sticky column on desktop, a chip row on smaller screens. */
export function RoomsRail({ view }: { view: RoomView }) {
  const stats = useTopicStats();
  const followed = useFollowedTopics();

  return <>
    <nav aria-label="Rooms" className="sticky top-24 hidden max-h-screen self-start space-y-5 overflow-y-auto pb-24 pr-1 lg:block">
      <div className="space-y-0.5">
        {FEEDS.map((feed) => <RailLink key={feed.kind} to={feed.to} active={isActive(view, feed.kind)} icon={feed.icon} label={feed.label}
          count={feed.kind === 'following' ? followed.data?.size : undefined} />)}
      </div>
      {(['stage', 'craft'] as const).map((group) => <div key={group}>
        <p className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{LAUNCHPAD_TOPIC_GROUP_LABEL[group]}</p>
        <div className="space-y-0.5">
          {LAUNCHPAD_TOPICS.filter((room) => room.group === group).map((room) => <RailLink key={room.slug} to={roomPath(room.slug)}
            active={isActive(view, 'room', room.slug)} icon={roomIcon(room.slug)} label={room.label}
            count={stats.data?.get(room.slug)?.post_count} followed={followed.data?.has(room.slug)} />)}
        </div>
      </div>)}
    </nav>

    <nav aria-label="Rooms" className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
      {FEEDS.map((feed) => {
        const active = isActive(view, feed.kind);
        return <Link key={feed.kind} to={feed.to} aria-current={active ? 'page' : undefined}
          className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium', active ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground')}>
          <feed.icon className="h-3.5 w-3.5" aria-hidden="true" />{feed.label}
        </Link>;
      })}
      {LAUNCHPAD_TOPICS.map((room) => {
        const Icon = roomIcon(room.slug);
        const active = isActive(view, 'room', room.slug);
        return <Link key={room.slug} to={roomPath(room.slug)} aria-current={active ? 'page' : undefined}
          className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium', active ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground')}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />{room.label}
        </Link>;
      })}
    </nav>
  </>;
}
