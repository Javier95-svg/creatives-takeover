import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowBigUp, Bookmark, Flag, FolderKanban, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { founderStageLabel } from '@/lib/bizmapStageOrder';
import { authorName, postKind, postKindLabel, type LaunchpadAuthor, type LaunchpadPost } from '@/lib/launchpad';
import { launchpadTopic } from '@/lib/launchpadTopics';
import { cn } from '@/lib/utils';

const KIND_STYLE: Record<string, string> = {
  feedback: 'border-primary/40 bg-primary/10 text-primary',
  milestone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  idea: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  discussion: 'border-border bg-muted/60 text-foreground',
};


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
  return <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
    {author?.username
      ? <Link to={`/profile/${encodeURIComponent(author.username)}`} className="inline-flex min-w-0 items-center truncate font-medium underline-offset-4 hover:underline">{name}</Link>
      : <span className="truncate font-medium">{name}</span>}
    {author?.username && <span className="hidden truncate text-muted-foreground sm:inline">@{author.username}</span>}
    {stageLabel && <span className="text-xs text-muted-foreground">· Stage {stage} {stageLabel}</span>}
    <span className="text-xs text-muted-foreground">· {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
  </div>;
}

export function PostMeta({ post }: { post: Pick<LaunchpadPost, 'post_type' | 'topic' | 'project_name'> }) {
  const kind = postKind(post.post_type);
  const topic = launchpadTopic(post.topic);
  return <div className="flex flex-wrap items-center gap-1.5">
    <Badge variant="outline" className={cn('text-xs font-medium', KIND_STYLE[kind])}>{postKindLabel(post.post_type)}</Badge>
    {topic && <Link to={`/launchpad/topics/${topic.slug}`} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Badge variant="secondary" className="text-xs hover:bg-secondary/70">#{topic.label}</Badge>
    </Link>}
    {post.project_name && <Badge variant="outline" className="gap-1 text-xs"><FolderKanban className="h-3 w-3" aria-hidden="true" />{post.project_name}</Badge>}
  </div>;
}

export function UpvoteButton({ post, onToggle, disabled }: { post: LaunchpadPost; onToggle: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onToggle} disabled={disabled}
    aria-pressed={post.voted} aria-label={post.voted ? `Remove upvote, ${post.upvotes} upvotes` : `Upvote, ${post.upvotes} upvotes`}
    className={cn('flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
      post.voted ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 bg-background hover:border-primary/60 hover:text-primary')}>
    <ArrowBigUp className={cn('h-5 w-5', post.voted && 'fill-current')} aria-hidden="true" />
    {post.upvotes}
  </button>;
}

export function LaunchpadPostCard({ post, isOwn, onUpvote, onSave, onReport }: {
  post: LaunchpadPost;
  isOwn: boolean;
  onUpvote: () => void;
  onSave: () => void;
  onReport: () => void;
}) {
  const href = `/launchpad/posts/${post.id}`;
  return <Card className="border-border/70 transition-shadow hover:shadow-md">
    <CardContent className="flex gap-4 p-4 sm:p-5">
      <UpvoteButton post={post} onToggle={onUpvote} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <AuthorAvatar author={post.author} className="hidden sm:flex" />
          <div className="min-w-0 flex-1 space-y-2">
            <AuthorLine author={post.author} createdAt={post.created_at} stage={post.stage} />
            <PostMeta post={post} />
          </div>
        </div>
        <Link to={href} className="mt-3 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {post.title && <h2 className="font-space-grotesk text-lg font-semibold leading-snug hover:underline">{post.title}</h2>}
          <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{post.content}</p>
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link to={href} className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {post.comment_count} {post.comment_count === 1 ? 'reply' : 'replies'}
          </Link>
          <button type="button" onClick={onSave} aria-pressed={post.saved} className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground', post.saved && 'text-primary')}>
            <Bookmark className={cn('h-4 w-4', post.saved && 'fill-current')} aria-hidden="true" />{post.saved ? 'Saved' : 'Save'}
          </button>
          {!isOwn && <button type="button" onClick={onReport} className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground">
            <Flag className="h-4 w-4" aria-hidden="true" />Report
          </button>}
        </div>
      </div>
    </CardContent>
  </Card>;
}
