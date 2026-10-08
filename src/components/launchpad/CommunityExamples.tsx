import { Info, PenSquare, Rocket, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { founderStageLabel } from '@/lib/bizmapStageOrder';
import { EXAMPLE_LAUNCHES, examplesForRoom, type ExamplePost } from '@/lib/communityExamples';
import { postKind, type PostKind } from '@/lib/launchpad';
import { cn } from '@/lib/utils';
import { KindBadge, RoomChip } from './LaunchpadPostCard';
import { KIND_VISUALS } from './roomVisuals';
import { LaunchLogo } from './LaunchRoundParts';

function ExampleBadge() {
  return <span className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">Example</span>;
}

function ExamplePostCard({ post, onUse }: { post: ExamplePost; onUse: () => void }) {
  const { stripe } = KIND_VISUALS[postKind(post.kind)];
  const stage = founderStageLabel(post.stage);
  return <article className="relative overflow-hidden rounded-xl border border-dashed border-border/80 bg-card/70">
    <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1 opacity-60', stripe)} />
    <div className="p-4 pl-5 sm:p-5 sm:pl-6">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
            <span className="font-medium">{post.author}</span>
            {stage && <span className="text-xs text-muted-foreground">· Stage {post.stage} {stage}</span>}
            <ExampleBadge />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <KindBadge value={post.kind} />
            <RoomChip slug={post.room} />
          </div>
        </div>
      </div>
      <h3 className="mt-3 font-space-grotesk text-lg font-semibold leading-snug">{post.title}</h3>
      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{post.body}</p>
      <div className="mt-3">
        <Button type="button" variant="outline" size="sm" onClick={onUse} className="gap-1.5">
          <PenSquare className="h-4 w-4" aria-hidden="true" />Post something like this
        </Button>
      </div>
    </div>
  </article>;
}

/**
 * Shown while a room (or all rooms) has no real posts: what good posts look
 * like, each one a starting point for the composer.
 */
export function ExamplePosts({ room, onCompose }: { room?: string | null; onCompose: (kind: PostKind, room: string) => void }) {
  const examples = examplesForRoom(room);
  return <section aria-labelledby="examples-heading" className="space-y-3">
    <div className="rounded-xl border border-border/70 bg-card p-4">
      <h2 id="examples-heading" className="font-space-grotesk text-lg font-semibold">{room ? 'No posts here yet' : 'Be the first to post'}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Here is the kind of post that gets useful replies. Start from one of these or write your own.</p>
      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Examples are illustrative and not written by members. They disappear once real posts arrive.
      </p>
    </div>
    {examples.map((post) => <ExamplePostCard key={post.id} post={post} onUse={() => onCompose(post.kind, post.room)} />)}
  </section>;
}

/** Shown while this week's round is empty: how the board will read, plainly marked. */
export function ExampleLaunches() {
  return <section aria-labelledby="example-launches-heading" className="mb-8 space-y-4">
    <div className="rounded-2xl border border-dashed border-border/80 px-6 py-8 text-center">
      <Rocket className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
      <h2 id="example-launches-heading" className="mt-2 font-space-grotesk text-lg font-semibold">No launches in this round yet</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">Enter a published Demo Studio launch page and you lead the round from day one. This is how the board will look once launches are in.</p>
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      {EXAMPLE_LAUNCHES.map((launch, index) => <div key={launch.id} className="flex h-full flex-col rounded-2xl border border-dashed border-border/80 bg-card/70 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex h-8 items-center rounded-full border border-border/70 px-2.5 text-sm font-semibold text-muted-foreground">#{index + 1}</span>
          <ExampleBadge />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <LaunchLogo name={launch.name} logoUrl={null} className="h-12 w-12 opacity-80" />
          <div className="min-w-0">
            <p className="truncate font-space-grotesk font-semibold">{launch.name}</p>
            <p className="truncate text-xs text-muted-foreground">{launch.author} · {launch.category}</p>
          </div>
        </div>
        <p className="mt-3 flex-1 text-sm text-muted-foreground">{launch.headline}</p>
      </div>)}
    </div>
    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <Info className="h-3.5 w-3.5" aria-hidden="true" />Example products, not real entries.
    </p>
  </section>;
}
