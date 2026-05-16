import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Sparkles } from "lucide-react";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ExploreHeader from "@/components/explore/ExploreHeader";
import SoftGate from "@/components/explore/SoftGate";
import PostCard, { type Post } from "@/components/community/PostCard";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const PREVIEW_LIMIT = 4;

type CommunityPostRow = {
  id: string;
  title: string;
  content: string;
  user_id: string;
  tags: string[] | null;
  location: string | null;
  created_at: string;
  upvotes: number | null;
  downvotes: number | null;
  comment_count: number | null;
  repost_count: number | null;
  share_count: number | null;
  media_urls: string[] | null;
  ai_summary: string | null;
  ai_insights: string[] | null;
  ai_related_topics: string[] | null;
  ai_structured_idea: Post["aiStructuredIdea"] | null;
  ai_trending_angle: string | null;
  ai_next_step: string | null;
  source_type: string | null;
  source_data: unknown;
  feedback_requested: boolean | null;
  feedback_category: string[] | null;
};

type PublicProfileRow = {
  id: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

const mapPost = (post: CommunityPostRow, authors: Map<string, PublicProfileRow>): Post => {
  const author = authors.get(post.user_id);
  const authorName = author?.full_name || author?.username || "Anonymous founder";

  return {
    id: post.id,
    title: post.title,
    content: post.content,
    tags: post.tags || [],
    location: post.location || undefined,
    createdAt: post.created_at,
    author: {
      name: authorName,
      avatar: author?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authorName)}`,
      username: author?.username || undefined,
    },
    user_id: post.user_id,
    votes: (post.upvotes || 0) - (post.downvotes || 0),
    commentsCount: post.comment_count || 0,
    repostCount: post.repost_count || 0,
    shareCount: post.share_count || 0,
    media_urls: post.media_urls || [],
    aiSummary: post.ai_summary || undefined,
    aiInsights: post.ai_insights || undefined,
    aiRelatedTopics: post.ai_related_topics || undefined,
    aiStructuredIdea: post.ai_structured_idea || undefined,
    aiTrendingAngle: post.ai_trending_angle || undefined,
    aiNextStep: post.ai_next_step || undefined,
    sourceType: post.source_type || undefined,
    sourceData: post.source_data,
    feedbackRequested: post.feedback_requested || undefined,
    feedbackCategory: post.feedback_category || undefined,
  };
};

const Explore = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("community_posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        const rows = (data || []) as CommunityPostRow[];
        const authorIds = [...new Set(rows.map((post) => post.user_id).filter(Boolean))];
        const authors = new Map<string, PublicProfileRow>();

        if (authorIds.length > 0) {
          const { data: profiles, error: profileError } = await supabase
            .from("public_profiles")
            .select("id, full_name, username, avatar_url")
            .in("id", authorIds);

          if (profileError) {
            console.warn("Unable to load Explore post authors", profileError);
          }

          (profiles || []).forEach((profile) => {
            if (profile.id) authors.set(profile.id, profile);
          });
        }

        if (!cancelled) {
          setPosts(rows.map((post) => mapPost(post, authors)));
        }
      } catch (error) {
        console.error("Unable to load Explore feed", error);
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const visiblePosts = useMemo(() => posts.slice(0, PREVIEW_LIMIT), [posts]);
  const gatedPosts = useMemo(() => posts.slice(PREVIEW_LIMIT), [posts]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Helmet>
        <title>Explore Founder Updates | Creatives Takeover</title>
        <meta
          name="description"
          content="Preview the Creatives Takeover founder community and see what founders are building in public."
        />
      </Helmet>
      <Navigation />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 pt-28 sm:px-6 lg:pt-32">
        <ExploreHeader />

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse border-white/10 bg-white/5">
                <CardContent className="space-y-4 p-6">
                  <div className="h-4 w-1/3 rounded bg-white/10" />
                  <div className="h-20 rounded bg-white/10" />
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {visiblePosts.map((post) => (
              <PostCard key={post.id} post={post} readOnly />
            ))}

            {gatedPosts.length > 0 ? (
              <SoftGate>
                <div className="space-y-4">
                  {gatedPosts.map((post) => (
                    <PostCard key={post.id} post={post} readOnly />
                  ))}
                </div>
              </SoftGate>
            ) : null}
          </div>
        ) : (
          <Card className="border-white/10 bg-white/5 text-center">
            <CardContent className="space-y-3 p-8">
              <Sparkles className="mx-auto h-8 w-8 text-blue-200" />
              <h2 className="text-xl font-semibold text-white">The community feed is warming up</h2>
              <p className="text-sm leading-6 text-slate-300">
                Founder updates will appear here as members share milestones, questions, resources, and build-in-public notes.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Explore;
