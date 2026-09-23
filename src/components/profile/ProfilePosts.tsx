import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CalendarClock, Loader2, MessageSquare, Pin, PinOff, Repeat2, Trash2 } from 'lucide-react';
import { orderProfilePosts } from '@/lib/profilePosts';
import { useAuth } from '@/contexts/AuthContext';
import { ProfilePostActions, type PostMetrics } from './ProfilePostActions';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JourneyPostComposer, type PublishedJourneyPost } from './JourneyPostComposer';

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
  isOwnProfile: boolean;
}

interface FeedPost {
  id: string;
  source: 'journey' | 'photo' | 'community';
  content: string;
  date: string;
  image?: string | null;
  imagePath?: string | null;
  title?: string;
  author_name?: string;
  author_avatar?: string | null;
  author_username?: string | null;
  reposted_at?: string;
  user_id?: string;
}

interface SharedPost extends FeedPost { image_path?: string | null }

async function resolvePostImages(posts: SharedPost[]): Promise<FeedPost[]> {
  const paths = [...new Set(posts.flatMap((post) => post.image_path ? [post.image_path] : []))];
  const images = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await supabase.storage.from('profile-posts').createSignedUrls(paths, 3600);
    if (error) throw error;
    data?.forEach((item) => { if (item.path && item.signedUrl) images.set(item.path, item.signedUrl); });
  }
  return posts.map((post) => ({ ...post, imagePath: post.image_path, image: post.image_path ? images.get(post.image_path) : post.image }));
}

interface ProfilePostsData {
  feed: FeedPost[];
  postingAvailable: boolean;
  scheduled: FeedPost[];
  hasMore: boolean;
}

