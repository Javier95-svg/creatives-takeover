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
  TrendingUp
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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="space-y-1">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Community Stats Header */}
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2">Entrepreneur Community</h1>
                  <p className="text-muted-foreground">Share your journey, connect with fellow creators</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{posts.length} posts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Active</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Post Composer - Skool Style */}
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
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
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Avatar className="h-10 w-10">
                    {user?.user_metadata?.avatar_url && (
                      <AvatarImage src={user.user_metadata.avatar_url} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                      {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 px-4 py-3 bg-muted/50 rounded-full text-muted-foreground hover:bg-muted/70 transition-colors">
                    What's on your mind? Share your entrepreneurial journey...
                  </div>
                  <Button variant="outline" size="sm">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Photo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {user?.user_metadata?.avatar_url && (
                        <AvatarImage src={user.user_metadata.avatar_url} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                        {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{user?.user_metadata?.full_name || 'Entrepreneur'}</p>
                      <p className="text-sm text-muted-foreground">Sharing to community</p>
                    </div>
                  </div>
                  
                  <Textarea
                    placeholder="What's happening in your entrepreneurial journey? Share insights, ask questions, or celebrate wins..."
                    value={newPost.content}
                    onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                    className="min-h-[120px] resize-none border-none bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0"
                  />
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Photo
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
                    
                    <div className="flex items-center gap-2">
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
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleCreatePost}
                        disabled={!newPost.content.trim()}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posts Feed */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <Card className="text-center p-12">
                <CardContent>
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground">Be the first to share something with the community!</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {/* Post Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {post.author.avatar && (
                            <AvatarImage src={post.author.avatar} alt={post.author.name} />
                          )}
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                            {post.author.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{post.author.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Post Content */}
                    <div className="mb-4">
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {/* AI Insights */}
                    {post.aiSummary && (
                      <Card className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                            <span className="text-sm font-medium text-blue-700">AI Insights</span>
                          </div>
                          <p className="text-sm text-blue-600">{post.aiSummary}</p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Separator className="mb-4" />

                    {/* Post Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLikePost(post.id)}
                          className={`gap-2 ${post.isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'}`}
                        >
                          <Heart className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                          <span>{post.likes}</span>
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
                          className="gap-2 hover:text-blue-500"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>{post.commentsCount}</span>
                        </Button>
                        
                        <Button variant="ghost" size="sm" className="gap-2 hover:text-green-500">
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {expandedComments.has(post.id) && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-4">
                          {/* Add Comment */}
                          {isAuthenticated ? (
                            <div className="flex gap-3">
                              <Avatar className="h-8 w-8">
                                {user?.user_metadata?.avatar_url && (
                                  <AvatarImage src={user.user_metadata.avatar_url} />
                                )}
                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-xs">
                                  {user?.user_metadata?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 flex gap-2">
                                <Input
                                  placeholder="Write a comment..."
                                  value={newComments[post.id] || ''}
                                  onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  className="flex-1"
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleAddComment(post.id)}
                                  disabled={!newComments[post.id]?.trim()}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <Button 
                                variant="outline" 
                                onClick={() => setShowSignInModal(true)}
                              >
                                Sign in to comment
                              </Button>
                            </div>
                          )}
                          
                          {/* Comments List */}
                          {postComments[post.id] && postComments[post.id].length > 0 ? (
                            <div className="space-y-3">
                              {postComments[post.id].map((comment) => (
                                <div key={comment.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                                  <Avatar className="h-8 w-8">
                                    {comment.author.avatar && (
                                      <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                                    )}
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-xs">
                                      {comment.author.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm">{comment.author.name}</span>
                                      <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-sm mb-2">{comment.content}</p>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleLikeComment(comment.id, post.id)}
                                        className={`gap-1 text-xs h-7 px-2 ${comment.isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'}`}
                                      >
                                        <Heart className={`h-3 w-3 ${comment.isLiked ? 'fill-current' : ''}`} />
                                        <span>{comment.likes}</span>
                                      </Button>
                                      <Button variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2 hover:text-blue-500">
                                        Reply
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground text-center py-4">
                              No comments yet. Be the first to comment!
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