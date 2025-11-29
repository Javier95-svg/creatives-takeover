import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  MoreVertical,
  Bookmark
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SignInModal from "./SignInModal";
import { SocialButtons } from "@/components/social/SocialButtons";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import ReputationBadge from "./ReputationBadge";
import { getProfileUrl } from "@/utils/profileUtils";

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
  media_urls?: string[];
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

const PostCard = React.memo<PostCardProps>(({ post }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInTriggerAction, setSignInTriggerAction] = useState<'like' | 'comment' | 'repost' | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [localLikes, setLocalLikes] = useState(post.votes);
  const [localReposts, setLocalReposts] = useState(post.repostCount || 0);
  const [localComments, setLocalComments] = useState(post.commentsCount);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
      // First, fetch comments without profile join
      const { data: commentsData, error: commentsError } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Extract unique user IDs from comments
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))];

      // Fetch profiles for all comment authors in one query (if there are any user IDs)
      let profilesData = null;
      if (userIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
          // Continue with comments even if profile fetch fails
        } else {
          profilesData = data;
        }
      }

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile])
      );

      // Join comments with profiles
      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || {
          full_name: 'Anonymous',
          avatar_url: null,
          username: null
        }
      }));

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments. Please try again.');
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated || !user) {
      setSignInTriggerAction('like');
      setShowSignInModal(true);
      // Track conversion trigger
      sessionStorage.setItem('conversion_source', JSON.stringify({
        type: 'community_like',
        post_id: post.id,
        timestamp: Date.now()
      }));
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
      setSignInTriggerAction('repost');
      setShowSignInModal(true);
      // Track conversion trigger
      sessionStorage.setItem('conversion_source', JSON.stringify({
        type: 'community_repost',
        post_id: post.id,
        timestamp: Date.now()
      }));
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

  const handleBookmark = async () => {
    if (!isAuthenticated || !user) {
      setSignInTriggerAction('comment'); // Reuse sign-in modal
      setShowSignInModal(true);
      return;
    }

    try {
      // TODO: Implement bookmark functionality when bookmark table exists
      setIsBookmarked(!isBookmarked);
      toast.success(isBookmarked ? 'Bookmark removed' : 'Bookmarked!');
    } catch (error) {
      console.error('Error bookmarking:', error);
      toast.error('Failed to bookmark');
    }
  };

  // Helper to detect media type from URL
  const getMediaType = (url: string): 'image' | 'video' | 'audio' => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('comment-videos') || /\.(mp4|webm|ogg|mov)(\?|$)/.test(urlLower)) {
      return 'video';
    }
    if (urlLower.includes('comment-audio') || /\.(mp3|wav|ogg|m4a|aac)(\?|$)/.test(urlLower)) {
      return 'audio';
    }
    return 'image';
  };

  // Get first media URL from media_urls array
  const featuredMedia = post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : null;
  const featuredMediaType = featuredMedia ? getMediaType(featuredMedia) : null;

  // Content truncation logic
  const MAX_DESCRIPTION_LENGTH = 200;
  const shouldTruncate = !isExpanded && post.content.length > MAX_DESCRIPTION_LENGTH;


  const handleEditComment = (commentId: string, currentContent: string, imageUrl?: string | null) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(currentContent);
  };

  const handleSaveComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;

    try {
      // Update comment content only
      const updateData: any = { 
        content: editingCommentContent.trim()
      };

      const { error } = await supabase
        .from('post_comments')
        .update(updateData)
        .eq('id', commentId);

      if (error) throw error;

      // Reload comments to get updated data
      await loadComments();
      setEditingCommentId(null);
      setEditingCommentContent("");
      toast.success('Comment updated!');
    } catch (error: any) {
      console.error('Error updating comment:', error);
      const errorMessage = error?.message || 'Failed to update comment';
      toast.error(errorMessage);
      
      // Log detailed error for debugging
      if (error?.code) {
        console.error('Error code:', error.code);
      }
      if (error?.details) {
        console.error('Error details:', error.details);
      }
      if (error?.hint) {
        console.error('Error hint:', error.hint);
      }
    } finally {
      // no-op
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
  };

    const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      
      // Reload comments
      await loadComments();
      setLocalComments(prev => Math.max(0, prev - 1));
      toast.success('Comment deleted!');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleAddComment = async () => {
    console.log('handleAddComment called');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user:', user);
    console.log('newComment:', newComment);
    
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, showing sign in modal');
      setSignInTriggerAction('comment');
      setShowSignInModal(true);
      sessionStorage.setItem('conversion_source', JSON.stringify({
        type: 'community_comment',
        post_id: post.id,
        timestamp: Date.now()
      }));
      return;
    }

    if (!newComment.trim()) {
      console.log('No comment text, returning');
      toast.error('Please enter a comment');
      return;
    }
    
    console.log('Proceeding with comment submission');

    try {
      // Insert text-only comment
      const commentData: any = {
        post_id: post.id,
        user_id: user.id,
        content: newComment.trim()
      };

      const { error } = await supabase
        .from('post_comments')
        .insert(commentData);

      if (error) throw error;
      
      setNewComment("");
      setLocalComments(prev => prev + 1);
      loadComments();
      toast.success('Comment added!');
      
      // Auto-complete daily challenge if applicable
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
    } catch (error: any) {
      console.error('Error adding comment:', error);
      const errorMessage = error?.message || 'Failed to add comment';
      toast.error(errorMessage);
      
      // Log detailed error for debugging
      if (error?.code) {
        console.error('Error code:', error.code);
      }
      if (error?.details) {
        console.error('Error details:', error.details);
      }
      if (error?.hint) {
        console.error('Error hint:', error.hint);
      }
    } finally {
      // no-op
    }
  };

  const handleSignIn = () => {
    const source = signInTriggerAction ? `community-${signInTriggerAction}` : 'community';
    navigate(`/login?source=${source}&return=/community`);
  };

  const handleSignUp = () => {
    const source = signInTriggerAction ? `community-${signInTriggerAction}` : 'community';
    navigate(`/signup?source=${source}&return=/community`);
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

  const handleDeletePost = async () => {
    if (!isAuthenticated || !user || !post.user_id || user.id !== post.user_id) {
      toast.error('You can only delete your own posts');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete all comments for this post first (cascade should handle this, but being explicit)
      await supabase
        .from('post_comments')
        .delete()
        .eq('post_id', post.id);

      // Delete votes for this post
      await supabase
        .from('user_votes')
        .delete()
        .eq('post_id', post.id);

      // Delete reposts for this post
      await supabase
        .from('post_reposts')
        .delete()
        .eq('post_id', post.id);

      // Delete the post
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Post deleted successfully');
      // Reload the page to refresh the feed
      window.location.reload();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  return (
    <>
      <Card className="w-full my-3 sm:my-4 hover:shadow-lg hover:scale-[1.01] transition-all duration-300 border-border/50">
        <CardContent className="p-4 sm:p-5">
          {/* CARD HEADER */}
          <div className="flex items-start gap-3 mb-4">
            <Avatar className="h-10 w-10 flex-shrink-0">
              {post.author.avatar && (
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-sm">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link 
                  to={getProfileUrl(post.author.username, post.author.name)}
                  className="font-semibold text-foreground hover:text-primary transition-colors text-sm sm:text-base"
                >
                  {post.author.name}
                </Link>
                {post.author.username && (
                  <>
                    <span className="text-muted-foreground text-sm">|</span>
                    <span className="text-muted-foreground text-sm">@{post.author.username}</span>
                  </>
                )}
                {post.user_id && (
                  <ReputationBadge userId={post.user_id} compact showPoints={false} />
                )}
                <span className="text-muted-foreground text-sm">•</span>
                <span className="text-muted-foreground text-sm">Posted {timeAgo(post.createdAt)}</span>
              </div>
            </div>
            
            {isAuthenticated && user && post.user_id === user.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full flex-shrink-0" aria-label="Post menu">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 bg-background border shadow-md">
                  <DropdownMenuItem 
                    onClick={handleDeletePost}
                    className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    Delete post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* CARD BODY */}
          <div className="mb-4 space-y-3">
            {/* Title */}
            <h2 className="text-lg font-bold text-foreground leading-tight">{post.title}</h2>
            
            {/* Description */}
            <div className="text-base" style={{ lineHeight: '1.6' }}>
              {shouldTruncate ? (
                <>
                  <div className="text-foreground/90 prose prose-sm max-w-none dark:prose-invert [&_p]:mb-2 [&_p]:mt-0 [&_p]:leading-relaxed line-clamp-3">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm, remarkBreaks]} 
                    >
                      {post.content}
                    </ReactMarkdown>
                  </div>
                  <button
                    onClick={() => setIsExpanded(true)}
                    className="text-primary hover:text-primary/80 text-sm font-medium mt-2 inline-block"
                  >
                    Read more
                  </button>
                </>
              ) : (
                <>
                  <div className="text-foreground/90 prose prose-sm max-w-none dark:prose-invert [&_p]:mb-2 [&_p]:mt-0 [&_p]:leading-relaxed">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm, remarkBreaks]} 
                    >
                      {post.content}
                    </ReactMarkdown>
                  </div>
                  {post.content.length > MAX_DESCRIPTION_LENGTH && (
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="text-primary hover:text-primary/80 text-sm font-medium mt-2 inline-block"
                    >
                      Show less
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Featured Media Preview */}
            {featuredMedia && (
              <div className="w-full rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {featuredMediaType === 'video' ? (
                  <video
                    src={featuredMedia}
                    controls
                    className="w-full h-full object-cover"
                  >
                    Your browser does not support video playback.
                  </video>
                ) : featuredMediaType === 'audio' ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted p-4">
                    <audio src={featuredMedia} controls className="w-full">
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                ) : (
                  <img
                    src={featuredMedia}
                    alt="Post media"
                    className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => window.open(featuredMedia, '_blank')}
                  />
                )}
              </div>
            )}

            {/* Tags - Inline */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 text-sm">
                {post.tags.map((tag, index) => (
                  <span key={index} className="text-primary hover:text-primary/80 font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* CARD FOOTER */}
          <div className="pt-4 border-t border-border/50 space-y-3">
            {/* Engagement Metrics Row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>❤️ {localLikes}</span>
              <span>💬 {localComments}</span>
              <span>⤴️ {post.shareCount || 0}</span>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={`flex items-center justify-center gap-2 h-11 w-11 sm:h-10 sm:w-auto sm:px-4 rounded-lg min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 ${
                  isLiked 
                    ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" 
                    : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                }`}
                aria-label={`${isLiked ? 'Unlike' : 'Like'} this post`}
              >
                <Heart className={`h-5 w-5 ${isLiked ? "fill-current" : ""}`} />
                <span className="hidden sm:inline text-sm font-medium">{localLikes}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const newShowComments = !showComments;
                  setShowComments(newShowComments);
                  if (newShowComments) {
                    loadComments();
                  }
                }}
                className="flex items-center justify-center gap-2 h-11 w-11 sm:h-10 sm:w-auto sm:px-4 rounded-lg min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                aria-label="Comment on this post"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">{localComments}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="flex items-center justify-center gap-2 h-11 w-11 sm:h-10 sm:w-auto sm:px-4 rounded-lg min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                aria-label="Share this post"
              >
                <Share2 className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">Share</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBookmark}
                className={`flex items-center justify-center gap-2 h-11 w-11 sm:h-10 sm:w-auto sm:px-4 rounded-lg min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 ${
                  isBookmarked 
                    ? "text-primary hover:text-primary/80 hover:bg-primary/10" 
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                }`}
                aria-label={`${isBookmarked ? 'Remove bookmark' : 'Bookmark'} this post`}
              >
                <Bookmark className={`h-5 w-5 ${isBookmarked ? "fill-current" : ""}`} />
                <span className="hidden sm:inline text-sm font-medium">Save</span>
              </Button>
            </div>
          </div>
          
          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-border/50">
              {/* Add Comment - Reddit Style */}
              <div className="space-y-3 mb-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-xs">
                      {user ? user.email?.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="What are your thoughts?"
                      value={newComment}
                      onChange={(e) => {
                        // Allow ALL characters including numbers, preserve spacing exactly
                        const newValue = e.target.value;
                        if (newValue.length <= 5000) {
                          setNewComment(newValue);
                        } else {
                          setNewComment(newValue.slice(0, 5000));
                        }
                      }}
                      onInput={(e) => {
                        // Ensure input is not blocked
                        const target = e.target as HTMLTextAreaElement;
                        console.log('Textarea input event:', target.value);
                      }}
                      rows={4}
                      maxLength={5000}
                      className="resize-none min-h-[100px] font-normal"
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'normal' }}
                      inputMode="text"
                      autoComplete="off"
                      spellCheck="true"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${newComment.length > 4500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {newComment.length}/5000
                        </span>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Comment button clicked');
                            handleAddComment();
                          }}
                          disabled={!newComment.trim()}
                          className="h-8"
                        >
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
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
                        <div className="space-y-3">
                          <Textarea
                            value={editingCommentContent}
                            onChange={(e) => {
                              // Allow ALL characters including numbers, preserve spacing exactly
                              const newValue = e.target.value;
                              if (newValue.length <= 5000) {
                                setEditingCommentContent(newValue);
                              } else {
                                setEditingCommentContent(newValue.slice(0, 5000));
                              }
                            }}
                            onInput={(e) => {
                              // Ensure input is not blocked
                              const target = e.target as HTMLTextAreaElement;
                              console.log('Edit textarea input event:', target.value);
                            }}
                            maxLength={5000}
                            className="min-h-[120px] resize-none font-normal"
                            style={{ whiteSpace: 'pre-wrap', wordBreak: 'normal' }}
                            placeholder="Edit your comment..."
                            inputMode="text"
                            autoComplete="off"
                            spellCheck="true"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${editingCommentContent.length > 4500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {editingCommentContent.length}/5000
                              </span>
                              <Button 
                                size="sm" 
                                onClick={() => handleSaveComment(comment.id)}
                                disabled={!editingCommentContent.trim()}
                              >
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-muted rounded-2xl px-4 py-2 relative group">
                            <div className="flex items-start justify-between">
                              <Link 
                                to={getProfileUrl(comment.profiles?.username, comment.profiles?.full_name || undefined)}
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
                                      className="h-6 w-6 p-0 hover:bg-accent"
                                    >
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="z-50 bg-background border shadow-md">
                                    <DropdownMenuItem 
                                      onClick={() => handleEditComment(comment.id, comment.content, comment.image_url)}
                                      className="cursor-pointer hover:bg-accent"
                                    >
                                      Edit comment
                                    </DropdownMenuItem>
                                                     <DropdownMenuItem 
                   onClick={() => handleDeleteComment(comment.id)}
                   className="cursor-pointer hover:bg-accent text-destructive hover:text-destructive"
                 >
                   Delete comment
                 </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                            <div className="text-sm whitespace-pre-wrap break-words text-foreground">
                              {comment.content ? (
                                <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                  {comment.content}
                                </span>
                              ) : (
                                comment.image_url && (
                                  <span className="text-muted-foreground italic">[Media only]</span>
                                )
                              )}
                            </div>
                            {comment.image_url && (
                              <div className="mt-2">
                                {/* Detect media type from URL */}
                                {(() => {
                                  const url = comment.image_url.toLowerCase();
                                  const isVideo = url.includes('comment-videos') || 
                                    /\.(mp4|webm|ogg|mov)(\?|$)/.test(url);
                                  const isAudio = url.includes('comment-audio') || 
                                    /\.(mp3|wav|ogg|m4a|aac)(\?|$)/.test(url);
                                  
                                  if (isVideo) {
                                    return (
                                      <video
                                        src={comment.image_url}
                                        controls
                                        className="max-w-full h-auto rounded-lg"
                                      >
                                        Your browser does not support video playback.
                                      </video>
                                    );
                                  } else if (isAudio) {
                                    return (
                                      <div className="p-4 border rounded-md bg-muted">
                                        <audio src={comment.image_url} controls className="w-full">
                                          Your browser does not support audio playback.
                                        </audio>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <img
                                        src={comment.image_url}
                                        alt="Comment attachment"
                                        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => window.open(comment.image_url, '_blank')}
                                      />
                                    );
                                  }
                                })()}
                              </div>
                            )}
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
        onClose={() => {
          setShowSignInModal(false);
          setSignInTriggerAction(null);
        }}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        triggerAction={signInTriggerAction}
      />
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if critical post data changes
  return prevProps.post.id === nextProps.post.id &&
         prevProps.post.votes === nextProps.post.votes &&
         prevProps.post.commentsCount === nextProps.post.commentsCount &&
         prevProps.post.repostCount === nextProps.post.repostCount;
});

export default PostCard;