import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ArrowRight, Bookmark, Flag, Link2, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AuthorAvatar, AuthorLine, PostMeta, UpvotePill } from '@/components/launchpad/LaunchpadPostCard';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShell';
import { PostComposerDialog } from '@/components/launchpad/PostComposerDialog';
import { copyPostLink } from '@/components/launchpad/postActions';
import { ReportDialog, type ReportTarget } from '@/components/launchpad/ReportDialog';
import { RoomsRail } from '@/components/launchpad/RoomsRail';
import { TopicFollowButton } from '@/components/launchpad/TopicFollowButton';
import { KIND_VISUALS, roomIcon } from '@/components/launchpad/roomVisuals';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCommentMutations, useDeletePost, useLaunchpadComments, useLaunchpadPost, useLaunchpadPosts, useMyProfileSummary, useSavePost, useUpvote,
} from '@/hooks/useLaunchpad';
import { authorName, COMMENT_MAX, postKind } from '@/lib/launchpad';
import { launchpadTopic, postPath, roomPath, ROOMS_PATH } from '@/lib/launchpadTopics';
import { WORKSPACE_ROUTES } from '@/lib/workspaceNavigation';
import CommunityRoomsWallpaper, { RoomsThreadChart } from '@/components/wallpapers/CommunityRoomsWallpaper';
import { cn } from '@/lib/utils';

/** The room this post lives in, and a few more conversations from it. */
function RoomPanel({ slug, postId }: { slug: string; postId: string }) {
  const room = launchpadTopic(slug)!;
  const Icon = roomIcon(slug);
  const more = useLaunchpadPosts({ sort: 'new', topic: slug, limit: 4 });
  const others = (more.data ?? []).filter((post) => post.id !== postId).slice(0, 3);
  const tools = room.tools.filter((tool) => WORKSPACE_ROUTES[tool]);
  return <aside className="space-y-4 lg:col-start-2 xl:sticky xl:top-24 xl:col-start-auto xl:self-start" aria-label={`About ${room.label}`}>
    <section className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <Link to={roomPath(slug)} className="font-space-grotesk font-semibold hover:underline">{room.label}</Link>
          <p className="text-xs text-muted-foreground">Room</p>
        </div>
        <TopicFollowButton slug={slug} label={room.label} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{room.description}</p>
      {tools.length > 0 && <div className="mt-3 space-y-1.5">
        {tools.map((tool) => <Link key={tool} to={WORKSPACE_ROUTES[tool]}
          className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm font-medium hover:border-primary/60 hover:text-primary">
          Open {tool}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>)}
      </div>}
    </section>
    {others.length > 0 && <section className="rounded-xl border border-border/70 bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">More in {room.label}</h2>
      <ul className="divide-y divide-border/60">
        {others.map((post) => <li key={post.id}>
          <Link to={postPath(post.id)} className="block py-2.5 hover:text-primary">
            <p className="line-clamp-2 text-sm font-medium">{post.title || post.content}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{post.upvotes} upvotes · {post.comment_count} replies</p>
          </Link>
        </li>)}
      </ul>
    </section>}
  </aside>;
}

