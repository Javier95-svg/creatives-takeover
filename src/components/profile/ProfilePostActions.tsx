import { useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, Share, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export interface PostMetrics {
  source: string;
  id: string;
  likes: number;
  comments: number;
  reposts: number;
  liked: boolean;
  reposted: boolean;
}
interface Comment {
  id: string; user_id: string; content: string; created_at: string;
  name: string; username: string | null; avatar: string | null;
}
interface Props {
  source: string; postId: string; shareUrl: string; metrics?: PostMetrics;
  refresh: () => Promise<unknown>;
}

export function ProfilePostActions({ source, postId, shareUrl, metrics, refresh }: Props) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<PostMetrics | null>(null);
  const [shareFallback, setShareFallback] = useState(false);
  const lock = useRef(false);
  const commentAttempt = useRef<{ text: string; id: string } | null>(null);
  const current = optimistic || metrics;
  const commentsKey = ['profile-post-comments', source, postId, user?.id];
  const comments = useInfiniteQuery({
    queryKey: commentsKey,
    enabled: expanded,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('list_profile_post_comments', { p_source: source, p_id: postId, p_offset: pageParam });
      if (error) throw error;
      return data as unknown as Comment[];
    },
    getNextPageParam: (last, pages) => last.length === 30 ? pages.length * 30 : undefined,
    staleTime: 15_000,
  });

  async function react(kind: 'like' | 'repost') {
    if (!user) { setSignIn(true); return; }
    if (lock.current || !current) return;
    lock.current = true;
    const flag = kind === 'like' ? 'liked' : 'reposted';
    const count = kind === 'like' ? 'likes' : 'reposts';
    const active = !current[flag];
    setPending(kind);
    setOptimistic({ ...current, [flag]: active, [count]: Math.max(0, current[count] + (active ? 1 : -1)) });
    try {
      const { error } = await supabase.rpc('set_profile_post_reaction', { p_source: source, p_id: postId, p_kind: kind, p_active: active });
      if (error) throw error;
      if (kind === 'repost') {
        toast.success(active ? 'Reposted to your profile.' : 'Repost removed.');
        void client.invalidateQueries({ queryKey: ['profile-reposts', user.id] });
      }
      await refresh();
    } catch { toast.error(`Could not ${kind === 'like' ? 'update your like' : 'update your repost'}. Please try again.`); }
    finally { setOptimistic(null); setPending(null); lock.current = false; }
  }

  async function addComment() {
    if (!user) { setSignIn(true); return; }
    const content = draft.trim();
    if (!content || content.length > 2000 || lock.current) return;
    lock.current = true;
    setPending('comment');
    // Retrying a timed-out request uses the same ID and cannot duplicate a comment.
    if (commentAttempt.current?.text !== content) commentAttempt.current = { text: content, id: crypto.randomUUID() };
    try {
      const { error } = await supabase.rpc('add_profile_post_comment', { p_source: source, p_id: postId, p_content: content, p_comment_id: commentAttempt.current.id });
      if (error) throw error;
      setDraft('');
      commentAttempt.current = null;
      await Promise.all([client.invalidateQueries({ queryKey: commentsKey }), refresh()]);
      toast.success('Comment posted.');
    } catch { toast.error('Could not post your comment. Your text is still here to retry.'); }
    finally { setPending(null); lock.current = false; }
  }

  async function removeComment(id: string) {
    if (lock.current) return;
    lock.current = true;
    setPending(id);
    try {
      const { error } = await supabase.rpc('delete_profile_post_comment', { p_source: source, p_id: id });
      if (error) throw error;
      await Promise.all([client.invalidateQueries({ queryKey: commentsKey }), refresh()]);
    } catch { toast.error('Could not delete your comment. Please try again.'); }
    finally { setPending(null); lock.current = false; }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: 'A journey update on Creatives Takeover', url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); toast.success('Post link copied.'); }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setShareFallback(true);
    }
  }

  return <div className="border-t border-border/60 px-4 py-2 sm:px-6">
    <div role="group" aria-label="Post actions" className="flex items-center gap-3 sm:gap-6">
      <Button variant="ghost" className={`gap-2 px-2 ${current?.liked ? 'text-rose-500 hover:text-rose-500' : 'text-muted-foreground'}`} aria-label={current?.liked ? 'Unlike post' : 'Like post'} aria-pressed={current?.liked || false} title="Like" disabled={!!pending || (!metrics && !!user)} onClick={() => void react('like')}>
        <Heart className={`h-5 w-5 ${current?.liked ? 'fill-current' : ''}`} /><span className="text-xs tabular-nums">{current?.likes ?? '–'}</span>
      </Button>
      <Button variant="ghost" className="gap-2 px-2 text-muted-foreground" aria-label="Comments" aria-expanded={expanded} title="Comment" onClick={() => setExpanded(!expanded)}>
        <MessageCircle className="h-5 w-5" /><span className="text-xs tabular-nums">{current?.comments ?? '–'}</span>
      </Button>
      <Button variant="ghost" className={`gap-2 px-2 ${current?.reposted ? 'text-emerald-500 hover:text-emerald-500' : 'text-muted-foreground'}`} aria-label={current?.reposted ? 'Undo repost' : 'Repost to your profile'} aria-pressed={current?.reposted || false} title="Repost" disabled={!!pending || (!metrics && !!user)} onClick={() => void react('repost')}>
        <Repeat2 className="h-5 w-5" /><span className="text-xs tabular-nums">{current?.reposts ?? '–'}</span>
      </Button>
      <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label="Share post" title="Share" onClick={() => void share()}><Share className="h-5 w-5" /></Button>
    </div>
    {expanded && <div className="space-y-4 py-3">
      {comments.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading comments…</p>}
      {comments.isError && <div className="text-sm">Could not load comments. <Button variant="link" onClick={() => void comments.refetch()}>Retry</Button></div>}
      {comments.data?.pages.flat().map((comment) => <div key={comment.id} className="flex gap-3">
        <Avatar className="h-8 w-8"><AvatarImage src={comment.avatar || undefined} /><AvatarFallback>{comment.name.charAt(0)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1 text-sm">
          {comment.username ? <Link className="font-medium hover:underline" to={`/profile/${encodeURIComponent(comment.username)}`}>{comment.name}</Link> : <span className="font-medium">{comment.name}</span>}
          <time className="ml-2 text-xs text-muted-foreground" dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString()}</time>
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{comment.content}</p>
        </div>
        {comment.user_id === user?.id && <Button variant="ghost" size="icon" disabled={!!pending} aria-label="Delete your comment" onClick={() => void removeComment(comment.id)}><Trash2 className="h-4 w-4" /></Button>}
      </div>)}
      {comments.data?.pages[0]?.length === 0 && <p className="text-sm text-muted-foreground">Start the conversation.</p>}
      {comments.hasNextPage && <Button variant="ghost" disabled={comments.isFetchingNextPage} onClick={() => void comments.fetchNextPage()}>Load more comments</Button>}
      {user ? <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void addComment(); }}>
        <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} disabled={pending === 'comment'} maxLength={2000} rows={2} aria-label="Write a comment" placeholder="Add to the conversation…" />
        <div className="flex justify-end"><Button type="submit" size="sm" disabled={!!pending || !draft.trim()}>{pending === 'comment' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Comment</Button></div>
      </form> : <Button variant="outline" onClick={() => setSignIn(true)}>Sign in to comment</Button>}
    </div>}
    <Dialog open={signIn} onOpenChange={setSignIn}><DialogContent><DialogHeader><DialogTitle>Join the conversation</DialogTitle><DialogDescription>Sign in to like, comment, and repost journey updates.</DialogDescription></DialogHeader><Button asChild><Link to="/login">Sign in</Link></Button></DialogContent></Dialog>
    <Dialog open={shareFallback} onOpenChange={setShareFallback}><DialogContent><DialogHeader><DialogTitle>Share this post</DialogTitle><DialogDescription>Copy this link to share the update.</DialogDescription></DialogHeader><input aria-label="Post link" className="w-full rounded border bg-background p-3 text-sm" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></DialogContent></Dialog>
  </div>;
}
