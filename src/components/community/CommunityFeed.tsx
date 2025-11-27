import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import PostComposer, { ComposerPayload } from "./PostComposer";
import PostCard, { Post } from "./PostCard";
import { ChatbotReportCard } from "./ChatbotReportCard";
import AdvancedFilters from "./AdvancedFilters";
import StreakNotificationBanner from "./StreakNotificationBanner";
import TrendingPostsCard from "./TrendingPostsCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Lock, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useBadgeSystem } from "@/hooks/useBadgeSystem";
import { useFeatureGating } from "@/hooks/useFeatureGating";

const CommunityFeed: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { checkAndAwardBadges } = useBadgeSystem(user?.id);
  const { checkFeatureAccess } = useFeatureGating();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"hot" | "new" | "top">("hot");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [postType, setPostType] = useState("all");
  const [engagement, setEngagement] = useState("all");
  
  const postingAccess = checkFeatureAccess('community_posting');
  
  // Track if we're currently publishing to prevent real-time subscription from interfering
  const isPublishingRef = useRef(false);
  const fetchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch posts from database
  const fetchPosts = useCallback(async () => {
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
          userId: post.user_id,
          authorName: authorData?.[0]?.author_name || 'Anonymous',
          authorAvatar: authorData?.[0]?.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent('Anonymous')}`,
          authorUsername: authorData?.[0]?.author_username
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
            avatar: authorInfo?.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent('Anonymous')}`,
            username: authorInfo?.authorUsername
          },
          user_id: authorInfo?.userId,
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
  }, [user]);


  // Debounced fetch function to prevent rapid refetches
  const debouncedFetchPosts = useCallback(() => {
    // Clear existing timer
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    
    // Don't refetch if we're currently publishing (will refetch after publish completes)
    if (isPublishingRef.current) {
      return;
    }
    
    // Debounce the fetch by 1 second
    fetchDebounceTimerRef.current = setTimeout(() => {
      if (!isPublishingRef.current) {
        fetchPosts();
      }
    }, 1000);
  }, [fetchPosts]);

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
        debouncedFetchPosts(); // Debounced refetch posts when changes occur
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'post_comments'
      }, () => {
        console.log('Comments changed, refetching...');
        debouncedFetchPosts(); // Debounced refetch when comments change
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        console.log('Profiles changed, refetching...');
        debouncedFetchPosts(); // Debounced refetch when profiles change
      })
      .subscribe();

    return () => {
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [fetchPosts, debouncedFetchPosts]);

  const allTags = useMemo(() => {
    // Diverse creative field tags
    const creativeTags = [
      // Visual Arts & Design
      'design', 'illustration', 'painting', 'photography', 'sculpture', 'digital-art',
      'graphic-design', 'ui-ux', 'animation', 'concept-art', '3d-modeling', 'branding',
      // Music & Audio
      'music', 'songwriting', 'production', 'mixing', 'sound-design', 'composition',
      'indie-music', 'electronic', 'acoustic', 'beats', 'vocals', 'recording',
      // Writing & Content
      'writing', 'poetry', 'fiction', 'non-fiction', 'screenwriting', 'blogging',
      'copywriting', 'storytelling', 'journalism', 'publishing', 'editing',
      // Film & Video
      'film', 'video', 'cinematography', 'directing', 'editing', 'documentary',
      'short-film', 'music-video', 'vfx', 'color-grading', 'storyboard',
      // Fashion & Style
      'fashion', 'styling', 'textile-design', 'sustainable-fashion', 'streetwear',
      // Entrepreneurship & Business
      'startup', 'freelance', 'portfolio', 'collaboration', 'commission', 'showcase',
      'work-in-progress', 'feedback', 'milestone', 'learning', 'tutorial', 'process',
      'challenge', 'inspiration', 'behind-the-scenes', 'creative-block', 'breakthrough'
    ];

    // Count which curated tags actually appear in posts
    const counts = new Map<string, number>();
    posts.forEach((p) => 
      p.tags.forEach((t) => {
        if (creativeTags.includes(t)) {
          counts.set(t, (counts.get(t) || 0) + 1);
        }
      })
    );

    // Return curated tags sorted by frequency, with unused ones at the end
    const usedTags = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
    const unusedTags = creativeTags.filter(t => !counts.has(t));
    
    return [...usedTags, ...unusedTags].slice(0, 30); // Limit to top 30 tags
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

  async function handlePublish(payload: ComposerPayload) {
    // Set flag to prevent real-time subscription from interfering
    isPublishingRef.current = true;
    
    try {
      // Transform payload to match database schema
      const mediaUrls: string[] = [];
      if (payload.image) mediaUrls.push(payload.image);
      if (payload.video) mediaUrls.push(payload.video);
      if (payload.audio) mediaUrls.push(payload.audio);
      
      const dbPayload = {
        title: payload.title,
        content: payload.content,
        user_id: user?.id,
        tags: [],
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      };
      
      const { error } = await supabase.from('community_posts').insert([dbPayload]);
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      // Successfully published - now refetch posts manually after a short delay
      // This ensures the new post appears without triggering the real-time subscription
      setTimeout(() => {
        fetchPosts().finally(() => {
          // Clear the publishing flag after refetch completes
          isPublishingRef.current = false;
        });
      }, 500);
      
      toast.success("Your story has been posted!");
    } catch (e: any) {
      console.error('Error posting:', e);
      toast.error(`Error sharing to community: ${e.message || 'Unknown error'}`);
      // Clear the flag on error
      isPublishingRef.current = false;
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8 space-y-6">
        
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

          {/* Post Composer or Upgrade Prompt */}
          {postingAccess.hasAccess ? (
            <PostComposer onPublish={handlePublish} requireAuth={true} />
          ) : (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Share Your Story</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {postingAccess.message || 'Upgrade to Creator tier or higher to create posts in the community'}
                    </p>
                    <Button 
                      onClick={() => navigate('/pricing')}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Upgrade to Post
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
          <TrendingPostsCard />
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