export default function LaunchpadPostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const me = useMyProfileSummary().data;
  const post = useLaunchpadPost(id);
  const comments = useLaunchpadComments(id);
  const { add, remove } = useCommentMutations(id ?? '');
  const upvote = useUpvote();
  const save = useSavePost();
  const removePost = useDeletePost();
  const [reply, setReply] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [report, setReport] = useState<ReportTarget>(null);
  const data = post.data;
  const isOwn = Boolean(data && data.user_id === user?.id);
  const room = launchpadTopic(data?.topic);
  const stripe = data ? KIND_VISUALS[postKind(data.post_type)].stripe : '';
  const myName = me?.full_name || me?.username || 'You';

  const submitReply = async () => {
    if (!reply.trim()) return;
    await add.mutateAsync(reply);
    setReply('');
  };

  return <LaunchpadShell wide theme="rooms" wallpaper={<CommunityRoomsWallpaper />} headerArt={<RoomsThreadChart />} seoTitle={data?.title ? `${data.title} | Rooms` : 'Post | Rooms'} title="Rooms">
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)_17rem]">
      <RoomsRail view={room ? { kind: 'room', slug: room.slug } : { kind: 'all' }} />

      <div className="min-w-0">
        <Link to={room ? roomPath(room.slug) : ROOMS_PATH} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />{room ? `Back to ${room.label}` : 'All rooms'}
        </Link>

        {post.isPending && <div role="status" className="h-64 animate-pulse rounded-xl bg-muted/60"><span className="sr-only">Loading post…</span></div>}
        {post.isError && <p role="alert" className="text-sm text-destructive">Could not load this post. <button className="underline" onClick={() => void post.refetch()}>Retry</button></p>}
        {post.isSuccess && !data && <div className="rounded-xl border border-dashed border-border/80 px-6 py-12 text-center">
          <h2 className="font-space-grotesk text-lg font-semibold">This post is not available</h2>
          <p className="mt-2 text-sm text-muted-foreground">It may have been deleted, or hidden after reports.</p>
          <Button asChild className="mt-4"><Link to={ROOMS_PATH}>Back to rooms</Link></Button>
        </div>}

        {data && <>
          <article className="relative overflow-hidden rounded-xl border border-border/70 bg-card">
            <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', stripe)} />
            <div className="p-5 pl-6 sm:p-6 sm:pl-7">
              <div className="flex items-start gap-3">
                <AuthorAvatar author={data.author} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <AuthorLine author={data.author} createdAt={data.created_at} stage={data.stage} />
                  <PostMeta post={data} />
                </div>
              </div>
              {data.title && <h2 className="mt-4 font-space-grotesk text-2xl font-semibold leading-tight">{data.title}</h2>}
              <p className="mt-3 whitespace-pre-line break-words text-body leading-7">{data.content}</p>
              <div className="mt-5 flex flex-wrap items-center gap-1 border-t border-border/60 pt-4 text-sm text-muted-foreground">
                <UpvotePill post={data} onToggle={() => upvote.mutate({ postId: data.id, on: !data.voted })} />
                <button type="button" onClick={() => save.mutate({ postId: data.id, on: !data.saved })} aria-pressed={data.saved}
                  className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 hover:bg-muted hover:text-foreground', data.saved && 'text-primary')}>
                  <Bookmark className={cn('h-4 w-4', data.saved && 'fill-current')} aria-hidden="true" />{data.saved ? 'Saved' : 'Save'}
                </button>
                <button type="button" onClick={() => void copyPostLink(data.id)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 hover:bg-muted hover:text-foreground">
                  <Link2 className="h-4 w-4" aria-hidden="true" />Copy link
                </button>
                <span className="ml-auto flex items-center gap-1">
                  {isOwn ? <>
                    <button type="button" onClick={() => setEditing(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 hover:bg-muted hover:text-foreground"><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>
                    <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
                  </> : <button type="button" onClick={() => setReport({ postId: data.id })} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 hover:bg-muted hover:text-foreground"><Flag className="h-4 w-4" aria-hidden="true" />Report</button>}
                </span>
              </div>
            </div>
          </article>

          <section aria-labelledby="replies-heading" className="mt-6">
            <h2 id="replies-heading" className="mb-3 flex items-center gap-2 font-space-grotesk text-lg font-semibold">
              <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />{data.comment_count} {data.comment_count === 1 ? 'reply' : 'replies'}
            </h2>

            <form className="mb-5 flex gap-3 rounded-xl border border-border/70 bg-card p-3" onSubmit={(event) => { event.preventDefault(); void submitReply().catch(() => undefined); }}>
              <AuthorAvatar author={me ? { id: user?.id ?? '', username: me.username, full_name: myName, avatar_url: me.avatar_url } : null} className="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <label htmlFor="launchpad-reply" className="sr-only">Write a reply</label>
                <Textarea id="launchpad-reply" rows={reply ? 4 : 2} maxLength={COMMENT_MAX} value={reply} onChange={(event) => setReply(event.target.value)}
                  className="resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
                  placeholder={isOwn ? 'Add context or answer a question…' : 'Be specific: what works, what is unclear, what would you change?'} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{reply.length > 0 && `${reply.length}/${COMMENT_MAX}`}</span>
                  <Button type="submit" size="sm" disabled={!reply.trim() || add.isPending}>{add.isPending ? 'Posting…' : 'Reply'}</Button>
                </div>
              </div>
            </form>

            {comments.isError && <p role="alert" className="text-sm text-destructive">Could not load replies.</p>}
            {comments.isSuccess && comments.data.length === 0 && <p className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-center text-sm text-muted-foreground">No replies yet. The first useful answer tends to get the most upvotes.</p>}
            <ol className="space-y-4">
              {(comments.data ?? []).map((comment) => {
                const isAuthor = comment.user_id === data.user_id;
                return <li key={comment.id} className="flex gap-3">
                  <AuthorAvatar author={comment.author} className="h-8 w-8" />
                  <div className={cn('min-w-0 flex-1 rounded-xl border px-4 py-3', isAuthor ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-card')}>
                    <div className="flex flex-wrap items-center gap-x-2 text-sm">
                      {comment.author?.username
                        ? <Link to={`/profile/${encodeURIComponent(comment.author.username)}`} className="no-touch-target !min-h-0 !min-w-0 font-medium underline-offset-4 hover:underline">{authorName(comment.author)}</Link>
                        : <span className="font-medium">{authorName(comment.author)}</span>}
                      {isAuthor && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Author</span>}
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                      <span className="ml-auto">
                        {comment.user_id === user?.id
                          ? <button type="button" onClick={() => remove.mutate(comment.id)} className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-destructive">Delete</button>
                          : <button type="button" onClick={() => setReport({ commentId: comment.id })} className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">Report</button>}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-line break-words text-sm leading-6">{comment.content}</p>
                  </div>
                </li>;
              })}
            </ol>
          </section>
        </>}
      </div>

      {room && data ? <RoomPanel slug={room.slug} postId={data.id} /> : <div className="hidden xl:block" />}
    </div>

    <PostComposerDialog open={editing} onOpenChange={setEditing} editing={data} />
    <ReportDialog target={report} onClose={() => setReport(null)} />
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent className="tool-theme-rooms">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this post?</AlertDialogTitle>
          <AlertDialogDescription>Its replies and upvotes are deleted with it. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (data) void removePost.mutateAsync(data.id).then(() => navigate(room ? roomPath(room.slug) : ROOMS_PATH)).catch(() => undefined); }}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </LaunchpadShell>;
}
