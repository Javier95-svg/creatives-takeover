import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CommunityCofoundersWallpaper from "@/components/wallpapers/CommunityCofoundersWallpaper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PreviewModeWrapper } from "@/components/ui/PreviewModeWrapper";
import { Handshake, Search, Filter, MapPin, Briefcase, Users, Star, Plus, Calendar, CheckCircle, Edit2, Trash2, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMessaging } from "@/hooks/useMessaging";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { sampleCofounderPosts } from "@/data/sampleCofounderPosts";
import { getPublicTabConfig } from "@/config/publicTabVisibility";

interface CofounderPost {
  id: string;
  user_id: string;
  project_name: string;
  project_description: string;
  industry: string | null;
  stage: string;
  looking_for: string[];
  commitment: string | null;
  location: string | null;
  equity_range: string | null;
  additional_info: string | null;
  created_at: string;
  status: string;
  is_sample?: boolean;
  author?: {
    full_name: string;
    avatar_url: string;
    username?: string | null;
  };
}

const FindCoFounder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const publicTab = getPublicTabConfig('/community/co-founders');
  const { startConversation } = useMessaging({ autoLoad: false });
  const [posts, setPosts] = useState<CofounderPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [messagingPostId, setMessagingPostId] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('cofounder_posts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch author information for each post
      const postsWithAuthors = await Promise.all(
        (data || []).map(async (post) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, username')
            .eq('id', post.user_id)
            .single();

          return {
            ...post,
            author: profileData || { full_name: 'Anonymous', avatar_url: '', username: null }
          };
        })
      );

      // Merge real posts with sample posts (real posts appear first)
      const allPosts: CofounderPost[] = [...postsWithAuthors, ...sampleCofounderPosts];
      setPosts(allPosts);
    } catch (error) {
      console.error('Error fetching co-founder posts:', error);
      // On error, still show sample posts
      setPosts([...sampleCofounderPosts]);
    } finally {
      setLoading(false);
    }
  };

  const getCofounderTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'technical': 'Technical (CTO)',
      'business': 'Business (CEO/COO)',
      'marketing': 'Marketing (CMO)',
      'design': 'Design',
      'finance': 'Finance (CFO)'
    };
    return types[type] || type;
  };

  const getStageLabel = (stage: string) => {
    const stages: Record<string, string> = {
      'idea': 'Just an idea',
      'building-mvp': 'Building an MVP',
      'mvp-ready': 'MVP is ready',
      'early-users': 'Has early users',
      'funded': 'Funded / Revenue'
    };
    return stages[stage] || stage;
  };

  const handleEditPost = (postId: string) => {
    // Navigate to edit page (we'll create this route)
    navigate(`/community/co-founders/edit/${postId}`);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      const { error } = await supabase
        .from('cofounder_posts')
        .delete()
        .eq('id', postToDelete);

      if (error) throw error;

      toast.success('Post deleted successfully');
      setPosts(posts.filter(p => p.id !== postToDelete));
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post: ' + error.message);
    }
  };

  const openDeleteDialog = (postId: string) => {
    setPostToDelete(postId);
    setDeleteDialogOpen(true);
  };

  const communityContent = (
    <>
      <div className="mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by skills, industry, or location..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  readOnly={!user}
                />
              </div>
              <Button variant="outline" className="md:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 md:w-auto">
                <Link to="/community/co-founders/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6 mb-12">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">Loading posts...</p>
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple/5">
            <CardContent className="pt-6 text-center py-12">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <Handshake className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4">No Posts Yet</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
                Be the first to post and find your perfect co-founder!
              </p>
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Link to="/community/co-founders/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your Post
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="hover:border-primary/50 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={post.author?.avatar_url} />
                      <AvatarFallback>
                        {post.author?.full_name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl mb-1">{post.project_name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {post.is_sample ? (
                          <span>{post.author?.full_name}</span>
                        ) : post.author?.username ? (
                          <Link
                            to={`/profile/${post.author.username}`}
                            className="hover:text-primary hover:underline transition-colors cursor-pointer"
                          >
                            {post.author?.full_name}
                          </Link>
                        ) : (
                          <span>{post.author?.full_name}</span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {getStageLabel(post.stage)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-base whitespace-pre-wrap">
                  {post.project_description}
                </CardDescription>

                <div className="flex flex-wrap gap-2">
                  {post.industry && (
                    <Badge variant="secondary">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {post.industry}
                    </Badge>
                  )}
                  {post.location && (
                    <Badge variant="secondary">
                      <MapPin className="w-3 h-3 mr-1" />
                      {post.location}
                    </Badge>
                  )}
                  {post.commitment && (
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {post.commitment}
                    </Badge>
                  )}
                  {post.equity_range && (
                    <Badge variant="secondary">
                      Equity: {post.equity_range}
                    </Badge>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Looking for:</p>
                  <div className="flex flex-wrap gap-2">
                    {post.looking_for.map((type) => (
                      <Badge key={type} className="bg-primary/10 text-primary border-primary/20">
                        {getCofounderTypeLabel(type)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {post.additional_info && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">{post.additional_info}</p>
                  </div>
                )}

                {post.is_sample ? (
                  <div className="flex gap-3 pt-2 items-center">
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                      Sample Post
                    </Badge>
                    <span className="text-xs text-muted-foreground">Create your own post to connect with real founders</span>
                  </div>
                ) : post.user_id === user?.id ? (
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEditPost(post.id)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Post
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => openDeleteDialog(post.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        if (!user) {
                          navigate(`/signup?source=cofounder-connect&return=${encodeURIComponent('/community/co-founders')}`);
                          return;
                        }
                        if (post.author?.username) {
                          navigate(`/profile/${post.author.username}`);
                        } else {
                          toast.info('View this founder\'s profile to connect with them.');
                        }
                      }}
                    >
                      <Handshake className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={messagingPostId === post.id}
                      onClick={async () => {
                        if (!user) {
                          navigate(`/signup?source=cofounder-message&return=${encodeURIComponent('/community/co-founders')}`);
                          return;
                        }
                        if (!post.user_id) {
                          toast.error('This founder does not have messaging enabled.');
                          return;
                        }
                        if (post.user_id === user.id) {
                          toast.error('You cannot message yourself.');
                          return;
                        }
                        setMessagingPostId(post.id);
                        try {
                          const conversationId = await startConversation(post.user_id);
                          if (conversationId) {
                            navigate(`/messages?conversationId=${conversationId}`);
                          } else {
                            toast.error('Failed to start conversation. Please try again.');
                          }
                        } catch {
                          toast.error('Failed to start conversation. Please try again.');
                        } finally {
                          setMessagingPostId(null);
                        }
                      }}
                    >
                      {messagingPostId === post.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <MessageCircle className="w-4 h-4 mr-2" />
                      )}
                      Message
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Smart Matching
            </CardTitle>
            <CardDescription>
              AI-powered algorithm matches you with co-founders based on complementary skills and shared values
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Verified Profiles
            </CardTitle>
            <CardDescription>
              All co-founder profiles are verified to ensure authenticity and serious commitment
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Experience Levels
            </CardTitle>
            <CardDescription>
              Find co-founders from first-time entrepreneurs to serial founders
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );

  return (
    <>
      <SEO
        title="Find a Co-Founder - Creatives Takeover"
        description="Browse startup co-founder opportunities, discover collaborators across product and growth, and connect with builders working on early-stage ideas."
        keywords="find a cofounder, startup cofounder, founder matching, startup collaborators, cofounder community"
        url="/community/co-founders"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Find a Co-Founder",
            description:
              "Browse startup co-founder opportunities, discover collaborators across product and growth, and connect with builders working on early-stage ideas.",
            url: "https://creatives-takeover.com/community/co-founders",
          },
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Community", url: "/community" },
            { name: "Find a Co-Founder", url: "/community/co-founders" },
          ]),
        ]}
      />
	      <div className="min-h-screen bg-background relative">
	        <CommunityCofoundersWallpaper />
	        <div className="relative z-10">
	          <Navigation />

	        {/* Hero Section */}
	        <section className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Handshake className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Find Your Perfect Match</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Find a Co-Founder
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Connect with talented entrepreneurs who share your vision and complement your skills
            </p>
          </div>
          {user ? (
            communityContent
          ) : (
            publicTab && (
              <PreviewModeWrapper
                featureName={publicTab.featureName}
                description={publicTab.description || ''}
                showPricingCta={publicTab.showPricingCta}
              >
                {communityContent}
              </PreviewModeWrapper>
            )
          )}

        </div>
        </section>

        <Footer />
      </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Co-Founder Post</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this post? This action cannot be undone.
                Your post will be permanently removed and no longer visible to other users.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPostToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePost}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Post
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default FindCoFounder;
