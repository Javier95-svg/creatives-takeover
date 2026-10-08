import { useState, type ReactNode } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bookmark, LayoutGrid, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExamplePosts } from '@/components/launchpad/CommunityExamples';
import { InlineComposer } from '@/components/launchpad/InlineComposer';
import { useRequireAccount } from '@/components/launchpad/requireAccount';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShell';
import { PostComposerDialog } from '@/components/launchpad/PostComposerDialog';
import { PostFeed } from '@/components/launchpad/PostFeed';
import { RoomsAside } from '@/components/launchpad/RoomsAside';
import { RoomsRail, type RoomView } from '@/components/launchpad/RoomsRail';
import { TopicFollowButton } from '@/components/launchpad/TopicFollowButton';
import { roomIcon } from '@/components/launchpad/roomVisuals';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowedTopics, useTopicStats } from '@/hooks/useLaunchpad';
import type { PostKind } from '@/lib/launchpad';
import { LAUNCHPAD_TOPICS, launchpadTopic, RETIRED_ROOMS, roomPath, ROOMS_PATH } from '@/lib/launchpadTopics';
import { WORKSPACE_ROUTES } from '@/lib/workspaceNavigation';
import CommunityRoomsWallpaper, { RoomsThreadChart } from '@/components/wallpapers/CommunityRoomsWallpaper';

