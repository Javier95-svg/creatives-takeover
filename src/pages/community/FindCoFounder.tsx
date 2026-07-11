import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import CommunityCofoundersWallpaper from "@/components/wallpapers/CommunityCofoundersWallpaper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PreviewModeWrapper } from "@/components/ui/PreviewModeWrapper";
import { Handshake, Search, MapPin, Briefcase, Users, Plus, Calendar, CheckCircle, Edit2, Trash2, MessageCircle, Loader2, Maximize2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
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

const POSTS_PER_PAGE = 10;

const FindCoFounder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const publicTab = getPublicTabConfig('/co-founder');
  const { startConversation } = useMessaging({ autoLoad: false });
  const [posts, setPosts] = useState<CofounderPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [messagingPostId, setMessagingPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [fullPost, setFullPost] = useState<CofounderPost | null>(null);

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
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const currentPage = Math.min(
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    Math.max(totalPages, 1),
  );
  const pageStart = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(pageStart, pageStart + POSTS_PER_PAGE);

  const changePage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    if (page === 1) next.delete('page');
    else next.set('page', String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetPagination = () => {
    if (!searchParams.has('page')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

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
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    resetPagination();
                  }}
                  placeholder="Search projects, roles, industries, or locations"
                  className="h-12 w-full rounded-xl border border-border bg-background pl-10 pr-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <select
                aria-label="Filter by co-founder role"
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  resetPagination();
                }}
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
                  Post Here
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
                  Post Here
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          paginatedPosts.map((post) => (
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
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <Badge variant="outline" className="flex w-fit items-center gap-1 whitespace-nowrap">
                      <CheckCircle className="w-3 h-3" />
                      {getStageLabel(post.stage)}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground" onClick={() => setFullPost(post)}>
                      <Maximize2 className="mr-1.5 h-4 w-4" />
                      Full post
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-4">
                <CardDescription className="line-clamp-3 whitespace-pre-wrap text-sm leading-6">
                  {post.project_description}
                </CardDescription>

                <div>
                  <p className="mb-2 text-sm font-semibold">Looking for:</p>
                  <div className="flex flex-wrap gap-2">
                    {post.looking_for.map((type) => (
                      <Badge key={type} className="border-primary/20 bg-primary/10 text-primary">
                        {getCofounderTypeLabel(type)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  {post.industry && (
                    <Badge className="border-transparent bg-sky-700 text-white hover:bg-sky-700">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {post.industry}
                    </Badge>
                  )}
                  {post.location && (
                    <Badge className="border-transparent bg-violet-700 text-white hover:bg-violet-700">
                      <MapPin className="w-3 h-3 mr-1" />
                      {post.location}
                    </Badge>
                  )}
                  {post.commitment && (
                    <Badge className="border-transparent bg-emerald-700 text-white hover:bg-emerald-700">
                      <Users className="w-3 h-3 mr-1" />
                      {post.commitment}
                    </Badge>
                  )}
                  {post.equity_range && (
                    <Badge className="border-transparent bg-amber-700 text-white hover:bg-amber-700">
                      Equity: {post.equity_range}
                    </Badge>
                  )}
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
                  <div className="mt-auto flex justify-center border-t pt-4">
                    <Button
                      className="w-full sm:w-48"
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

      {totalPages > 1 && (
        <Pagination className="mb-12" aria-label="Co-founder post pages">
          <PaginationContent className="gap-2">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href={page === 1 ? '/co-founder' : `/co-founder?page=${page}`}
                  isActive={page === currentPage}
                  aria-label={`Go to co-founder posts page ${page}`}
                  onClick={(event) => {
                    event.preventDefault();
                    changePage(page);
                  }}
                  className="h-11 w-11 rounded-full"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
          </PaginationContent>
        </Pagination>
      )}
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
          <div className="mb-12 pt-8 text-center sm:pt-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <Handshake className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Founder Community</span>
            </div>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-info via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Find a Co-Founder
              </span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
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

        <Dialog open={Boolean(fullPost)} onOpenChange={(open) => !open && setFullPost(null)}>
          <DialogContent className="h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto rounded-xl p-6 sm:h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)] sm:p-10">
            {fullPost && (
              <div className="mx-auto w-full max-w-4xl space-y-8">
                <DialogHeader className="pr-10 text-left">
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={fullPost.author?.avatar_url} />
                      <AvatarFallback>{fullPost.author?.full_name?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogDescription className="text-sm">{fullPost.author?.full_name || 'Founder'} · {formatDistanceToNow(new Date(fullPost.created_at), { addSuffix: true })}</DialogDescription>
                      <Badge variant="outline" className="mt-1 flex w-fit items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        {getStageLabel(fullPost.stage)}
                      </Badge>
                    </div>
                  </div>
                  <DialogTitle className="text-3xl leading-tight sm:text-4xl">{fullPost.project_name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">About the project</h3>
                  <p className="whitespace-pre-wrap text-base leading-8 sm:text-lg">{fullPost.project_description}</p>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold">Looking for:</h3>
                  <div className="flex flex-wrap gap-2">
                    {fullPost.looking_for.map((type) => (
                      <Badge key={type} className="border-primary/20 bg-primary/10 text-primary">{getCofounderTypeLabel(type)}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t pt-5">
                  {fullPost.industry && <Badge className="border-transparent bg-sky-700 text-white hover:bg-sky-700"><Briefcase className="mr-1 h-3 w-3" />{fullPost.industry}</Badge>}
                  {fullPost.location && <Badge className="border-transparent bg-violet-700 text-white hover:bg-violet-700"><MapPin className="mr-1 h-3 w-3" />{fullPost.location}</Badge>}
                  {fullPost.commitment && <Badge className="border-transparent bg-emerald-700 text-white hover:bg-emerald-700"><Users className="mr-1 h-3 w-3" />{fullPost.commitment}</Badge>}
                  {fullPost.equity_range && <Badge className="border-transparent bg-amber-700 text-white hover:bg-amber-700">Equity: {fullPost.equity_range}</Badge>}
                </div>

                {fullPost.additional_info && (
                  <div className="border-t pt-5">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Additional details</h3>
                    <p className="whitespace-pre-wrap text-base leading-7">{fullPost.additional_info}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default FindCoFounder;
