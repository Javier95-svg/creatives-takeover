import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Repeat2, 
  MapPin, 
  MoreHorizontal,
  Send,
  MoreVertical
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SignInModal from "./SignInModal";
import { SocialButtons } from "@/components/social/SocialButtons";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import ReputationBadge from "./ReputationBadge";

export interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
    username?: string;
  };
  user_id?: string;
  tags: string[];
  location?: string;
  createdAt: string;
  votes: number;
  commentsCount: number;
  repostCount?: number;
  shareCount?: number;
  aiSummary?: string;
  aiInsights?: string[];
  aiRelatedTopics?: string[];
  aiStructuredIdea?: {
    problem: string;
    solution: string;
    market: string;
    validation: string;
    revenue: string;
  };
  aiTrendingAngle?: string;
  aiNextStep?: string;
  sourceType?: string;
  sourceData?: any;
  feedbackRequested?: boolean;
  feedbackCategory?: string[];
}

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [localLikes, setLocalLikes] = useState(post.votes);
  const [localReposts, setLocalReposts] = useState(post.repostCount || 0);
  const [localComments, setLocalComments] = useState(post.commentsCount);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const avatarFallback = useMemo(() => {
    return post.author.name
      .split(" ")
      .map(n => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [post.author.name]);

  // Load user's like and repost status
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const loadUserStatus = async () => {
      try {
        // Check if user liked this post
        const { data: likeData } = await supabase
          .from('user_votes')
          .select('vote_type')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsLiked(likeData?.vote_type === 'up');

        // Check if user reposted this post
        const { data: repostData } = await supabase
          .from('post_reposts')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        setIsReposted(!!repostData);
      } catch (error) {
        console.error('Error loading user status:', error);
      }
    };

    loadUserStatus();
  }, [isAuthenticated, user, post.id]);

  // Load comments
  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated || !user) {
      setShowSignInModal(true);
      return;
    }

    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from('user_votes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        setIsLiked(false);
        setLocalLikes(prev => prev - 1);
      } else {
        // Add like
        await supabase
          .from('user_votes')
          .upsert({
            post_id: post.id,
            user_id: user.id,
            vote_type: 'up'
          });
        
        setIsLiked(true);
        setLocalLikes(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error handling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleRepost = async () => {
    if (!isAuthenticated || !user) {
      setShowSignInModal(true);
      return;
    }

    try {
      if (isReposted) {
        // Remove repost
        await supabase
          .from('post_reposts')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        
        setIsReposted(false);
        setLocalReposts(prev => prev - 1);
        toast.success('Repost removed');
      } else {
        // Add repost
        await supabase
          .from('post_reposts')
          .insert({
            post_id: post.id,
            user_id: user.id
          });
        
        setIsReposted(true);
        setLocalReposts(prev => prev + 1);
        toast.success('Reposted successfully!');
      }
    } catch (error) {
      console.error('Error handling repost:', error);
      toast.error('Failed to repost');
    }
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/community?post=${post.id}`;
      await navigator.clipboard.writeText(url);
      
      // Update share count
      await supabase
        .from('community_posts')
        .update({ share_count: (post.shareCount || 0) + 1 })
        .eq('id', post.id);
      
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleAddComment = async () => {
    if (!isAuthenticated || !user) {
      setShowSignInModal(true);
      return;
    }

    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment
        });

      if (error) throw error;
      
      setNewComment("");
      setLocalComments(prev => prev + 1);
      loadComments();
      toast.success('Comment added!');
      
      // Auto-complete daily challenge if applicable (comment type)
      try {
        const { data: challengeData } = await supabase.rpc('get_todays_challenge');
        if (challengeData && challengeData.length > 0) {
          const challenge = challengeData[0];
          if (challenge.challenge_type === 'comment') {
            await supabase.rpc('complete_daily_challenge', {
              p_user_id: user.id,
              p_challenge_id: challenge.id,
              p_proof_reference_id: post.id,
              p_proof_reference_type: 'comment'
            });
          }
        }
      } catch (error) {
        console.error('Error auto-completing challenge:', error);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleEditComment = (commentId: string, currentContent: string) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(currentContent);
  };

  const handleSaveComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;

    try {
      const { error } = await supabase
        .from('post_comments')
        .update({ content: editingCommentContent.trim() })
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.map(c => 
        c.id === commentId ? { ...c, content: editingCommentContent.trim() } : c
      ));
      setEditingCommentId(null);
      setEditingCommentContent("");
      toast.success('Comment updated!');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  const displayLocation = (location: string | null | undefined) => {
    if (!location) return null;
    
    try {
      const parsed = JSON.parse(location);
      return parsed.address || location;
    } catch {
      return location;
    }
  };

  return (
    <>
      <Card className="w-full hover:shadow-md transition-all duration-200 border-border/50">
        <CardContent className="p-6">
          {/* Post Header */}
          <div className="flex items-start gap-3 mb-4">
            <Avatar className="h-12 w-12">
              {post.author.avatar && (
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Link 
                  to={`/profile/${post.author.username || post.user_id}`}
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {post.author.name}
                </Link>
                {post.user_id && (
                  <ReputationBadge userId={post.user_id} compact showPoints={false} />
                )}
                {isAuthenticated && user && post.user_id !== user.id && post.user_id && (
                  <SocialButtons 
                    userId={post.user_id} 
                    userName={post.author.name}
                    compact={true}
                  />
                )}
                <span className="text-muted-foreground text-sm">•</span>
                <span className="text-muted-foreground text-sm">{timeAgo(post.createdAt)}</span>
              </div>
              
              {post.location && (
                <div className="flex items-center gap-1 text-muted-foreground text-sm mb-2">
                  <MapPin className="h-3 w-3" />
                  <span>{displayLocation(post.location)}</span>
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Post Content */}
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-3 text-foreground">{post.title}</h2>
            
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-foreground">
                {post.content}
              </ReactMarkdown>
            </div>
          </div>
          
          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Social Media Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-6">
              {/* Like Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`flex items-center gap-2 rounded-full px-3 py-2 ${
                  isLiked 
                    ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" 
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                <span className="text-sm font-medium">{localLikes}</span>
              </Button>
              
              {/* Comment Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowComments(!showComments);
                  if (!showComments) loadComments();
                }}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{localComments}</span>
              </Button>
              
              {/* Repost Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRepost}
                className={`flex items-center gap-2 rounded-full px-3 py-2 ${
                  isReposted 
                    ? "text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" 
                    : "text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                }`}
              >
                <Repeat2 className="h-5 w-5" />
                <span className="text-sm font-medium">{localReposts}</span>
              </Button>
              
              {/* Share Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Share2 className="h-5 w-5" />
                <span className="text-sm font-medium">{post.shareCount || 0}</span>
              </Button>
            </div>
          </div>
          
          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-border/50">
              {/* Add Comment */}
              <div className="flex gap-3 mb-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-xs">
                    {user ? user.email?.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    className="flex-1 rounded-full"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="rounded-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      {comment.profiles?.avatar_url && (
                        <AvatarImage src={comment.profiles.avatar_url} alt={comment.profiles.full_name} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-xs">
                        {comment.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveComment(comment.id)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-muted rounded-2xl px-4 py-2 relative group">
                            <div className="flex items-start justify-between">
                              <Link 
                                to={`/profile/${comment.profiles?.username || comment.user_id}`}
                                className="font-medium text-sm mb-1 hover:text-primary transition-colors inline-block"
                              >
                                {comment.profiles?.full_name || 'Anonymous'}
                              </Link>
                              {user?.id === comment.user_id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="z-50 bg-popover border shadow-md">
                                    <DropdownMenuItem 
                                      onClick={() => handleEditComment(comment.id, comment.content)}
                                      className="cursor-pointer"
                                    >
                                      Edit
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                            <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {comment.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-1 px-2">
                            <span className="text-xs text-muted-foreground">
                              {timeAgo(comment.created_at)}
                            </span>
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0">
                              Like
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto p-0">
                              Reply
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {comments.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <SignInModal
        open={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />
    </>
  );
};

export default PostCard;