const formatDate = (date: string) => new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function ProfilePosts({ userId, name, avatarUrl, isOwnProfile }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const target = searchParams.get('post');
  const validTarget = /^(journey|photo|community):[0-9a-f-]{36}$/i.test(target || '') ? target : null;
  const scrolledTo = useRef<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [deleting, setDeleting] = useState<FeedPost | null>(null);
  const [busy, setBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const pinLock = useRef(false);
  const pinKey = ['profile-pinned-post', userId, user?.id];
  const pinned = useQuery({
    queryKey: pinKey,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_profile_pinned_post', { p_user_id: userId });
      if (error) throw error;
      return data ? (await resolvePostImages([data as unknown as SharedPost]))[0] : null;
    },
  });
  async function togglePin(post: FeedPost) {
    if (pinLock.current || !isOwnProfile) return;
    pinLock.current = true;
    setPinBusy(true);
    const pin = !(pinned.data?.id === post.id && pinned.data.source === post.source);
    try {
      const { error } = await supabase.rpc('set_profile_pinned_post', { p_source: post.source, p_id: post.id, p_pinned: pin });
      if (error) throw error;
      queryClient.setQueryData(pinKey, pin ? post : null);
      toast.success(pin ? 'Post pinned to the top of your profile.' : 'Post unpinned.');
      void queryClient.invalidateQueries({ queryKey: ['profile-pinned-post', userId] });
    } catch { toast.error('Could not update your pinned post. Please try again.'); }
    finally { pinLock.current = false; setPinBusy(false); }
  }
  const reposts = useQuery({
    queryKey: ['profile-reposts', userId, user?.id, limit],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_profile_reposts', { p_user_id: userId, p_limit: limit });
      if (error) throw error;
      return resolvePostImages(data as unknown as SharedPost[]);
    },
  });
  const shared = useQuery({
    queryKey: ['profile-shared-post', validTarget, user?.id],
    enabled: !!validTarget,
    queryFn: async () => {
      const [source, id] = validTarget!.split(':');
      const { data, error } = await supabase.rpc('get_profile_shared_post', { p_source: source, p_id: id });
      if (error) throw error;
      if (!data) throw new Error('This post is no longer available.');
      return (await resolvePostImages([data as unknown as SharedPost]))[0];
    },
  });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile-journey-posts', userId, isOwnProfile, limit],
    // Open profiles pick up scheduled posts shortly after their release time.
    refetchInterval: 30_000,
    queryFn: async () => {
      const [journey, photos, community] = await Promise.all([
        supabase.rpc('list_profile_journey_posts', { p_user_id: userId, p_limit: limit }),
        supabase.from('user_photos').select('id, caption, image_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
        supabase.from('community_posts').select('id, content, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
      ]);
      // Keep existing content accessible during a frontend/database rollout.
      const postingAvailable = !(journey.error && ['42P01', '42883', 'PGRST202', 'PGRST205'].includes(journey.error.code));
      for (const result of [photos, community]) if (result.error) throw result.error;
      if (postingAvailable && journey.error) throw journey.error;
      const rows = journey.data || [];
      const posts = rows.filter((post) => !post.is_scheduled);
      const scheduled = isOwnProfile ? rows.filter((post) => post.is_scheduled) : [];
      const paths = rows.flatMap((post) => post.image_path ? [post.image_path] : []);
      const images = new Map<string, string>();
      if (paths.length) {
        const { data: urls, error } = await supabase.storage.from('profile-posts').createSignedUrls(paths, 3600);
        if (error) throw error;
        urls?.forEach((url) => { if (url.path && url.signedUrl) images.set(url.path, url.signedUrl); });
      }
      const toPost = (post: typeof rows[number]): FeedPost => ({ id: post.id, source: 'journey', content: post.content, date: post.publish_at, imagePath: post.image_path, image: post.image_path ? images.get(post.image_path) : null });
      const feed: FeedPost[] = [
        ...posts.map(toPost),
        ...(photos.data || []).map((photo): FeedPost => ({ id: photo.id, source: 'photo', content: photo.caption || '', image: photo.image_url, date: photo.created_at })),
        ...(community.data || []).map((post): FeedPost => ({ id: post.id, source: 'community', content: post.content, title: post.title, date: post.created_at })),
      ];
      feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { feed, postingAvailable, scheduled: scheduled.map(toPost), hasMore: rows.length >= limit || [photos, community].some((result) => result.data?.length === limit) };
    },
  });

  const visiblePosts = useMemo(() => {
    const originals = data?.feed || [];
    const keys = new Set(originals.map((post) => `${post.source}:${post.id}`));
    const combined = [...originals, ...(reposts.data || []).filter((post) => !keys.has(`${post.source}:${post.id}`))];
    if (shared.data && !shared.isError && !combined.some((post) => `${post.source}:${post.id}` === validTarget)) combined.push(shared.data);
    return orderProfilePosts(combined, pinned.data);
  }, [data?.feed, reposts.data, shared.data, shared.isError, validTarget, pinned.data]);
  const metrics = useQuery({
    queryKey: ['profile-post-metrics', user?.id, visiblePosts.map((post) => `${post.source}:${post.id}`).sort()],
    enabled: visiblePosts.length > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const batches: Promise<PostMetrics[]>[] = [];
      for (let i = 0; i < visiblePosts.length; i += 200) {
        const batch = visiblePosts.slice(i, i + 200).map(({ source, id }) => ({ source, id }));
        batches.push((async () => {
          const { data, error } = await supabase.rpc('profile_post_metrics', { p_posts: batch });
          if (error) throw error;
          return data as unknown as PostMetrics[];
        })());
      }
      return (await Promise.all(batches)).flat();
    },
  });
  const metricsByPost = new Map(metrics.data?.map((item) => [`${item.source}:${item.id}`, item]));
  useEffect(() => {
    if (validTarget && scrolledTo.current !== validTarget && visiblePosts.some((post) => `${post.source}:${post.id}` === validTarget)) {
      document.getElementById(`post-${validTarget}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      scrolledTo.current = validTarget;
    }
  }, [validTarget, visiblePosts]);

  function showPublishedPost(post: PublishedJourneyPost) {
    const queryKey = ['profile-journey-posts', userId, isOwnProfile, limit];
    queryClient.setQueryData<ProfilePostsData>(queryKey, (current) => {
      if (!current) return current;
      const optimistic: FeedPost = {
        id: post.id,
        source: 'journey',
        content: post.content,
        date: post.publishAt,
        imagePath: post.imagePath,
        image: post.imageUrl,
      };
      if (post.scheduled) {
        return { ...current, scheduled: [optimistic, ...current.scheduled.filter((item) => item.id !== post.id)] };
      }
      return { ...current, feed: [optimistic, ...current.feed.filter((item) => !(item.source === 'journey' && item.id === post.id))] };
    });
    void refetch();
  }

  async function deletePost() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      const { error } = deleting.source === 'photo'
        ? await supabase.from('user_photos').delete().eq('id', deleting.id).eq('user_id', userId)
        : deleting.source === 'community'
          ? await supabase.from('community_posts').delete().eq('id', deleting.id).eq('user_id', userId)
          : await supabase.from('profile_posts').delete().eq('id', deleting.id).eq('user_id', userId);
      if (error) throw error;
      if (deleting.imagePath) {
        const { error: storageError } = await supabase.storage.from('profile-posts').remove([deleting.imagePath]);
        if (storageError) console.warn('Post removed; attached photo cleanup failed', storageError);
      }
      if (pinned.data?.id === deleting.id && pinned.data.source === deleting.source) queryClient.setQueryData(pinKey, null);
      setDeleting(null);
      toast.success('Post removed.');
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['profile-reposts'] });
      void queryClient.invalidateQueries({ queryKey: ['profile-shared-post'] });
      void queryClient.invalidateQueries({ queryKey: ['profile-pinned-post', userId] });
    } catch (error) {
      console.error('Unable to remove post', error);
      toast.error('Could not remove your post. Please try again.');
    } finally { setBusy(false); }
  }

  function renderPost(post: FeedPost, scheduled = false) {
    const authorName = post.author_name || name;
    const authorAvatar = post.author_name ? post.author_avatar : avatarUrl;
    const ownsPost = isOwnProfile && (!post.user_id || post.user_id === userId);
    const isPinned = !scheduled && pinned.data?.id === post.id && pinned.data.source === post.source;
    const sharePath = post.author_username ? `/profile/${encodeURIComponent(post.author_username)}` : location.pathname;
    const shareUrl = `${window.location.origin}${sharePath}?post=${post.source}:${post.id}`;
    return (
      <Card id={`post-${post.source}:${post.id}`} key={`${post.source}-${post.id}`} className="scroll-mt-24 overflow-hidden bg-card/95">
        {isPinned && <p className="flex items-center gap-2 px-4 pt-3 text-xs font-medium text-primary sm:px-6"><Pin className="h-3.5 w-3.5" />Pinned</p>}
        {post.reposted_at && <p className="flex items-center gap-2 px-4 pt-3 text-xs text-muted-foreground sm:px-6"><Repeat2 className="h-3.5 w-3.5" />{name} reposted</p>}
        <div className="flex items-center gap-3 p-4 sm:px-6">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={authorAvatar || undefined} alt={authorName} /><AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{post.author_username ? <Link to={`/profile/${encodeURIComponent(post.author_username)}`}>{authorName}</Link> : authorName}</p>
            <p className="text-xs text-muted-foreground">{scheduled ? 'Scheduled for ' : ''}<time dateTime={post.date}>{formatDate(post.date)}</time></p>
          </div>
          {ownsPost && !scheduled && <Button variant="ghost" size="icon" disabled={pinBusy || !pinned.isSuccess} aria-label={isPinned ? 'Unpin post' : 'Pin post to your profile'} title={isPinned ? 'Unpin post' : 'Pin to top (replaces your current pin)'} aria-pressed={isPinned} onClick={() => void togglePin(post)}>{isPinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4 text-muted-foreground" />}</Button>}
          {ownsPost && <Button variant="ghost" size="icon" disabled={pinBusy} aria-label={scheduled ? 'Cancel scheduled post' : 'Delete post'} onClick={() => setDeleting(post)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>}
        </div>
        <div className="space-y-3 px-4 pb-5 sm:px-6">
          {post.title && <h3 className="font-semibold">{post.title}</h3>}
          {post.content && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{post.content}</p>}
          {post.image && <img src={post.image} alt={`Photo shared by ${authorName}`} loading="lazy" className="max-h-96 w-full rounded-lg border border-border/50 bg-muted/20 object-contain" />}
          {post.imagePath && !post.image && <p className="text-sm text-muted-foreground">Photo temporarily unavailable.</p>}
          {post.source === 'community' && <Button variant="link" className="h-auto p-0" asChild><Link to={`/mentorship/post/${post.id}`}>View conversation</Link></Button>}
        </div>
        {!scheduled && <ProfilePostActions key={user?.id || 'guest'} source={post.source} postId={post.id} shareUrl={shareUrl} metrics={metricsByPost.get(`${post.source}:${post.id}`)} refresh={() => queryClient.invalidateQueries({ queryKey: ['profile-post-metrics'] })} />}
      </Card>
    );
  }

  return (
    <section aria-labelledby="profile-posts-heading" className="space-y-5">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <h2 id="profile-posts-heading" className="text-lg font-semibold">Share your journey</h2>
        <MessageSquare className="h-5 w-5 text-primary" />
      </div>
      <div className="mx-auto max-w-3xl space-y-5">
        {isOwnProfile && !isLoading && data?.postingAvailable !== false && <JourneyPostComposer userId={userId} name={name} avatarUrl={avatarUrl} onPublished={showPublishedPost} />}
        {isOwnProfile && data?.postingAvailable === false && <Card className="p-5 text-sm text-muted-foreground">Posting is temporarily unavailable. Please try again shortly.</Card>}
        {isLoading && <div role="status" className="flex items-center justify-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading posts…</div>}
        {isError && <Card className="p-6 text-center"><p className="mb-3 text-sm text-muted-foreground">We couldn’t load these posts. Please try again.</p><Button variant="outline" onClick={() => { void refetch(); }}>Try again</Button></Card>}
        {isOwnProfile && !!data?.scheduled.length && (
          <details className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <summary className="cursor-pointer text-sm font-medium"><CalendarClock className="mr-2 inline h-4 w-4 text-primary" />Scheduled posts ({data.scheduled.length}) · Only you</summary>
            <p className="my-3 text-xs text-muted-foreground">Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Posts appear here until they go live.</p>
            <div className="space-y-4">{data.scheduled.map((post) => renderPost(post, true))}</div>
          </details>
        )}
        {!isLoading && !isError && !reposts.isLoading && visiblePosts.length === 0 && <Card className="p-8 text-center"><MessageSquare className="mx-auto mb-3 h-8 w-8 text-primary/60" /><h3 className="font-medium">{isOwnProfile ? 'Every journey starts with a first update' : 'The journey is just beginning'}</h3><p className="mt-2 text-sm text-muted-foreground">{isOwnProfile ? 'Share what you’re working on, something you learned, or a milestone worth celebrating.' : 'No posts shared yet. Check back for new updates.'}</p></Card>}
        {(metrics.isError || reposts.isError) && <p className="text-sm text-muted-foreground">Some post interactions could not load. <Button variant="link" onClick={() => { void metrics.refetch(); void reposts.refetch(); }}>Retry</Button></p>}
        {pinned.isError && <p className="text-sm text-muted-foreground">The pinned post could not load. <Button variant="link" onClick={() => void pinned.refetch()}>Retry</Button></p>}
        {shared.isError && <p role="status" className="text-sm text-muted-foreground">The shared post is unavailable or could not be loaded. <Button variant="link" onClick={() => void shared.refetch()}>Retry</Button></p>}
        {visiblePosts.map((post) => renderPost(post))}
        {(data?.hasMore || (reposts.data?.length === limit && limit < 200)) && <div className="text-center"><Button variant="outline" onClick={() => setLimit((value) => value + 20)}>Load more posts</Button></div>}
      </div>
      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove this post?</DialogTitle><DialogDescription>This removes the post from your profile. Scheduled posts will no longer be published.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Keep post</Button><Button variant="destructive" disabled={busy} onClick={() => { void deletePost(); }}>{busy ? 'Removing…' : 'Remove post'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
