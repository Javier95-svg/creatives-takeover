import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Users, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SocialButtons } from "@/components/social/SocialButtons";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website_url: string | null;
  created_at: string;
  followers_count: number;
  following_count: number;
  friends_count: number;
  creative_niche: string | null;
  business_stage: string | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  tags: string[];
  upvotes: number;
  comment_count: number;
}

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;

      try {
        setLoading(true);

        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Load user's posts
        const { data: postsData, error: postsError } = await supabase
          .from('community_posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (postsError) throw postsError;
        setPosts(postsData || []);

      } catch (error: any) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Loading Profile | Creatives Takeover</title>
        </Helmet>
        <div className="relative min-h-screen overflow-hidden">
          <AnimatedBackground />
          <div className="relative z-10">
            <Navigation />
            <main className="container mx-auto px-4 py-20">
              <div className="max-w-4xl mx-auto">
                <div className="animate-pulse space-y-4">
                  <div className="h-32 bg-muted rounded-lg" />
                  <div className="h-64 bg-muted rounded-lg" />
                </div>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Helmet>
          <title>Profile Not Found | Creatives Takeover</title>
        </Helmet>
        <div className="relative min-h-screen overflow-hidden">
          <AnimatedBackground />
          <div className="relative z-10">
            <Navigation />
            <main className="container mx-auto px-4 py-20">
              <Card className="max-w-md mx-auto p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Profile Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The profile you're looking for doesn't exist.
                </p>
                <Button asChild>
                  <Link to="/community">Back to Community</Link>
                </Button>
              </Card>
            </main>
            <Footer />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{profile.full_name || 'User'} | Creatives Takeover</title>
        <meta name="description" content={`View ${profile.full_name || 'user'}'s profile and posts`} />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link to="/community" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Community
                </Link>
              </Button>

              {/* Profile Header */}
              <Card className="p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {profile.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                      <div>
                        <h1 className="text-2xl font-bold mb-1">
                          {profile.full_name || 'Anonymous User'}
                        </h1>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {profile.creative_niche && (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline">{profile.creative_niche}</Badge>
                            </div>
                          )}
                          {profile.business_stage && (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline">{profile.business_stage}</Badge>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {!isOwnProfile && (
                        <SocialButtons 
                          userId={userId!} 
                          userName={profile.full_name || undefined}
                          showAccountabilityPartner={true}
                        />
                      )}
                    </div>

                    {profile.bio && (
                      <p className="text-muted-foreground mb-4">{profile.bio}</p>
                    )}

                    {profile.website_url && (
                      <a 
                        href={profile.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        {profile.website_url}
                      </a>
                    )}

                    <Separator className="my-4" />

                    {/* Stats */}
                    <div className="flex gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{profile.followers_count}</div>
                        <div className="text-xs text-muted-foreground">Followers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{profile.following_count}</div>
                        <div className="text-xs text-muted-foreground">Following</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{profile.friends_count}</div>
                        <div className="text-xs text-muted-foreground">Friends</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{posts.length}</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Posts */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Recent Posts
                </h2>

                {posts.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No posts yet</p>
                  </Card>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="p-6 hover:shadow-lg transition-shadow">
                      <Link to={`/community?post=${post.id}`}>
                        <h3 className="text-lg font-semibold mb-2 hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {post.upvotes} upvotes
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            {post.comment_count} comments
                          </div>
                          <div>
                            {new Date(post.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex gap-2 mt-3">
                            {post.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Link>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Profile;
