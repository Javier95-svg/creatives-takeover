import React, { useMemo, useState, useEffect } from "react";
import PostComposer, { ComposerPayload } from "./PostComposer";
import PostCard, { Post } from "./PostCard";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CommunityFeed: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Fetch posts from database
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        toast.error('Failed to load posts');
        return;
      }

      // Fetch profiles for all user_ids
      const userIds = [...new Set(data?.map(post => post.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const formattedPosts: Post[] = data?.map(post => {
        const profile = profilesMap.get(post.user_id);
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          tags: post.tags || [],
          createdAt: post.created_at,
          author: {
            name: profile?.full_name || 'Unknown User',
            avatar: profile?.avatar_url
          },
          votes: (post.upvotes || 0) - (post.downvotes || 0),
          commentsCount: post.comment_count || 0,
          aiSummary: post.ai_summary,
          aiInsights: post.ai_insights,
          aiRelatedTopics: post.ai_related_topics,
          aiStructuredIdea: post.ai_structured_idea as Post['aiStructuredIdea'],
          aiTrendingAngle: post.ai_trending_angle,
          aiNextStep: post.ai_next_step
        };
      }) || [];

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('community-posts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_posts'
      }, () => {
        fetchPosts(); // Refetch posts when changes occur
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'post_comments'
      }, () => {
        fetchPosts(); // Refetch when comments change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      toast.error('Please sign in to create posts');
      navigate('/auth');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          title: payload.title,
          content: payload.content,
          tags: payload.tags,
          user_id: user.id
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating post:', error);
        toast.error('Failed to create post');
        return;
      }

      toast.success('Post created successfully!');

      // Behind-the-scenes AI moderation & insight generation
      setTimeout(async () => {
        try {
          toast.message("Analyzing your post with AI…");
          const { data: aiData, error: aiError } = await supabase.functions.invoke('community-ai-moderator', {
            body: {
              title: payload.title,
              content: payload.content,
              tags: payload.tags,
            },
          });

          if (aiError) {
            console.error('AI moderation error', aiError);
            toast.error("AI analysis failed. Your post is still published.");
            return;
          }

          // Update the post with AI insights
          await supabase
            .from('community_posts')
            .update({
              ai_summary: aiData?.tldr,
              ai_insights: aiData?.insights,
              ai_related_topics: aiData?.related_topics,
              ai_structured_idea: aiData?.structured_idea,
              ai_trending_angle: aiData?.trending_angle,
              ai_next_step: aiData?.next_step,
            })
            .eq('id', data.id);

          toast.success("AI insights added to your post.");
        } catch (error) {
          console.error('AI moderation error:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto grid min-h-screen gap-6 px-4 py-8 lg:grid-cols-12">
        <section className="lg:col-span-8 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-20 bg-muted rounded mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto grid min-h-screen gap-6 px-4 py-8 lg:grid-cols-12">
        <section className="lg:col-span-8 space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-2xl font-semibold mb-4">Join the Community</h2>
              <p className="text-muted-foreground mb-6">
                Sign in to participate in discussions, share your entrepreneurial journey, and connect with fellow builders.
              </p>
              <Button onClick={() => navigate('/auth')} size="lg">
                Sign In / Sign Up
              </Button>
            </CardContent>
          </Card>
          
          {/* Show public posts */}
          <div className="space-y-6">
            {filtered.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>

        <aside className="lg:col-span-4 space-y-6">
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
        </aside>
      </main>
    );
  }

  return (
    <main className="container mx-auto grid min-h-screen gap-6 px-4 py-8 lg:grid-cols-12">
      <section className="lg:col-span-8 space-y-6">

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories"
              aria-label="Search stories"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="top">Top</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <PostComposer onPublish={publish} />

        <div className="space-y-6">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No stories match your search.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <aside className="lg:col-span-4 space-y-6">
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

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-3 text-sm font-semibold tracking-wide">Community rules</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Be kind and constructive.</li>
              <li>No spam or self-promo without value.</li>
              <li>Share real experiences and learnings.</li>
            </ul>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
};

export default CommunityFeed;
