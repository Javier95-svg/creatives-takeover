import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePostActions, type PostMetrics } from './ProfilePostActions';
import { Button } from '@/components/ui/button';

interface PinnedPost {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  comment_count: number;
  tags: string[];
  created_at: string;
}

interface PinnedPostsProps {
  posts: PinnedPost[];
  isOwnProfile: boolean;
}

export const PinnedPosts = ({ posts }: PinnedPostsProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const client = useQueryClient();
  const metrics = useQuery({
    queryKey: ['profile-post-metrics', user?.id, posts.map((post) => `community:${post.id}`).sort()],
    enabled: posts.length > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('profile_post_metrics', { p_posts: posts.map((post) => ({ source: 'community', id: post.id })) });
      if (error) throw error;
      return data as unknown as PostMetrics[];
    },
  });
  if (posts.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pin className="h-5 w-5 text-primary" />
          Pinned Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {metrics.isError && <p className="mb-3 text-sm text-muted-foreground">Post interactions could not load. <Button variant="link" onClick={() => void metrics.refetch()}>Retry</Button></p>}
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
              <Card key={post.id} className="h-full transition-all hover:shadow-md hover:border-primary/50">
                <Link to={`/mentorship/post/${post.id}`} className="block group">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Pin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {post.content}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                </Link>
                <ProfilePostActions key={user?.id || 'guest'} source="community" postId={post.id}
                  shareUrl={`${window.location.origin}${location.pathname}?post=community:${post.id}`}
                  metrics={metrics.data?.find((item) => item.id === post.id)}
                  refresh={() => client.invalidateQueries({ queryKey: ['profile-post-metrics'] })} />
              </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
