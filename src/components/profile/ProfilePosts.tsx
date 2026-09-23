import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, Loader2, MessageSquare, Trash2 } from 'lucide-react';
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
  onCommunityPostDeleted?: (postId: string) => void;
}

interface FeedPost {
  id: string;
  source: 'journey' | 'photo' | 'community';
  content: string;
  date: string;
  image?: string | null;
  imagePath?: string | null;
  title?: string;
}

interface ProfilePostsData {
  feed: FeedPost[];
  postingAvailable: boolean;
  scheduled: FeedPost[];
  hasMore: boolean;
}

const formatDate = (date: string) => new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function ProfilePosts({ userId, name, avatarUrl, isOwnProfile, onCommunityPostDeleted }: Props) {
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(20);
  const [deleting, setDeleting] = useState<FeedPost | null>(null);
  const [busy, setBusy] = useState(false);
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
      if (deleting.source === 'community') onCommunityPostDeleted?.(deleting.id);
      setDeleting(null);
      toast.success('Post removed.');
      void refetch();
    } catch (error) {
      console.error('Unable to remove post', error);
      toast.error('Could not remove your post. Please try again.');
    } finally { setBusy(false); }
  }

  function renderPost(post: FeedPost, scheduled = false) {
    return (
      <Card key={`${post.source}-${post.id}`} className="overflow-hidden bg-card/95">
        <div className="flex items-center gap-3 p-4 sm:px-6">
          <Avatar className="h-10 w-10 border border-border">
            <AvatarImage src={avatarUrl || undefined} alt={name} /><AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="text-xs text-muted-foreground">{scheduled ? 'Scheduled for ' : ''}<time dateTime={post.date}>{formatDate(post.date)}</time></p>
          </div>
          {isOwnProfile && <Button variant="ghost" size="icon" aria-label={scheduled ? 'Cancel scheduled post' : 'Delete post'} onClick={() => setDeleting(post)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>}
        </div>
        <div className="space-y-3 px-4 pb-5 sm:px-6">
          {post.title && <h3 className="font-semibold">{post.title}</h3>}
          {post.content && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{post.content}</p>}
          {post.image && <img src={post.image} alt={post.content ? `Photo shared by ${name}` : `Journey photo from ${name}`} loading="lazy" className="max-h-96 w-full rounded-lg border border-border/50 bg-muted/20 object-contain" />}
          {post.imagePath && !post.image && <p className="text-sm text-muted-foreground">Photo temporarily unavailable.</p>}
          {post.source === 'community' && <Button variant="link" className="h-auto p-0" asChild><Link to={`/mentorship/post/${post.id}`}>View conversation</Link></Button>}
        </div>
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
        {!isLoading && !isError && data?.feed.length === 0 && <Card className="p-8 text-center"><MessageSquare className="mx-auto mb-3 h-8 w-8 text-primary/60" /><h3 className="font-medium">{isOwnProfile ? 'Every journey starts with a first update' : 'The journey is just beginning'}</h3><p className="mt-2 text-sm text-muted-foreground">{isOwnProfile ? 'Share what you’re working on, something you learned, or a milestone worth celebrating.' : 'No posts shared yet. Check back for new updates.'}</p></Card>}
        {data?.feed.map((post) => renderPost(post))}
        {data?.hasMore && <div className="text-center"><Button variant="outline" onClick={() => setLimit((value) => value + 20)}>Load more posts</Button></div>}
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
