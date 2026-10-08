import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowBigUp, Bookmark, Flag, FolderKanban, Link2, MessageSquare, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { founderStageLabel } from '@/lib/bizmapStageOrder';
import { authorName, postKind, postKindLabel, type LaunchpadAuthor, type LaunchpadPost } from '@/lib/launchpad';
import { launchpadTopic, postPath, roomPath } from '@/lib/launchpadTopics';
import { cn } from '@/lib/utils';
import { copyPostLink } from './postActions';
import { KIND_VISUALS, roomIcon } from './roomVisuals';

export function AuthorAvatar({ author, className }: { author: LaunchpadAuthor | null; className?: string }) {
  const name = authorName(author);
  return <Avatar className={cn('h-9 w-9', className)}>
    {author?.avatar_url && <AvatarImage src={author.avatar_url} alt="" />}
    <AvatarFallback className="text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
  </Avatar>;
}

export function AuthorLine({ author, createdAt, stage }: { author: LaunchpadAuthor | null; createdAt: string; stage?: number | null }) {
  const name = authorName(author);
  const stageLabel = founderStageLabel(stage);
  return <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
    {author?.username
      ? <Link to={`/profile/${encodeURIComponent(author.username)}`} className="no-touch-target !min-h-0 !min-w-0 truncate font-medium underline-offset-4 hover:underline">{name}</Link>
      : <span className="truncate font-medium">{name}</span>}
    {stageLabel && <span className="text-xs text-muted-foreground">· Stage {stage} {stageLabel}</span>}
    <span className="text-xs text-muted-foreground">· {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
  </div>;
}

export function KindBadge({ value }: { value: string | null }) {
  const kind = postKind(value);
  const { icon: Icon, badge } = KIND_VISUALS[kind];
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium', badge)}>
    <Icon className="h-3 w-3" aria-hidden="true" />{postKindLabel(value)}
  </span>;
}

export function RoomChip({ slug }: { slug: string | null }) {
  const room = launchpadTopic(slug);
  if (!room) return null;
  const Icon = roomIcon(room.slug);
  return <Link to={roomPath(room.slug)} className="no-touch-target inline-flex !min-h-0 !min-w-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary">
    <Icon className="h-3 w-3" aria-hidden="true" />{room.label}
  </Link>;
}

export function PostMeta({ post }: { post: Pick<LaunchpadPost, 'post_type' | 'topic' | 'project_name'> }) {
  return <div className="flex flex-wrap items-center gap-1.5">
    <KindBadge value={post.post_type} />
    <RoomChip slug={post.topic} />
    {post.project_name && <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-0.5 text-xs font-medium">
      <FolderKanban className="h-3 w-3" aria-hidden="true" />{post.project_name}
    </span>}
  </div>;
}

export function UpvotePill({ post, onToggle, disabled }: { post: LaunchpadPost; onToggle: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onToggle} disabled={disabled}
    aria-pressed={post.voted} aria-label={post.voted ? `Remove upvote, ${post.upvotes} upvotes` : `Upvote, ${post.upvotes} upvotes`}
    className={cn('inline-flex h-8 items-center gap-1 rounded-full border px-3 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
      post.voted ? 'border-primary bg-primary text-primary-foreground' : 'border-border/70 bg-background hover:border-primary/60 hover:text-primary')}>
    <ArrowBigUp className={cn('h-4 w-4', post.voted && 'fill-current')} aria-hidden="true" />{post.upvotes}
  </button>;
}

/**
 * A post in a room. The coloured edge says what kind of post it is before the
 * title is read; the footer holds the actions people use most.
 */
export function LaunchpadPostCard({ post, isOwn, onUpvote, onSave, onReport }: {
  post: LaunchpadPost;
  isOwn: boolean;
  onUpvote: () => void;
  onSave: () => void;
  onReport: () => void;
}) {
  const href = postPath(post.id);
  const { stripe } = KIND_VISUALS[postKind(post.post_type)];
  return <article className="group relative overflow-hidden rounded-xl border border-border/70 bg-card transition-all hover:border-primary/40 hover:shadow-md">
    <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', stripe)} />
    <div className="p-4 pl-5 sm:p-5 sm:pl-6">
      <div className="flex items-start gap-3">
        <AuthorAvatar author={post.author} className="h-8 w-8" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <AuthorLine author={post.author} createdAt={post.created_at} stage={post.stage} />
          <PostMeta post={post} />
        </div>
      </div>
      <Link to={href} className="mt-3 block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {post.title && <h2 className="font-space-grotesk text-lg font-semibold leading-snug group-hover:text-primary">{post.title}</h2>}
        <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">{post.content}</p>
      </Link>
      <div className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
        <UpvotePill post={post} onToggle={onUpvote} />
        <Link to={href} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 hover:bg-muted hover:text-foreground">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {post.comment_count}<span className="sr-only sm:not-sr-only">{post.comment_count === 1 ? 'reply' : 'replies'}</span>
        </Link>
        <button type="button" onClick={onSave} aria-pressed={post.saved} aria-label={post.saved ? 'Remove from saved' : 'Save post'}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 hover:bg-muted hover:text-foreground', post.saved && 'text-primary')}>
          <Bookmark className={cn('h-4 w-4', post.saved && 'fill-current')} aria-hidden="true" /><span className="hidden sm:inline">{post.saved ? 'Saved' : 'Save'}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="More actions">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void copyPostLink(post.id)}><Link2 className="mr-2 h-4 w-4" />Copy link</DropdownMenuItem>
            {!isOwn && <DropdownMenuItem onSelect={onReport}><Flag className="mr-2 h-4 w-4" />Report</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </article>;
}
