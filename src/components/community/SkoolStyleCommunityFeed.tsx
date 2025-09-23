import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Image as ImageIcon,
  MapPin,
  Send,
  Users,
  TrendingUp,
  Filter,
  Search,
  Sparkles,
  Target,
  Zap,
  Globe,
  Star
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SignInModal from "./SignInModal";
import LocationSearchInput from "./LocationSearchInput";

interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  location?: string;
  locationData?: {
    address: string;
    coordinates: [number, number];
  };
  createdAt: string;
  author: {
    name: string;
    avatar?: string;
  };
  likes: number;
  commentsCount: number;
  isLiked?: boolean;
  aiSummary?: string;
  aiInsights?: string[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    avatar?: string;
  };
  likes: number;
  isLiked?: boolean;
}

const SkoolStyleCommunityFeed = () => {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  
  // Post composer state
  const [isComposing, setIsComposing] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    tags: [] as string[],
    location: "",
    locationData: null as any
  });
  
  // Comments state
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  // Filter state
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Popular topics for filtering
  const popularTopics = [
    "All Posts",
    "Startup",
    "SaaS", 
    "Funding",
    "Growth",
    "MVP",
    "Validation",
    "Marketing",
    "Product",
    "Revenue",
    "Scaling",
    "AI & Tech",
    "Success Stories",
    "Failures & Lessons"
  ];

  // Fetch posts
  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      if (!data || data.length === 0) {
        setPosts([]);
        return;
      }

      // Get author info for each post
      const authorPromises = data.map(async (post) => {
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

      const formattedPosts: Post[] = data.map(post => {
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
          likes: (post.upvotes || 0) - (post.downvotes || 0),
          commentsCount: post.comment_count || 0,
          aiSummary: post.ai_summary,
          aiInsights: post.ai_insights
        };
      });

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  // Filter posts based on topic and search
  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery === "" || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTopic = selectedTopic === null || selectedTopic === "All Posts" ||
      post.tags.some(tag => tag.toLowerCase().includes(selectedTopic.toLowerCase()));
    
    return matchesSearch && matchesTopic;
  });

  useEffect(() => {
    fetchPosts();
    
    // Real-time subscription for posts
    const channel = supabase
      .channel('community-posts-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_posts'
      }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Create new post
  const handleCreatePost = async () => {
    if (!isAuthenticated || !user) {
      setShowSignInModal(true);
      return;
    }

    if (!newPost.content.trim()) {
      toast.error('Please write something to share');
      return;
    }

    try {
      let locationToStore = newPost.location;
      if (newPost.locationData && newPost.locationData.coordinates) {
        locationToStore = JSON.stringify({
          address: newPost.locationData.address,
          coordinates: newPost.locationData.coordinates
        });
      }

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          title: newPost.title || 'Community Post',
          content: newPost.content,
          tags: newPost.tags,
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

      toast.success('Post shared successfully!');
      
      // Reset form
      setNewPost({
        title: "",
        content: "",
        tags: [],
        location: "",
        locationData: null
      });
      setIsComposing(false);

      // AI moderation in background
      setTimeout(async () => {
        try {
          const { data: aiData, error: aiError } = await supabase.functions.invoke('community-ai-moderator', {
            body: {
              title: newPost.title || 'Community Post',
              content: newPost.content,
              tags: newPost.tags,
            },
          });

          if (!aiError && aiData) {
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
          }
        } catch (error) {
          console.error('AI moderation error:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  };

  // Handle adding a comment
  const handleAddComment = async (postId: string) => {
    if (!isAuthenticated || !user) {
      setShowSignInModal(true);
      return;
    }

    const commentText = newComments[postId]?.trim();
    if (!commentText) {
      toast.error('Please write a comment');
      return;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: commentText
        });

      if (error) {
        console.error('Error creating comment:', error);
        toast.error('Failed to add comment');
        return;
      }

      // Clear the comment input
      setNewComments(prev => ({ ...prev, [postId]: '' }));
      
      // Refresh posts to update comment count
      fetchPosts();
      fetchPostComments(postId);
      
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  // Fetch comments for a specific post
  const fetchPostComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      // Get author info for each comment
      const authorPromises = (data || []).map(async (comment) => {
        const { data: authorData } = await supabase.rpc('get_post_author_info', {
          author_user_id: comment.user_id
        });
        return {
          commentId: comment.id,
          authorName: authorData?.[0]?.author_name || 'Anonymous',
          authorAvatar: authorData?.[0]?.author_avatar
        };
      });

      const authorResults = await Promise.all(authorPromises);
      const authorMap = new Map(authorResults.map(result => [result.commentId, result]));

      const formattedComments: Comment[] = (data || []).map(comment => {
        const authorInfo = authorMap.get(comment.id);
        return {
          id: comment.id,
          content: comment.content,
          createdAt: comment.created_at,
          author: {
            name: authorInfo?.authorName || 'Anonymous',
            avatar: authorInfo?.authorAvatar
          },
          likes: (comment.upvotes || 0) - (comment.downvotes || 0),
          isLiked: false
        };
      });

      setPostComments(prev => ({ ...prev, [postId]: formattedComments }));
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  // Handle like/unlike comment
  const handleLikeComment = async (commentId: string, postId: string) => {
    if (!isAuthenticated || !user) {
      setShowSignInModal(true);
      return;
    }

    try {
      // Check if user already voted on this comment
      const { data: existingVote } = await supabase
        .from('user_votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('comment_id', commentId)
        .single();

      if (existingVote) {
        // Remove vote
        await supabase
          .from('user_votes')
          .delete()
          .eq('id', existingVote.id);
      } else {
        // Add vote
        await supabase
          .from('user_votes')
          .insert({
            user_id: user.id,
            comment_id: commentId,
            vote_type: 'up'
          });
      }

      // Refresh comments for this post
      fetchPostComments(postId);
    } catch (error) {
      console.error('Error handling comment like:', error);
      toast.error('Failed to update like');
    }
  };

  // Handle like/unlike post
  const handleLikePost = async (postId: string) => {
    if (!isAuthenticated || !user) {
      setShowSignInModal(true);
      return;
    }

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('user_votes')
        .select('*')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .single();

      if (existingVote) {
        // Remove vote
        await supabase
          .from('user_votes')
          .delete()
          .eq('id', existingVote.id);
      } else {
        // Add vote
        await supabase
          .from('user_votes')
          .insert({
            user_id: user.id,
            post_id: postId,
            vote_type: 'up'
          });
      }

      // Refresh posts to update counts
      fetchPosts();
    } catch (error) {
      console.error('Error handling like:', error);
      toast.error('Failed to update like');
    }
  };

  // Format time ago
  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse bg-white/70 backdrop-blur-xl border-slate-200/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-slate-300 rounded-full"></div>
                    <div className="space-y-1">
                      <div className="h-4 bg-slate-300 rounded w-24"></div>
                      <div className="h-3 bg-slate-300 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-300 rounded w-full"></div>
                    <div className="h-4 bg-slate-300 rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-cyan-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400/40 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-3/4 right-1/4 w-3 h-3 bg-purple-400/40 rounded-full animate-bounce delay-700"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-indigo-400/60 rounded-full animate-ping delay-1000"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="pt-32 pb-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="mb-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm border border-blue-200/20 rounded-full px-4 py-2 mb-6">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Premium Entrepreneur Community
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-slate-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent leading-tight">
                Share Your Journey
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Connect with fellow entrepreneurs, share wins & failures, get feedback, and grow together in our thriving community
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full px-4 py-2 border border-slate-200/20">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{filteredPosts.length}+ Stories Shared</span>
                </div>
                <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full px-4 py-2 border border-slate-200/20">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Active Community</span>
                </div>
                <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full px-4 py-2 border border-slate-200/20">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">AI-Powered Insights</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-8">
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Search and Filter Bar */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/20 shadow-xl">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search stories, insights, or entrepreneurs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/50 dark:bg-slate-800/50 border-slate-200/30 focus:border-blue-400/50 focus:ring-blue-400/20"
                    />
                  </div>
                  <Button variant="outline" className="bg-white/50 dark:bg-slate-800/50 border-slate-200/30 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>
                
                {/* Topic Filter Pills */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-200/20">
                  {popularTopics.map((topic) => (
                    <Button
                      key={topic}
                      size="sm"
                      variant={selectedTopic === topic || (selectedTopic === null && topic === "All Posts") ? "default" : "outline"}
                      onClick={() => setSelectedTopic(topic === "All Posts" ? null : topic)}
                      className={`rounded-full transition-all duration-200 ${
                        selectedTopic === topic || (selectedTopic === null && topic === "All Posts")
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                          : "bg-white/50 dark:bg-slate-800/50 border-slate-200/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:scale-105"
                      }`}
                    >
                      {topic}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Post Composer - Premium Design */}
            <Card className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-blue-400/30">
              <CardContent className="p-6">
                {!isComposing ? (
                  <div 
                    onClick={() => {
                      if (!isAuthenticated) {
                        setShowSignInModal(true);
                        return;
                      }
                      setIsComposing(true);
                    }}
                    className="flex items-center gap-4 cursor-pointer group"
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-blue-200/50 group-hover:ring-blue-400/50 transition-all duration-200">
                      {user?.user_metadata?.avatar_url && (
                        <AvatarImage src={user.user_metadata.avatar_url} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-lg font-semibold">
                        {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 px-6 py-4 bg-gradient-to-r from-slate-50/80 to-blue-50/80 dark:from-slate-800/80 dark:to-blue-900/80 rounded-full border border-slate-200/30 group-hover:border-blue-400/40 group-hover:shadow-lg transition-all duration-200">
                      <span className="text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        What's your entrepreneurial story today? Share insights, wins, or ask for advice...
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="bg-white/50 dark:bg-slate-800/50 border-slate-200/30 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Photo
                      </Button>
                      <Button variant="outline" size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none hover:from-blue-700 hover:to-purple-700">
                        <Zap className="h-4 w-4 mr-2" />
                        AI Insights
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-blue-400/50">
                        {user?.user_metadata?.avatar_url && (
                          <AvatarImage src={user.user_metadata.avatar_url} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-lg font-semibold">
                          {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{user?.user_metadata?.full_name || 'Entrepreneur'}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Globe className="h-3 w-3" />
                          <span>Sharing to Community</span>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>Live</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Textarea
                      placeholder="Share your entrepreneurial journey... What challenge are you facing? What success are you celebrating? What insight have you discovered?"
                      value={newPost.content}
                      onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                      className="min-h-[140px] resize-none border-none bg-transparent text-base placeholder:text-slate-400 focus-visible:ring-0 text-lg leading-relaxed"
                    />
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/30">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Media
                        </Button>
                        <LocationSearchInput 
                          value={newPost.location}
                          onChange={(location, locationData) => {
                            setNewPost(prev => ({
                              ...prev,
                              location: location,
                              locationData: locationData
                            }));
                          }}
                          placeholder="Add location..."
                        />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setIsComposing(false);
                            setNewPost({
                              title: "",
                              content: "",
                              tags: [],
                              location: "",
                              locationData: null
                            });
                          }}
                          className="bg-white/50 dark:bg-slate-800/50 border-slate-200/30"
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleCreatePost}
                          disabled={!newPost.content.trim()}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Share Story
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Posts Feed */}
            <div className="space-y-6">
              {filteredPosts.length === 0 ? (
                <Card className="text-center p-12 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/20">
                  <CardContent>
                    <div className="mb-6">
                      {searchQuery || selectedTopic ? (
                        <Search className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                      ) : (
                        <Users className="h-16 w-16 mx-auto mb-4 text-slate-400" />
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {searchQuery || selectedTopic ? 'No posts found' : 'No stories yet'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                      {searchQuery || selectedTopic 
                        ? 'Try adjusting your search or filter criteria'
                        : 'Be the first to share your entrepreneurial journey with the community!'
                      }
                    </p>
                    {(!searchQuery && !selectedTopic) && (
                      <Button 
                        onClick={() => {
                          if (!isAuthenticated) {
                            setShowSignInModal(true);
                            return;
                          }
                          setIsComposing(true);
                        }}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                      >
                        Share Your Story
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                filteredPosts.map((post) => (
                  <Card key={post.id} className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/20 shadow-lg hover:shadow-2xl transition-all duration-300 hover:border-blue-400/30">
                    <CardContent className="p-6">
                      {/* Post Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 ring-2 ring-slate-200/50 group-hover:ring-blue-400/50 transition-all duration-200">
                            {post.author.avatar && (
                              <AvatarImage src={post.author.avatar} alt={post.author.name} />
                            )}
                            <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 font-semibold">
                              {post.author.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-lg">{post.author.name}</p>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                              <span>{timeAgo(post.createdAt)}</span>
                              {post.location && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{post.location}</span>
                                  </div>
                                </>
                              )}
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Community</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="hover:bg-slate-100 dark:hover:bg-slate-800/50">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Post Content */}
                      <div className="mb-6">
                        <p className="text-base leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">{post.content}</p>
                      </div>

                      {/* AI Insights */}
                      {post.aiSummary && (
                        <Card className="mb-6 bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-950/80 dark:to-purple-950/80 border-blue-200/30">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-2 w-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                              <Sparkles className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">AI Business Insights</span>
                            </div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 leading-relaxed">{post.aiSummary}</p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {post.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs bg-gradient-to-r from-slate-100 to-blue-100 dark:from-slate-800 dark:to-blue-900 text-slate-700 dark:text-slate-300 hover:from-blue-100 hover:to-purple-100 transition-all duration-200 cursor-pointer">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <Separator className="mb-6 bg-slate-200/50" />

                      {/* Post Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLikePost(post.id)}
                            className={`gap-2 group/like hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 ${post.isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'}`}
                          >
                            <Heart className={`h-5 w-5 transition-transform duration-200 group-hover/like:scale-110 ${post.isLiked ? 'fill-current' : ''}`} />
                            <span className="font-medium">{post.likes}</span>
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newExpanded = new Set(expandedComments);
                              if (newExpanded.has(post.id)) {
                                newExpanded.delete(post.id);
                              } else {
                                newExpanded.add(post.id);
                                // Fetch comments when expanding
                                fetchPostComments(post.id);
                              }
                              setExpandedComments(newExpanded);
                            }}
                            className="gap-2 group/comment hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-500 transition-all duration-200"
                          >
                            <MessageCircle className="h-5 w-5 transition-transform duration-200 group-hover/comment:scale-110" />
                            <span className="font-medium">{post.commentsCount}</span>
                          </Button>
                          
                          <Button variant="ghost" size="sm" className="gap-2 group/share hover:bg-green-50 dark:hover:bg-green-950/20 hover:text-green-500 transition-all duration-200">
                            <Share2 className="h-5 w-5 transition-transform duration-200 group-hover/share:scale-110" />
                            <span className="font-medium">Share</span>
                          </Button>
                        </div>
                      </div>

                      {/* Comments Section */}
                      {expandedComments.has(post.id) && (
                        <>
                          <Separator className="my-6 bg-slate-200/50" />
                          <div className="space-y-6">
                            {/* Add Comment */}
                            {isAuthenticated ? (
                              <div className="flex gap-4">
                                <Avatar className="h-10 w-10 ring-2 ring-slate-200/50">
                                  {user?.user_metadata?.avatar_url && (
                                    <AvatarImage src={user.user_metadata.avatar_url} />
                                  )}
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-sm font-semibold">
                                    {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 flex gap-3">
                                  <Input
                                    placeholder="Share your thoughts on this story..."
                                    value={newComments[post.id] || ''}
                                    onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                                    className="flex-1 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200/30 focus:border-blue-400/50 focus:ring-blue-400/20"
                                  />
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleAddComment(post.id)}
                                    disabled={!newComments[post.id]?.trim()}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setShowSignInModal(true)}
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none hover:from-blue-700 hover:to-purple-700"
                                >
                                  Sign in to join the conversation
                                </Button>
                              </div>
                            )}
                            
                            {/* Comments List */}
                            {postComments[post.id] && postComments[post.id].length > 0 ? (
                              <div className="space-y-4">
                                {postComments[post.id].map((comment) => (
                                  <div key={comment.id} className="flex gap-4 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/30">
                                    <Avatar className="h-9 w-9 ring-2 ring-slate-200/50">
                                      {comment.author.avatar && (
                                        <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                                      )}
                                      <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-xs font-semibold">
                                        {comment.author.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <span className="font-semibold text-sm">{comment.author.name}</span>
                                        <span className="text-xs text-slate-500">{timeAgo(comment.createdAt)}</span>
                                      </div>
                                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">{comment.content}</p>
                                      <div className="flex items-center gap-4">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleLikeComment(comment.id, post.id)}
                                          className={`gap-2 text-xs h-8 px-3 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 ${comment.isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'}`}
                                        >
                                          <Heart className={`h-3 w-3 ${comment.isLiked ? 'fill-current' : ''}`} />
                                          <span>{comment.likes}</span>
                                        </Button>
                                        <Button variant="ghost" size="sm" className="gap-2 text-xs h-8 px-3 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-500 transition-all duration-200">
                                          Reply
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="font-medium mb-1">No comments yet</p>
                                <p className="text-sm">Be the first to share your thoughts on this story!</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <SignInModal
        open={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSignIn={() => {}}
        onSignUp={() => {}}
      />
    </div>
  );
};

export default SkoolStyleCommunityFeed;