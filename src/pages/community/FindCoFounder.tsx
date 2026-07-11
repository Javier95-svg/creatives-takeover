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
import { Handshake, Search, MapPin, Briefcase, Users, Plus, Calendar, CheckCircle, Edit2, Trash2, MessageCircle, Loader2 } from "lucide-react";
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
  const publicTab = getPublicTabConfig('/co-founder');
  const { startConversation } = useMessaging({ autoLoad: false });
  const [posts, setPosts] = useState<CofounderPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [messagingPostId, setMessagingPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    void fetchPosts();
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
            .from('public_profiles')
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
    navigate(`/co-founder/edit/${postId}`);
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

  const filteredPosts = posts.filter((post) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || [post.project_name, post.project_description, post.industry, post.location, post.author?.full_name, ...post.looking_for]
      .some((value) => value?.toLowerCase().includes(query));
    const matchesRole = roleFilter === 'all' || post.looking_for.includes(roleFilter);
    return matchesQuery && matchesRole;
  });

  const communityContent = (
    <>
      <div className="mb-8">
        <Card className="border-border/70 bg-card/90 shadow-sm backdrop-blur-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search projects, roles, industries, or locations"
                  className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <select
                aria-label="Filter by co-founder role"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-12 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 lg:w-56"
              >
                <option value="all">All roles</option>
                <option value="technical">Technical</option>
                <option value="business">Business</option>
                <option value="marketing">Marketing</option>
                <option value="design">Design</option>
                <option value="finance">Finance</option>
              </select>
              <Button asChild className="h-12 rounded-xl lg:px-6">
                <Link to="/co-founder/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post · 5 credits
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Founder opportunities</h2>
          <p className="text-sm text-muted-foreground">Browse community posts and contact founders directly.</p>
        </div>
        {!loading && <Badge variant="secondary">{filteredPosts.filter((post) => !post.is_sample).length} live</Badge>}
      </div>

      <div className="mb-12 grid gap-5 lg:grid-cols-2">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground">Loading posts...</p>
            </CardContent>
          </Card>
        ) : filteredPosts.length === 0 ? (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-purple/5">
            <CardContent className="pt-6 text-center py-12">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <Handshake className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h2 className="mb-3 text-2xl font-bold">No posts found</h2>
              <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
                Try another search or publish what you are building and who you need.
              </p>
              <Button asChild size="lg">
                <Link to="/co-founder/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your Post · 5 credits
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id} className="flex h-full flex-col overflow-hidden border-border/70 bg-card/90 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-11 w-11 border">
                      <AvatarImage src={post.author?.avatar_url} />
                      <AvatarFallback>
                        {post.author?.full_name?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="mb-1 line-clamp-1 text-lg">{post.project_name}</CardTitle>
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
                  <Badge variant="outline" className="flex w-fit items-center gap-1 whitespace-nowrap">
                    <CheckCircle className="w-3 h-3" />
                    {getStageLabel(post.stage)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4">
                <CardDescription className="line-clamp-3 whitespace-pre-wrap text-sm leading-6">
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
                  <div className="mt-auto flex items-center gap-3 border-t pt-4">
                    <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                      Sample Post
                    </Badge>
                    <span className="text-xs text-muted-foreground">Create your own post to connect with real founders</span>
                  </div>
                ) : post.user_id === user?.id ? (
                  <div className="mt-auto flex gap-3 border-t pt-4">
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
                  <div className="mt-auto flex gap-3 border-t pt-4">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        if (!user) {
                          navigate(`/signup?source=cofounder-connect&return=${encodeURIComponent('/co-founder')}`);
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
                          navigate(`/signup?source=cofounder-message&return=${encodeURIComponent('/co-founder')}`);
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

      <Card className="mb-12 overflow-hidden border-primary/20 bg-primary/[0.04]">
        <CardContent className="grid gap-5 p-6 sm:grid-cols-3">
          <div><p className="text-sm font-semibold">1. Publish clearly</p><p className="mt-1 text-sm text-muted-foreground">Explain what you are building and the role you need.</p></div>
          <div><p className="text-sm font-semibold">2. Review founders</p><p className="mt-1 text-sm text-muted-foreground">Search the current community by role, industry, or location.</p></div>
          <div><p className="text-sm font-semibold">3. Start a conversation</p><p className="mt-1 text-sm text-muted-foreground">Open a profile or message a founder directly.</p></div>
        </CardContent>
      </Card>
    </>
  );

  return (
    <>
      <SEO
        title="Find a Co-Founder - Creatives Takeover"
        description="Browse startup co-founder opportunities, discover collaborators across product and growth, and connect with builders working on early-stage ideas."
        keywords="find a cofounder, startup cofounder, founder matching, startup collaborators, cofounder community"
        url="/co-founder"
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Find a Co-Founder",
            description:
              "Browse startup co-founder opportunities, discover collaborators across product and growth, and connect with builders working on early-stage ideas.",
            url: "https://creatives-takeover.com/co-founder",
          },
          createBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Community", url: "/mentorship" },
            { name: "Find a Co-Founder", url: "/co-founder" },
          ]),
        ]}
      />
	      <div className="min-h-screen bg-background relative">
	        <CommunityCofoundersWallpaper />
	        <div className="relative z-10">
	          <Navigation />

	        {/* Hero Section */}
	        <section className="px-4 pb-16 pt-header-offset sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-9 max-w-3xl pt-8 sm:pt-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
              <Handshake className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Founder community</span>
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">Find a co-founder</h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Share what you are building, discover founders with complementary skills, and start a direct conversation.
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
