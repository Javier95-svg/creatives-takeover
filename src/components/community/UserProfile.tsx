import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, MessageSquare, TrendingUp, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UserStats {
  totalPosts: number;
  totalVotes: number;
  totalComments: number;
  joinDate: string;
  topTags: Array<{ tag: string; count: number }>;
}

interface UserPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  votes: number;
  comment_count: number;
  tags: string[];
}

interface UserProfileProps {
  userId?: string;
  onClose?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onClose }) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string; avatar_url?: string } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);

  const targetUserId = userId || currentUser?.id;
  const isOwnProfile = targetUserId === currentUser?.id;

  useEffect(() => {
    if (targetUserId) {
      loadUserProfile();
    }
  }, [targetUserId]);

  const loadUserProfile = async () => {
    if (!targetUserId) return;

    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, created_at')
        .eq('id', targetUserId)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profileData) {
        // No profile found for this user
        toast.error('User profile not found');
        return;
      }
      
      setProfile(profileData);

      // Load user posts
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('id, title, content, created_at, upvotes, downvotes, comment_count, tags')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const userPosts = postsData?.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        created_at: post.created_at,
        votes: (post.upvotes || 0) - (post.downvotes || 0),
        comment_count: post.comment_count || 0,
        tags: post.tags || []
      })) || [];

      setPosts(userPosts);

      // Calculate stats
      const totalVotes = userPosts.reduce((sum, post) => sum + post.votes, 0);
      const totalComments = userPosts.reduce((sum, post) => sum + post.comment_count, 0);
      
      // Count tag usage
      const tagCounts = new Map<string, number>();
      userPosts.forEach(post => {
        post.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });
      
      const topTags = Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

      setStats({
        totalPosts: userPosts.length,
        totalVotes,
        totalComments,
        joinDate: profileData?.created_at || new Date().toISOString(),
        topTags
      });

    } catch (error) {
      console.error('Error loading user profile:', error);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const getReputationLevel = (totalVotes: number, totalPosts: number) => {
    const score = totalVotes + (totalPosts * 2);
    if (score >= 100) return { level: "Expert", color: "bg-purple-500" };
    if (score >= 50) return { level: "Veteran", color: "bg-blue-500" };
    if (score >= 20) return { level: "Active", color: "bg-green-500" };
    if (score >= 5) return { level: "Member", color: "bg-yellow-500" };
    return { level: "Newcomer", color: "bg-gray-500" };
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">Loading profile...</div>
        </CardContent>
      </Card>
    );
  }

  if (!profile || !stats) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="text-muted-foreground">Profile not found</div>
        </CardContent>
      </Card>
    );
  }

  const reputation = getReputationLevel(stats.totalVotes, stats.totalPosts);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20">
              {profile.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={`${profile.full_name} avatar`} />
              )}
              <AvatarFallback className="text-lg">
                {profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${reputation.color} text-white`}>
                    <Award className="h-3 w-3 mr-1" />
                    {reputation.level}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    Joined {new Date(stats.joinDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="font-semibold text-lg">{stats.totalPosts}</div>
                  <div className="text-xs text-muted-foreground">Stories</div>
                </div>
                <div>
                  <div className="font-semibold text-lg">{stats.totalVotes}</div>
                  <div className="text-xs text-muted-foreground">Votes</div>
                </div>
                <div>
                  <div className="font-semibold text-lg">{stats.totalComments}</div>
                  <div className="text-xs text-muted-foreground">Comments</div>
                </div>
                <div>
                  <div className="font-semibold text-lg">{stats.topTags.length}</div>
                  <div className="text-xs text-muted-foreground">Topics</div>
                </div>
              </div>
            </div>

            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">Recent Stories</TabsTrigger>
          <TabsTrigger value="activity">Activity & Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {posts.length > 0 ? (
            posts.map((post) => (
              <Card key={post.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {post.votes} votes
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {post.comment_count} comments
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground/90 mb-3">
                    {post.content.length > 200 
                      ? `${post.content.substring(0, 200)}...` 
                      : post.content
                    }
                  </p>
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">#{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  {isOwnProfile ? "You haven't shared any stories yet." : "No stories shared yet."}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Favorite Topics</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topTags.length > 0 ? (
                <div className="space-y-3">
                  {stats.topTags.map(({ tag, count }) => (
                    <div key={tag} className="flex items-center justify-between">
                      <Badge variant="outline">#{tag}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {count} {count === 1 ? 'story' : 'stories'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-4">
                  No topic preferences yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Community Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold text-lg">{stats.totalVotes}</div>
                  <div className="text-sm text-muted-foreground">Total votes received</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="font-semibold text-lg">
                    {Math.round((stats.totalVotes / Math.max(stats.totalPosts, 1)) * 10) / 10}
                  </div>
                  <div className="text-sm text-muted-foreground">Average votes per story</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfile;