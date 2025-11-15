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
  MoreVertical,
  Image as ImageIcon,
  X
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
  const [editingCommentImage, setEditingCommentImage] = useState<string | null>(null);
  const [newCommentImage, setNewCommentImage] = useState<File | null>(null);
  const [newCommentImagePreview, setNewCommentImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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


  const handleEditComment = (commentId: string, currentContent: string, currentImageUrl?: string | null) => {
    setEditingCommentId(commentId);
    setEditingCommentContent(currentContent);
    setEditingCommentImage(currentImageUrl || null);
    setNewCommentImage(null);
    setNewCommentImagePreview(null);
  };

  const handleSaveComment = async (commentId: string) => {
    if (!editingCommentContent.trim() && !editingCommentImage) return;

    try {
      let imageUrl = editingCommentImage;
      
      // If there's a new image to upload
      if (newCommentImage) {
        setUploadingImage(true);
        const fileExt = newCommentImage.name.split('.').pop();
        const fileName = `${user?.id}/${commentId}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('comment-images')
          .upload(fileName, newCommentImage);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('comment-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Update comment with content and image
      const updateData: any = { 
        content: editingCommentContent.trim() || (imageUrl ? '[Image]' : '')
      };
      
      if (imageUrl) {
        updateData.image_url = imageUrl;
      }

      const { error } = await supabase
        .from('post_comments')
        .update(updateData)
        .eq('id', commentId);

      if (error) throw error;

      // Reload comments to get updated data
      await loadComments();
      setEditingCommentId(null);
      setEditingCommentContent("");
      setEditingCommentImage(null);
      setNewCommentImage(null);
      setNewCommentImagePreview(null);
      toast.success('Comment updated!');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
    setEditingCommentImage(null);
    setNewCommentImage(null);
    setNewCommentImagePreview(null);
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setNewCommentImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewCommentImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setNewCommentImage(null);
    setNewCommentImagePreview(null);
  };

  const handleAddComment = async () => {
    if (!isAuthenticated || !user) {
      setSignInTriggerAction('comment');
      setShowSignInModal(true);
      sessionStorage.setItem('conversion_source', JSON.stringify({
        type: 'community_comment',
        post_id: post.id,
        timestamp: Date.now()
      }));
      return;
    }

    if (!newComment.trim() && !newCommentImage) return;

    try {
      let imageUrl = null;
      
      // Upload image if present
      if (newCommentImage) {
        setUploadingImage(true);
        const fileExt = newCommentImage.name.split('.').pop();
        const fileName = `${user.id}/${post.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('comment-images')
          .upload(fileName, newCommentImage);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('comment-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Insert comment
      const commentData: any = {
        post_id: post.id,
        user_id: user.id,
        content: newComment.trim() || (imageUrl ? '[Image]' : '')
      };
      
      if (imageUrl) {
        commentData.image_url = imageUrl;
      }

      const { error } = await supabase
        .from('post_comments')
        .insert(commentData);

      if (error) throw error;
      
      setNewComment("");
      setNewCommentImage(null);
      setNewCommentImagePreview(null);
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
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setUploadingImage(false);
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
                  to={getProfileUrl(post.author.username, post.author.name)}
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
                        if (e.target.value.length <= 5000) {
                          setNewComment(e.target.value);
                        }
                      }}
                      rows={4}
                      maxLength={5000}
                      className="resize-none min-h-[100px]"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          id={`comment-image-${post.id}`}
                          disabled={uploadingImage}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`comment-image-${post.id}`)?.click()}
                          disabled={uploadingImage || !!newCommentImage}
                          className="h-8"
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Image
                        </Button>
                        {newCommentImagePreview && (
                          <div className="relative inline-block">
                            <img
                              src={newCommentImagePreview}
                              alt="Preview"
                              className="h-12 w-12 object-cover rounded"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveImage}
                              className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${newComment.length > 4500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {newComment.length}/5000
                        </span>
                        <Button
                          size="sm"
                          onClick={handleAddComment}
                          disabled={(!newComment.trim() && !newCommentImage) || uploadingImage}
                          className="h-8"
                        >
                          {uploadingImage ? 'Uploading...' : 'Comment'}
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
                              if (e.target.value.length <= 5000) {
                                setEditingCommentContent(e.target.value);
                              }
                            }}
                            maxLength={5000}
                            className="min-h-[120px] resize-none"
                            placeholder="Edit your comment..."
                          />
                          {(editingCommentImage || newCommentImagePreview) && (
                            <div className="relative inline-block">
                              <img
                                src={newCommentImagePreview || editingCommentImage || ''}
                                alt="Comment"
                                className="h-32 w-auto rounded-lg object-cover"
                              />
                              {newCommentImagePreview && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleRemoveImage}
                                  className="absolute top-2 right-2 h-6 w-6 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                                id={`edit-image-${comment.id}`}
                                disabled={uploadingImage}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById(`edit-image-${comment.id}`)?.click()}
                                disabled={uploadingImage}
                                className="h-8"
                              >
                                <ImageIcon className="h-4 w-4 mr-1" />
                                {editingCommentImage ? 'Change Image' : 'Add Image'}
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${editingCommentContent.length > 4500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {editingCommentContent.length}/5000
                              </span>
                              <Button 
                                size="sm" 
                                onClick={() => handleSaveComment(comment.id)}
                                disabled={uploadingImage || (!editingCommentContent.trim() && !editingCommentImage && !newCommentImage)}
                              >
                                {uploadingImage ? 'Saving...' : 'Save'}
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
                            <div className="prose prose-sm max-w-none dark:prose-invert text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {comment.content}
                              </ReactMarkdown>
                            </div>
                            {comment.image_url && (
                              <div className="mt-2">
                                <img
                                  src={comment.image_url}
                                  alt="Comment attachment"
                                  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(comment.image_url, '_blank')}
                                />
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