function EmptyState({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border/80 bg-card/50 px-6 py-12 text-center">
    <h2 className="font-space-grotesk text-lg font-semibold">{title}</h2>
    <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>
    {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
  </div>;
}

/** The header for a single room: what it is for, its pulse, and the CT tools behind it. */
function RoomHeader({ slug }: { slug: string }) {
  const room = launchpadTopic(slug)!;
  const stat = useTopicStats().data?.get(slug);
  const Icon = roomIcon(slug);
  const tools = room.tools.filter((tool) => WORKSPACE_ROUTES[tool]);
  return <div className="mb-5 overflow-hidden rounded-xl border border-border/70 bg-card">
    <div className="flex flex-wrap items-start gap-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4 sm:p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Icon className="h-6 w-6" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <h2 className="font-space-grotesk text-xl font-semibold">{room.label}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{room.description}</p>
        {stat && <p className="mt-1.5 text-xs text-muted-foreground">
          {stat.post_count} {stat.post_count === 1 ? 'post' : 'posts'} · {stat.follower_count} following
          {stat.last_post_at && <> · active {formatDistanceToNowStrict(new Date(stat.last_post_at), { addSuffix: true })}</>}
        </p>}
      </div>
      <TopicFollowButton slug={slug} label={room.label} size="default" />
    </div>
    {tools.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-3 text-sm sm:px-5">
      <span className="text-xs font-medium text-muted-foreground">Work on it in</span>
      {tools.map((tool) => <Link key={tool} to={WORKSPACE_ROUTES[tool]}
        className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs font-medium hover:border-primary/60 hover:text-primary">
        {tool}<ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>)}
    </div>}
  </div>;
}

/** Following with no rooms followed yet: offer the rooms right here. */
function PickRooms() {
  return <EmptyState title="Follow a few rooms" body="Your Following feed shows posts from the rooms you follow. Start with your stage and the skill you need most.">
    <div className="flex max-w-xl flex-wrap justify-center gap-2">
      {LAUNCHPAD_TOPICS.map((room) => <TopicFollowButton key={room.slug} slug={room.slug} label={room.label} named />)}
    </div>
  </EmptyState>;
}

/**
 * Rooms: one feed, sliced by room. All rooms, the rooms you follow, your
 * saved posts, or a single room, with the composer always one click away.
 */
export default function LaunchpadRooms() {
  const { slug } = useParams<{ slug?: string }>();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const followed = useFollowedTopics();
  const requireAccount = useRequireAccount();
  const [composing, setComposing] = useState<{ kind?: PostKind; topic?: string } | null>(null);

  if (slug && !launchpadTopic(slug)) {
    const merged = RETIRED_ROOMS[slug];
    return <Navigate to={merged ? roomPath(merged) : ROOMS_PATH} replace />;
  }
  const viewParam = params.get('view');
  const view: RoomView = slug ? { kind: 'room', slug }
    : viewParam === 'following' ? { kind: 'following' }
    : viewParam === 'saved' ? { kind: 'saved' }
    : { kind: 'all' };
  const room = view.kind === 'room' ? launchpadTopic(view.slug) : null;
  const followedList = followed.data ? [...followed.data] : null;
  const compose = (kind?: PostKind, topic?: string) => { if (requireAccount('start a conversation')) setComposing({ kind, topic }); };

  const heading = view.kind === 'following' ? { icon: Star, title: 'Following', body: 'New posts from the rooms you follow.' }
    : view.kind === 'saved' ? { icon: Bookmark, title: 'Saved', body: 'Posts you saved to come back to.' }
    : view.kind === 'all' ? { icon: LayoutGrid, title: 'All rooms', body: 'Every conversation across the rooms.' }
    : null;

  return <LaunchpadShell wide theme="rooms" wallpaper={<CommunityRoomsWallpaper />} headerArt={<RoomsThreadChart />}
    seoTitle={room ? `${room.label} | Rooms` : 'Rooms | Community'} title="Rooms"
    intro="Talk shop with founders by stage and skill. Ask for feedback, share wins and test ideas.">
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)_17rem]">
      <RoomsRail view={view} />

      <div className="min-w-0">
        {room ? <RoomHeader slug={room.slug} /> : heading && <div className="mb-4 flex items-center gap-2.5">
          <heading.icon className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-space-grotesk text-xl font-semibold">{heading.title}</h2>
          <span className="hidden text-sm text-muted-foreground sm:inline">· {heading.body}</span>
        </div>}

        {view.kind !== 'saved' && <InlineComposer room={room?.slug} onCompose={compose} />}

        {!user && (view.kind === 'following' || view.kind === 'saved')
          ? <EmptyState title={view.kind === 'saved' ? 'Save posts to read later' : 'Follow the rooms you care about'}
              body="Create a free account to follow rooms and keep a list of saved posts.">
              <Button asChild><Link to={`/signup?source=community&return=${encodeURIComponent(`/rooms?view=${view.kind}`)}`}>Sign up free</Link></Button>
              <Button variant="outline" asChild><Link to="/rooms">Browse all rooms</Link></Button>
            </EmptyState>
          : view.kind === 'following' && followed.isSuccess && followed.data.size === 0
          ? <PickRooms />
          : <PostFeed
              key={view.kind === 'room' ? view.slug : view.kind}
              topic={room?.slug ?? null}
              topics={view.kind === 'following' ? followedList : null}
              savedOnly={view.kind === 'saved'}
              empty={view.kind === 'saved'
                ? <EmptyState title="Nothing saved yet" body="Save posts you want to come back to. They stay private to you.">
                    <Button variant="outline" asChild><Link to="/rooms">Browse rooms</Link></Button>
                  </EmptyState>
                : view.kind === 'following'
                  ? <EmptyState title="No posts in your rooms yet" body="New posts from the rooms you follow will show up here.">
                      <Button variant="outline" asChild><Link to="/rooms">Browse all rooms</Link></Button>
                    </EmptyState>
                  : <ExamplePosts room={room?.slug ?? null} onCompose={(kind, exampleRoom) => compose(kind, exampleRoom)} />} />}
      </div>

      <RoomsAside />
    </div>

    <PostComposerDialog open={Boolean(composing)} onOpenChange={(open) => { if (!open) setComposing(null); }}
      initialTopic={composing?.topic ?? room?.slug ?? null} initialKind={composing?.kind} />
  </LaunchpadShell>;
}

