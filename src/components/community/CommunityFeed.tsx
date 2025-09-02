import React, { useMemo, useState, useEffect } from "react";
import PostComposer, { ComposerPayload } from "./PostComposer";
import PostCard, { Post } from "./PostCard";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Example assets for demo posts
import heroImg from "@/assets/solopreneur-hero.jpg";
import team1 from "@/assets/team-member-1.jpg";
import team2 from "@/assets/team-member-2.jpg";
import team3 from "@/assets/team-member-3.jpg";

const CommunityFeed: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string; avatar_url?: string }>>({});

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Load posts and profiles on component mount
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (postsData && postsData.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(postsData.map(p => p.user_id))];
        
        // Load profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        let profilesMap: Record<string, { full_name: string; avatar_url?: string }> = {};
        if (!profilesError && profilesData) {
          profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.id] = {
              full_name: profile.full_name || 'Anonymous User',
              avatar_url: profile.avatar_url || undefined
            };
            return acc;
          }, {} as Record<string, { full_name: string; avatar_url?: string }>);
          setProfiles(profilesMap);
        }

        // Transform posts to match component interface
        const transformedPosts: Post[] = postsData.map(post => ({
          id: post.id,
          title: post.title,
          content: post.content,
          tags: post.tags || [],
          createdAt: post.created_at,
          author: {
            name: profilesMap[post.user_id]?.full_name || 'Anonymous User',
            avatar: profilesMap[post.user_id]?.avatar_url
          },
          votes: (post.upvotes || 0) - (post.downvotes || 0),
          commentsCount: post.comment_count || 0,
          aiSummary: post.ai_summary || undefined,
          aiInsights: post.ai_insights || undefined,
          aiRelatedTopics: post.ai_related_topics || undefined,
          aiStructuredIdea: post.ai_structured_idea ? 
            (typeof post.ai_structured_idea === 'object' ? post.ai_structured_idea as any : undefined) : 
            undefined,
          aiTrendingAngle: post.ai_trending_angle || undefined,
          aiNextStep: post.ai_next_step || undefined
        }));

        setPosts(transformedPosts);
      } else {
        // Fallback to demo posts if no posts in database
        setPosts([
          {
            id: "demo-1",
            title: "Welcome to the Community!",
            content: "This is where entrepreneurs share their stories, wins, failures, and lessons learned. Sign up to share your own journey!",
            tags: ["welcome", "community"],
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            author: { name: "Community Team", avatar: team1 },
            votes: 5,
            commentsCount: 0,
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) => p.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [posts]);

  const filtered = useMemo(() => {
    let list = posts.filter((p) =>
      (p.title + " " + p.content).toLowerCase().includes(search.toLowerCase())
    );
    if (selectedTag) list = list.filter((p) => p.tags.includes(selectedTag));

    switch (sort) {
      case "new":
        return list.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      case "top":
        return list.slice().sort((a, b) => b.votes - a.votes);
      default:
        // hot (simple heuristic: votes + recency)
        return list
          .slice()
          .sort((a, b) => b.votes + (+new Date(b.createdAt) - Date.now()) / 1e7 - (a.votes + (+new Date(a.createdAt) - Date.now()) / 1e7));
    }
  }, [posts, search, sort, selectedTag]);

  const publish = async (payload: ComposerPayload) => {
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to post");
      return;
    }

    try {
      // Insert post into database
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .insert({
          title: payload.title,
          content: payload.content,
          tags: payload.tags,
          user_id: user.id
        })
        .select()
        .single();

      if (postError) throw postError;

      // Create optimistic update for UI
      const userProfile = profiles[user.id] || { full_name: user.user_metadata?.full_name || 'You', avatar_url: undefined };
      const newPost: Post = {
        id: postData.id,
        title: payload.title,
        content: payload.content,
        image: payload.image,
        tags: payload.tags,
        createdAt: postData.created_at,
        author: { 
          name: userProfile.full_name,
          avatar: userProfile.avatar_url
        },
        votes: 0,
        commentsCount: 0,
      };
      setPosts((prev) => [newPost, ...prev]);
      toast.success("Your story has been posted!");

      // Behind-the-scenes AI moderation & insight generation
      void (async () => {
        toast.message("Analyzing your post with AI…");
        const { data, error } = await supabase.functions.invoke('community-ai-moderator', {
          body: {
            title: payload.title,
            content: payload.content,
            tags: payload.tags,
          },
        });

        if (error) {
          console.error('AI moderation error', error);
          toast.error("AI analysis failed. Your post is still published.");
          return;
        }

        // Update post with AI insights in database
        await supabase
          .from('community_posts')
          .update({
            ai_summary: data?.tldr,
            ai_insights: data?.insights,
            ai_related_topics: data?.related_topics,
            ai_structured_idea: data?.structured_idea,
            ai_trending_angle: data?.trending_angle,
            ai_next_step: data?.next_step,
            ai_processed_at: new Date().toISOString()
          })
          .eq('id', postData.id);

        // Update UI
        setPosts((prev) => prev.map((p) =>
          p.id === postData.id
            ? {
                ...p,
                aiSummary: data?.tldr,
                aiInsights: data?.insights,
                aiRelatedTopics: data?.related_topics,
                aiStructuredIdea: data?.structured_idea,
                aiTrendingAngle: data?.trending_angle,
                aiNextStep: data?.next_step,
              }
            : p
        ));
        toast.success("AI insights added to your post.");
      })();
    } catch (error) {
      console.error('Error publishing post:', error);
      toast.error('Failed to publish post');
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto grid min-h-screen gap-6 px-4 py-8 lg:grid-cols-12">
        <section className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading community posts...</div>
          </div>
        </section>
        <aside className="lg:col-span-4 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="h-20 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        </aside>
      </main>
    );
  }

  return (
    <main className="container mx-auto grid min-h-screen gap-6 px-4 py-8 lg:grid-cols-12">
      <section className="lg:col-span-8 space-y-6">
        {!isAuthenticated && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-2">Join the Community</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to share your entrepreneurial journey, vote on posts, and connect with other founders.
              </p>
              <Button asChild>
                <a href="/signup">Sign Up</a>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories"
              aria-label="Search stories"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="top">Top</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isAuthenticated && <PostComposer onPublish={publish} />}

        <div className="space-y-6">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} onVoteChange={loadPosts} />
          ))}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground text-center">
                {search || selectedTag ? 'No stories match your search.' : 'No stories yet. Be the first to share your entrepreneurial journey!'}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <aside className="lg:col-span-4 space-y-6">
        {allTags.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 text-sm font-semibold tracking-wide">Popular tags</h2>
              <div className="flex flex-wrap gap-2">
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTag((cur) => (cur === t ? null : t))}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                      selectedTag === t ? "bg-primary/10 border-primary" : "hover:bg-accent"
                    }`}
                    aria-pressed={selectedTag === t}
                  >
                    <span>#{t}</span>
                    {selectedTag === t && (
                      <Badge variant="secondary">active</Badge>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide">Community stats</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total stories</span>
                <span className="font-medium">{posts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active members</span>
                <span className="font-medium">{Object.keys(profiles).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide">Community rules</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Be kind and constructive.</li>
              <li>No spam or self-promo without value.</li>
              <li>Share real experiences and learnings.</li>
              <li>Use relevant tags to help others discover your content.</li>
            </ul>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
};

export default CommunityFeed;
