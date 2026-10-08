import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ArrowRight, Bookmark, Flag, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AuthorAvatar, AuthorLine, PostMeta, UpvoteButton } from '@/components/launchpad/LaunchpadPostCard';
import { LaunchpadShell } from '@/components/launchpad/LaunchpadShell';
import { PostComposerDialog } from '@/components/launchpad/PostComposerDialog';
import { ReportDialog, type ReportTarget } from '@/components/launchpad/ReportDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCommentMutations, useDeletePost, useLaunchpadComments, useLaunchpadPost, useSavePost, useUpvote } from '@/hooks/useLaunchpad';
import { authorName, COMMENT_MAX } from '@/lib/launchpad';
import { launchpadTopic } from '@/lib/launchpadTopics';
import { WORKSPACE_ROUTES } from '@/lib/workspaceNavigation';
import { cn } from '@/lib/utils';

export default function LaunchpadPostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const topic = launchpadTopic(data?.topic);

  const submitReply = async () => {
    if (!reply.trim()) return;
    await add.mutateAsync(reply);
    setReply('');
  };

  return <LaunchpadShell seoTitle={data?.title ? `${data.title} | Launchpad` : 'Post | Launchpad'} title="Posts"
    intro="Ask for feedback, share milestones and test ideas with founders working through the same stages as you.">
    <Link to="/launchpad/posts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />All posts
    </Link>

    {post.isPending && <div role="status" className="h-64 animate-pulse rounded-xl bg-muted/60"><span className="sr-only">Loading post…</span></div>}
    {post.isError && <p role="alert" className="text-sm text-destructive">Could not load this post. <button className="underline" onClick={() => void post.refetch()}>Retry</button></p>}
    {post.isSuccess && !data && <Card><CardContent className="py-12 text-center">
      <h2 className="font-space-grotesk text-lg font-semibold">This post is not available</h2>
      <p className="mt-2 text-sm text-muted-foreground">It may have been deleted, or hidden after reports.</p>
      <Button asChild className="mt-4"><Link to="/launchpad/posts">Back to posts</Link></Button>
    </CardContent></Card>}

    {data && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="min-w-0 space-y-6">
        <Card className="border-border/70">
          <CardContent className="flex gap-4 p-5 sm:p-6">
            <UpvoteButton post={data} onToggle={() => upvote.mutate({ postId: data.id, on: !data.voted })} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <AuthorAvatar author={data.author} />
                <div className="min-w-0 flex-1 space-y-2">
                  <AuthorLine author={data.author} createdAt={data.created_at} stage={data.stage} />
                  <PostMeta post={data} />
                </div>
              </div>
              {data.title && <h2 className="mt-4 font-space-grotesk text-2xl font-semibold leading-tight">{data.title}</h2>}
              <p className="mt-3 whitespace-pre-line break-words text-body">{data.content}</p>
              <div className="mt-5 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
                <button type="button" onClick={() => save.mutate({ postId: data.id, on: !data.saved })} aria-pressed={data.saved}
                  className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground', data.saved && 'text-primary')}>
                  <Bookmark className={cn('h-4 w-4', data.saved && 'fill-current')} aria-hidden="true" />{data.saved ? 'Saved' : 'Save'}
                </button>
                {isOwn ? <>
                  <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground"><Pencil className="h-4 w-4" aria-hidden="true" />Edit</button>
                  <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted hover:text-destructive"><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
                </> : <button type="button" onClick={() => setReport({ postId: data.id })} className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted hover:text-foreground"><Flag className="h-4 w-4" aria-hidden="true" />Report</button>}
              </div>
            </div>
          </CardContent>
        </Card>

        <section aria-labelledby="replies-heading">
          <h2 id="replies-heading" className="mb-3 font-space-grotesk text-lg font-semibold">{data.comment_count} {data.comment_count === 1 ? 'reply' : 'replies'}</h2>
          <form className="mb-5" onSubmit={(event) => { event.preventDefault(); void submitReply().catch(() => undefined); }}>
            <label htmlFor="launchpad-reply" className="sr-only">Write a reply</label>
            <Textarea id="launchpad-reply" rows={3} maxLength={COMMENT_MAX} value={reply} onChange={(event) => setReply(event.target.value)}
              placeholder={isOwn ? 'Add context or answer a question…' : 'Be specific: what works, what is unclear, what would you change?'} />
            <div className="mt-2 flex justify-end"><Button type="submit" disabled={!reply.trim() || add.isPending}>{add.isPending ? 'Posting…' : 'Reply'}</Button></div>
          </form>

          {comments.isError && <p role="alert" className="text-sm text-destructive">Could not load replies.</p>}
          {comments.isSuccess && comments.data.length === 0 && <p className="text-sm text-muted-foreground">No replies yet. The first useful answer tends to get the most upvotes.</p>}
          <ul className="space-y-3">
            {(comments.data ?? []).map((comment) => <li key={comment.id}>
              <Card className="border-border/60"><CardContent className="flex gap-3 p-4">
                <AuthorAvatar author={comment.author} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    {comment.author?.username
                      ? <Link to={`/profile/${encodeURIComponent(comment.author.username)}`} className="font-medium underline-offset-4 hover:underline">{authorName(comment.author)}</Link>
                      : <span className="font-medium">{authorName(comment.author)}</span>}
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                    {comment.user_id === data.user_id && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Author</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-line break-words text-sm">{comment.content}</p>
                  <div className="mt-1 flex gap-1 text-xs text-muted-foreground">
                    {comment.user_id === user?.id
                      ? <button type="button" onClick={() => remove.mutate(comment.id)} className="rounded px-1.5 py-0.5 hover:bg-muted hover:text-destructive">Delete</button>
                      : <button type="button" onClick={() => setReport({ commentId: comment.id })} className="rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground">Report</button>}
                  </div>
                </div>
              </CardContent></Card>
            </li>)}
          </ul>
        </section>
      </div>

      {topic && <aside className="space-y-3">
        <Card className="border-border/70"><CardContent className="space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">#{topic.label}</p>
          <p className="text-sm text-muted-foreground">{topic.description}</p>
          <div className="space-y-1.5">
            {topic.tools.filter((tool) => WORKSPACE_ROUTES[tool]).map((tool) => <Link key={tool} to={WORKSPACE_ROUTES[tool]}
              className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-sm font-medium hover:border-primary/60 hover:text-primary">
              Open {tool}<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>)}
          </div>
          <Link to={`/launchpad/topics/${topic.slug}`} className="block text-sm text-primary underline-offset-4 hover:underline">More in #{topic.label}</Link>
        </CardContent></Card>
      </aside>}
    </div>}

    <PostComposerDialog open={editing} onOpenChange={setEditing} editing={data} />
    <ReportDialog target={report} onClose={() => setReport(null)} />
    <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this post?</AlertDialogTitle>
          <AlertDialogDescription>Its replies and upvotes are deleted with it. This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (data) void removePost.mutateAsync(data.id).then(() => navigate('/launchpad/posts')).catch(() => undefined); }}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </LaunchpadShell>;
}
