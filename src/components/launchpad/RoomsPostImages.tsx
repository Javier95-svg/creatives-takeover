import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LaunchpadPost } from '@/lib/launchpad';
import { PostImageGallery } from '@/components/profile/PostImageGallery';

export function RoomsPostImages({ post }: { post: LaunchpadPost }) {
  const raw = post.source_data?.origin === 'profile-update' ? post.source_data.image_paths : [];
  const paths = Array.isArray(raw) ? raw.filter((path): path is string => typeof path === 'string' && path.startsWith(`${post.user_id}/`)).slice(0, 4) : [];
  const images = useQuery({
    queryKey: ['rooms-post-images', post.id, paths],
    enabled: paths.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('profile-posts').createSignedUrls(paths, 3600);
      if (error) throw error;
      return paths.map((path) => data.find((image) => image.path === path)?.signedUrl || '');
    },
  });
  if (!paths.length) return null;
  return <div className="mt-3">
    {images.isPending ? <p className="text-sm text-muted-foreground">Loading images…</p>
      : <PostImageGallery images={images.data ?? paths.map(() => '')} authorName={post.author?.full_name || 'the author'} />}
  </div>;
}
