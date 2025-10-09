import React, { useMemo, useState, useEffect } from "react";
import PostComposer, { ComposerPayload } from "./PostComposer";
import PostCard, { Post } from "./PostCard";
import { ChatbotReportCard } from "./ChatbotReportCard";
import AdvancedFilters from "./AdvancedFilters";
import CommunityInsights from "./CommunityInsights";
import LeaderboardCard from "./LeaderboardCard";
import DailyChallengeCard from "./DailyChallengeCard";
import StreakNotificationBanner from "./StreakNotificationBanner";
import CommunityPulseCard from "./CommunityPulseCard";
import TrendingPostsCard from "./TrendingPostsCard";
import CommunityMilestones from "./CommunityMilestones";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useBadgeSystem } from "@/hooks/useBadgeSystem";

const CommunityFeed: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { checkAndAwardBadges } = useBadgeSystem(user?.id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [postType, setPostType] = useState("all");
  const [engagement, setEngagement] = useState("all");

  // Fetch posts from database
  const fetchPosts = async () => {
    console.log('🔍 STARTING TO FETCH POSTS...');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📊 RAW POSTS DATA:', data);
      console.log('❌ POSTS ERROR:', error);

      if (error) {
        console.error('Error fetching posts:', error);
        toast.error('Failed to load posts');
        return;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ NO POSTS FOUND IN DATABASE');
        setPosts([]);
        return;
      }

      // Fetch author information using secure function
      const authorPromises = data.map(async (post) => {
        const { data: authorData } = await supabase.rpc('get_post_author_info', {
          author_user_id: post.user_id
        });
        return {
          postId: post.id,
          authorName: authorData?.[0]?.author_name || 'Anonymous',
          authorAvatar: authorData?.[0]?.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent('Anonymous')}`
        };
      });

      const authorResults = await Promise.all(authorPromises);
      const authorMap = new Map(authorResults.map(result => [result.postId, result]));

      let formattedPosts: Post[] = data.map(post => {
        const authorInfo = authorMap.get(post.id);
        console.log(`🔧 FORMATTING POST ${post.id} for user ${post.user_id}:`, { post, authorInfo });
        
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          tags: post.tags || [],
          location: post.location,
          createdAt: post.created_at,
          author: {
            name: authorInfo?.authorName || 'Anonymous',
            avatar: authorInfo?.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent('Anonymous')}`
          },
          votes: (post.upvotes || 0) - (post.downvotes || 0),
          commentsCount: post.comment_count || 0,
          repostCount: post.repost_count || 0,
          shareCount: post.share_count || 0,
          aiSummary: post.ai_summary,
          aiInsights: post.ai_insights,
          aiRelatedTopics: post.ai_related_topics,
          aiStructuredIdea: post.ai_structured_idea as Post['aiStructuredIdea'],
          aiTrendingAngle: post.ai_trending_angle,
          aiNextStep: post.ai_next_step,
          sourceType: post.source_type,
          sourceData: post.source_data,
          feedbackRequested: post.feedback_requested,
          feedbackCategory: post.feedback_category
        };
      });

      console.log('✨ FORMATTED POSTS:', formattedPosts);

      // No filtering - show all posts
      const filtered = formattedPosts;

      console.log('🎯 FILTERED POSTS:', filtered);
      console.log(`📈 SETTING ${filtered.length} POSTS TO STATE`);

      setPosts(filtered);
    } catch (error) {
      console.error('💥 ERROR IN FETCHPOSTS:', error);
      toast.error('Failed to load posts');
    } finally {
      console.log('🏁 SETTING LOADING TO FALSE');
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
        console.log('Posts changed, refetching...');
        fetchPosts(); // Refetch posts when changes occur
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'post_comments'
      }, () => {
        console.log('Comments changed, refetching...');
        fetchPosts(); // Refetch when comments change
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        console.log('Profiles changed, refetching...');
        fetchPosts(); // Refetch when profiles change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const allTags = useMemo(() => {
    // Curated entrepreneurship and startup tags
    const entrepreneurshipTags = [
      'startup', 'saas', 'bootstrapped', 'mvp', 'validation', 'fundraising',
      'revenue', 'mrr', 'product-market-fit', 'pivot', 'scaling', 'growth-hacking',
      'lean-startup', 'customer-development', 'pricing', 'business-model',
      'networking', 'mentorship', 'failure', 'lessons', 'milestone',
      'side-hustle', 'full-time', 'remote', 'productivity', 'innovation',
      'disruption', 'market-research', 'competition', 'strategy', 'leadership'
    ];

    // Count which curated tags actually appear in posts
    const counts = new Map<string, number>();
    posts.forEach((p) => 
      p.tags.forEach((t) => {
        if (entrepreneurshipTags.includes(t)) {
          counts.set(t, (counts.get(t) || 0) + 1);
        }
      })
    );

    // Return curated tags sorted by frequency, with unused ones at the end
    const usedTags = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
    const unusedTags = entrepreneurshipTags.filter(t => !counts.has(t));
    
    return [...usedTags, ...unusedTags].slice(0, 20); // Limit to top 20 tags
  }, [posts]);

  const filtered = useMemo(() => {
    let list = posts.filter((p) =>
      (p.title + " " + p.content).toLowerCase().includes(search.toLowerCase())
    );
    
    // Tag filtering
    if (selectedTag) list = list.filter((p) => p.tags.includes(selectedTag));
    
    // Post type filtering
    if (postType !== "all") {
      switch (postType) {
        case "success":
          list = list.filter(p => p.tags.some(tag => ['success', 'milestone', 'revenue', 'growth'].includes(tag)));
          break;
        case "question":
          list = list.filter(p => p.title.includes('?') || p.content.includes('?'));
          break;
        case "update":
          list = list.filter(p => p.tags.some(tag => ['update', 'progress', 'pivot'].includes(tag)));
          break;
        case "ai-enhanced":
          list = list.filter(p => p.aiSummary || (p.aiInsights && p.aiInsights.length > 0));
          break;
      }
    }
    
    // Engagement filtering
    if (engagement !== "all") {
      switch (engagement) {
        case "high":
          list = list.filter(p => p.votes > 10 || p.commentsCount > 5);
          break;
        case "medium":
          list = list.filter(p => (p.votes > 3 && p.votes <= 10) || (p.commentsCount > 1 && p.commentsCount <= 5));
          break;
        case "new":
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          list = list.filter(p => new Date(p.createdAt).getTime() > oneDayAgo);
          break;
      }
    }

    // Sorting
    switch (sort) {
      case "new":
        return list.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      case "top":
        return list.slice().sort((a, b) => b.votes - a.votes);
      default:
        // hot (enhanced heuristic: votes + recency + AI insights bonus)
        return list
          .slice()
          .sort((a, b) => {
            const aScore = a.votes + (+new Date(a.createdAt) - Date.now()) / 1e7 + (a.aiSummary ? 2 : 0);
            const bScore = b.votes + (+new Date(b.createdAt) - Date.now()) / 1e7 + (b.aiSummary ? 2 : 0);
            return bScore - aScore;
          });
    }
  }, [posts, search, sort, selectedTag, postType, engagement]);

  const publish = async (payload: ComposerPayload) => {
    // Require authentication for posting
    if (!isAuthenticated || !user) {
      toast.error('Please sign in to post stories');
      return;
    }

    try {
      // Prepare location data - store as JSON if coordinates are available, otherwise just the address
      let locationToStore = payload.location;
      if (payload.locationData && payload.locationData.coordinates) {
        locationToStore = JSON.stringify({
          address: payload.locationData.address,
          coordinates: payload.locationData.coordinates
        });
      }

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          title: payload.title,
          content: payload.content,
          tags: payload.tags,
          location: locationToStore,
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

      // Check for new badges
      if (user) {
        setTimeout(() => checkAndAwardBadges(), 1000);
      }

      // Auto-complete daily challenge if applicable
      if (data?.id) {
        try {
          const { data: challengeData } = await supabase.rpc('get_todays_challenge');
          if (challengeData && challengeData.length > 0) {
            const challenge = challengeData[0];
            if (challenge.challenge_type === 'post') {
              await supabase.rpc('complete_daily_challenge', {
                p_user_id: user.id,
                p_challenge_id: challenge.id,
                p_proof_reference_id: data.id,
                p_proof_reference_type: 'post'
              });
            }
          }
        } catch (error) {
          console.error('Error auto-completing challenge:', error);
        }
      }

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
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Loading Community Pulse */}
        <div className="animate-pulse">
          <div className="h-32 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg"></div>
        </div>
        
        {/* Loading Trending Carousel */}
        <div className="animate-pulse">
          <div className="h-48 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-lg"></div>
        </div>
        
        <div className="grid lg:grid-cols-12 gap-6">
          <section className="lg:col-span-8 space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <aside className="lg:col-span-4">
            <div className="h-96 bg-muted/20 rounded-lg animate-pulse"></div>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <div className="grid lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 space-y-6">
          {/* Streak Notification */}
          <StreakNotificationBanner />

          {/* Post Composer */}
          <PostComposer onPublish={publish} requireAuth={true} />

          {/* Results Summary */}
          {search && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 shadow-md">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-primary">{filtered.length}</span> results 
                  {search && ` for "${search}"`}
                  {selectedTag && ` in #${selectedTag}`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Single Posts Feed */}
          {filtered.length > 0 ? (
            <div className="space-y-6">
              {filtered.map((post) => (
                <div key={post.id} className="space-y-4">
                  {post.sourceType === 'chatbot_report' && post.sourceData && (
                    <ChatbotReportCard 
                      reportType={post.sourceData.report_type || 'conversation'}
                      reportData={post.sourceData}
                      feedbackCategories={post.feedbackCategory || []}
                    />
                  )}
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          ) : (
            <Card className="text-center p-12 bg-gradient-to-br from-background to-muted/10 border-primary/10">
              <CardContent>
                <div className="text-muted-foreground space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary opacity-70" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">No stories found</h3>
                  <p className="max-w-md mx-auto">Try adjusting your search or filters to discover more entrepreneurial content, or be the first to share your story!</p>
                  {(search || selectedTag || postType !== "all" || engagement !== "all") && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearch("");
                        setSelectedTag(null);
                        setPostType("all");
                        setEngagement("all");
                      }}
                      className="mt-4 border-primary/20 hover:bg-primary/5"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Enhanced Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <CommunityPulseCard />
          <DailyChallengeCard />
          <TrendingPostsCard />
          <CommunityMilestones />
          <LeaderboardCard />
          <CommunityInsights />
          
          {/* Advanced Filters */}
          <AdvancedFilters
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
            sort={sort}
            onSortChange={(value) => setSort(value as "hot" | "new" | "top")}
            postType={postType}
            onPostTypeChange={setPostType}
            engagement={engagement}
            onEngagementChange={setEngagement}
            allTags={allTags}
          />
        </aside>
      </div>
    </main>
  );
};

export default CommunityFeed;
