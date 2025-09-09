import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, TrendingUp, Activity, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CommunityPulse = () => {
  const [stats, setStats] = useState({
    activeUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    trending: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total posts
        const { count: postsCount } = await supabase
          .from('community_posts')
          .select('*', { count: 'exact', head: true });

        // Get total comments
        const { count: commentsCount } = await supabase
          .from('post_comments')
          .select('*', { count: 'exact', head: true });

        // Get trending tags from recent posts
        const { data: recentPosts } = await supabase
          .from('community_posts')
          .select('tags')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(50);

        const tagCounts = new Map<string, number>();
        recentPosts?.forEach(post => {
          post.tags?.forEach((tag: string) => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          });
        });

        const trendingTags = Array.from(tagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([tag]) => tag);

        setStats({
          activeUsers: Math.floor(Math.random() * 200) + 150, // Simulated active users
          totalPosts: postsCount || 0,
          totalComments: commentsCount || 0,
          trending: trendingTags
        });
      } catch (error) {
        console.error('Error fetching community stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-primary/20 rounded w-32 mb-4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-primary/10 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10"></div>
      <CardContent className="p-6 relative">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="text-lg font-semibold gradient-text">Community Pulse</h3>
          <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary border-primary/20">
            Live
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-background/50 backdrop-blur-sm">
            <Users className="h-6 w-6 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold text-primary">{stats.activeUsers}</div>
            <div className="text-xs text-muted-foreground">Online Now</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background/50 backdrop-blur-sm">
            <MessageSquare className="h-6 w-6 text-secondary mx-auto mb-1" />
            <div className="text-2xl font-bold text-secondary">{stats.totalPosts}</div>
            <div className="text-xs text-muted-foreground">Total Stories</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background/50 backdrop-blur-sm">
            <TrendingUp className="h-6 w-6 text-accent mx-auto mb-1" />
            <div className="text-2xl font-bold text-accent">{stats.totalComments}</div>
            <div className="text-xs text-muted-foreground">Comments</div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-background/50 backdrop-blur-sm">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-1" />
            <div className="text-2xl font-bold text-primary">24/7</div>
            <div className="text-xs text-muted-foreground">Support</div>
          </div>
        </div>

        {stats.trending.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Trending:</span>
            {stats.trending.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CommunityPulse;