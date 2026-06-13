import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Flame, Star, Crown, MessageCircle, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Post } from "./PostCard";

const TrendingCarousel = () => {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('*')
          .order('upvotes', { ascending: false })
          .limit(6);

        if (error) {
          console.error('Error fetching trending posts:', error);
          return;
        }

        // Get author info for each post
        const authorPromises = (data || []).map(async (post) => {
          const { data: authorData } = await supabase.rpc('get_post_author_info', {
            author_user_id: post.user_id
          });
          return {
            postId: post.id,
            authorName: authorData?.[0]?.author_name || 'Anonymous',
            authorAvatar: authorData?.[0]?.author_avatar
          };
        });

        const authorResults = await Promise.all(authorPromises);
        const authorMap = new Map(authorResults.map(result => [result.postId, result]));

        const formattedPosts: Post[] = (data || []).map(post => {
          const authorInfo = authorMap.get(post.id);
          return {
            id: post.id,
            title: post.title,
            content: post.content,
            tags: post.tags || [],
            location: post.location,
            createdAt: post.created_at,
            author: {
              name: authorInfo?.authorName || 'Anonymous',
              avatar: authorInfo?.authorAvatar
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
        });

        setTrendingPosts(formattedPosts);
      } catch (error) {
        console.error('Error fetching trending posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingPosts();
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (trendingPosts.length <= 3 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.max(1, trendingPosts.length - 2));
    }, 4000); // Auto-scroll every 4 seconds

    return () => clearInterval(interval);
  }, [trendingPosts.length, isPaused]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, trendingPosts.length - 2));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, trendingPosts.length - 2)) % Math.max(1, trendingPosts.length - 2));
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-warning/10 to-destructive/10 border-warning/20">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-warning/20 rounded w-48 mb-4"></div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-warning/10 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trendingPosts.length === 0) {
    return null;
  }

  const getTrendingIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="h-4 w-4 text-warning" />;
      case 1: return <Star className="h-4 w-4 text-muted-foreground" />;
      case 2: return <Flame className="h-4 w-4 text-warning" />;
      default: return <Flame className="h-4 w-4 text-warning" />;
    }
  };

  const visiblePosts = trendingPosts.slice(currentIndex, currentIndex + 3);

  return (
    <Card className="bg-gradient-to-r from-warning/10 to-destructive/10 border-warning/20 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-warning animate-pulse" />
            <h3 className="text-lg font-semibold">Trending Stories</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevSlide}
              disabled={trendingPosts.length <= 3}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextSlide}
              disabled={trendingPosts.length <= 3}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-500 ease-in-out"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {visiblePosts.map((post, index) => {
            const globalIndex = currentIndex + index;
            
            return (
              <Card key={post.id} className="hover:shadow-lg transition-all duration-300 cursor-pointer group bg-background/80 backdrop-blur-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {getTrendingIcon(globalIndex)}
                    <Badge 
                      variant="secondary" 
                      className={`
                        ${globalIndex === 0 ? 'bg-gradient-to-r from-warning/20 to-warning/20 text-warning border-warning/30' : ''}
                        ${globalIndex === 1 ? 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-foreground border-border/30' : ''}
                        ${globalIndex === 2 ? 'bg-gradient-to-r from-warning/20 to-warning/20 text-warning border-warning/30' : ''}
                        ${globalIndex > 2 ? 'bg-gradient-to-r from-destructive/20 to-destructive/20 text-destructive border-destructive/30' : ''}
                      `}
                    >
                      #{globalIndex + 1} Trending
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      {post.author.avatar && (
                        <AvatarImage src={post.author.avatar} alt={post.author.name} />
                      )}
                      <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-secondary/20">
                        {post.author.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="text-sm font-medium">{post.author.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Heart className="h-3 w-3" />
                        <span>{post.votes}</span>
                        <MessageCircle className="h-3 w-3" />
                        <span>{post.commentsCount}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h4>
                    
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {post.content}
                    </p>

                    {post.tags.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        #{post.tags[0]}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendingCarousel;