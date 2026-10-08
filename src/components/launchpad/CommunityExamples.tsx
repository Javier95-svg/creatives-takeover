import { ArrowBigDown, ArrowBigUp, Info, MessageCircle } from 'lucide-react';
import { founderStageLabel } from '@/lib/bizmapStageOrder';
import { EXAMPLE_LAUNCHES, examplesForRoom, type ExamplePost } from '@/lib/communityExamples';
import { postKind, type PostKind } from '@/lib/launchpad';
import { cn } from '@/lib/utils';
import { ExampleAvatar, ExampleLogo } from './ExampleArt';
import { KindBadge, RoomChip } from './LaunchpadPostCard';
import { KIND_VISUALS } from './roomVisuals';

function ExampleBadge() {
  return <span className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">Example</span>;
}

function ExamplePostCard({ post, onUse }: { post: ExamplePost; onUse: () => void }) {
  const { stripe } = KIND_VISUALS[postKind(post.kind)];
  const stage = founderStageLabel(post.stage);
  return <article className="relative overflow-hidden rounded-xl border border-border/70 bg-card">
    <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', stripe)} />
    <div className="p-4 pl-5 sm:p-5 sm:pl-6">
      <div className="flex items-start gap-3">
        <ExampleAvatar look={post.author.look} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
            <span className="font-medium">{post.author.name}</span>
            <span className="hidden text-muted-foreground sm:inline">@{post.author.handle}</span>
            {stage && <span className="text-xs text-muted-foreground">· Stage {post.stage} {stage}</span>}
            <span className="text-xs text-muted-foreground">· {post.ago}</span>
            <ExampleBadge />
          </div>
          <p className="text-xs text-muted-foreground">{post.author.role}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <KindBadge value={post.kind} />
            <RoomChip slug={post.room} />
          </div>
        </div>
      </div>
      <h3 className="mt-3 font-space-grotesk text-lg font-semibold leading-snug">{post.title}</h3>
      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{post.body}</p>
      {/* Reddit-style indicators. Examples have no real votes, so the pills
          say what they do instead of showing invented numbers. Reply opens
          the composer on the same kind of post and room. */}
      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="inline-flex h-9 items-center gap-1 rounded-full bg-muted px-2 text-muted-foreground" title="Voting opens on real posts">
          <ArrowBigUp className="h-5 w-5" aria-hidden="true" />
          <span className="px-0.5 text-xs font-medium">Vote</span>
          <ArrowBigDown className="h-5 w-5" aria-hidden="true" />
        </span>
        <button type="button" onClick={onUse} aria-label={`Reply with a post like "${post.title}"`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-muted px-3 font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />Reply
        </button>
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
  return <section aria-label="Example posts" className="space-y-3">
    <p className="flex items-start gap-1.5 px-1 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Examples are illustrative: the people and posts are invented, not members. They disappear once real posts arrive.
    </p>
    {examples.map((post) => <ExamplePostCard key={post.id} post={post} onUse={() => onCompose(post.kind, post.room)} />)}
  </section>;
}

/** Shown while this week's round is empty: how the board will read, plainly marked. */
export function ExampleLaunches() {
  return <section aria-label="Example launches" className="mb-8 space-y-4">
    <div className="grid gap-3 md:grid-cols-3">
      {EXAMPLE_LAUNCHES.map((launch, index) => <div key={launch.id} className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex h-8 items-center rounded-full border border-border/70 px-2.5 text-sm font-semibold text-muted-foreground">#{index + 1}</span>
          <ExampleBadge />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <ExampleLogo logo={launch.logo} />
          <div className="min-w-0">
            <p className="truncate font-space-grotesk text-lg font-semibold">{launch.name}</p>
            <p className="truncate text-xs text-muted-foreground">{launch.category}</p>
          </div>
        </div>
        <p className="mt-3 flex-1 text-sm text-muted-foreground">{launch.headline}</p>
        <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <ExampleAvatar look={launch.maker.look} className="h-6 w-6" />
          <span>by <span className="font-medium text-foreground">{launch.maker.name}</span></span>
        </div>
      </div>)}
    </div>
    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <Info className="h-3.5 w-3.5" aria-hidden="true" />Example products and makers are invented, not real entries.
    </p>
  </section>;
}
