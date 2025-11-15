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
  X,
  Music
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
  const [newCommentMediaType, setNewCommentMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
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
        try {
          const fileExt = newCommentImage.name.split('.').pop();
          const fileName = `${user?.id}/${commentId}_${Date.now()}.${fileExt}`;
          
          console.log('Uploading image for comment edit:', fileName);
          
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('comment-images')
            .upload(fileName, newCommentImage, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
              throw new Error('Image storage bucket not found. Please contact support to set up image storage.');
            } else if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS')) {
              throw new Error('Permission denied. Please check your account permissions.');
            } else if (uploadError.message?.includes('File size') || uploadError.message?.includes('too large')) {
              throw new Error('Image is too large. Maximum size is 10MB.');
            } else {
              throw new Error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
            }
          }
          
          if (!uploadData) {
            throw new Error('Upload succeeded but no data returned');
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('comment-images')
            .getPublicUrl(fileName);
          
          if (!publicUrl) {
            throw new Error('Failed to get public URL for uploaded image');
          }
          
          imageUrl = publicUrl;
          console.log('Image uploaded successfully:', publicUrl);
        } catch (uploadErr: any) {
          console.error('Image upload failed:', uploadErr);
          toast.error(uploadErr.message || 'Failed to upload image. Please try again.');
          setUploadingImage(false);
          return; // Don't proceed with comment update if image upload fails
        } finally {
          setUploadingImage(false);
        }
      }

      // Update comment with content and image - preserve user text
      const updateData: any = { 
        content: editingCommentContent.trim() || null  // Allow null if only image, preserve text otherwise
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
    if (!file) {
      // Reset input if no file selected
      e.target.value = '';
      return;
    }

    // Validate file size (50MB max to match PostComposer)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      e.target.value = ''; // Reset input
      return;
    }

    // Validate file type and determine media type
    let mediaType: 'image' | 'video' | 'audio' | null = null;
    if (file.type.startsWith('image/')) {
      mediaType = 'image';
    } else if (file.type.startsWith('video/')) {
      mediaType = 'video';
    } else if (file.type.startsWith('audio/')) {
      mediaType = 'audio';
    } else {
      toast.error('Please select an image, video, or audio file');
      e.target.value = ''; // Reset input
      return;
    }

    console.log('Media file selected:', file.name, file.type, file.size, 'bytes', 'Type:', mediaType);
    
    setNewCommentImage(file);
    setNewCommentMediaType(mediaType);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setNewCommentImagePreview(reader.result as string);
        console.log('Media preview generated for type:', mediaType);
      }
    };
    reader.onerror = () => {
      console.error('Error reading media file');
      toast.error('Error reading file. Please try another file.');
      setNewCommentImage(null);
      setNewCommentImagePreview(null);
      setNewCommentMediaType(null);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setNewCommentImage(null);
    setNewCommentImagePreview(null);
    setNewCommentMediaType(null);
  };

  const handleAddComment = async () => {
    console.log('handleAddComment called');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user:', user);
    console.log('newComment:', newComment);
    console.log('newCommentImage:', newCommentImage);
    
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

    if (!newComment.trim() && !newCommentImage) {
      console.log('No comment text and no image, returning');
      toast.error('Please enter a comment or attach an image');
      return;
    }
    
    console.log('Proceeding with comment submission');

    try {
      let imageUrl = null;
      
      // Upload media file if present
      if (newCommentImage) {
        setUploadingImage(true);
        try {
          const fileExt = newCommentImage.name.split('.').pop();
          const fileName = `${user.id}/${post.id}_${Date.now()}.${fileExt}`;
          
          // Determine storage bucket based on media type
          const bucketName = newCommentMediaType === 'video' ? 'comment-videos' 
            : newCommentMediaType === 'audio' ? 'comment-audio' 
            : 'comment-images';
          
          console.log(`Uploading ${newCommentMediaType} to ${bucketName} bucket:`, fileName);
          
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from(bucketName)
            .upload(fileName, newCommentImage, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            // Provide specific error messages
            if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
              throw new Error(`${newCommentMediaType} storage bucket not found. Please contact support to set up media storage.`);
            } else if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS')) {
              throw new Error('Permission denied. Please check your account permissions.');
            } else if (uploadError.message?.includes('File size') || uploadError.message?.includes('too large')) {
              throw new Error('File is too large. Maximum size is 50MB.');
            } else {
              throw new Error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
            }
          }
          
          if (!uploadData) {
            throw new Error('Upload succeeded but no data returned');
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          
          if (!publicUrl) {
            throw new Error('Failed to get public URL for uploaded file');
          }
          
          imageUrl = publicUrl;
          console.log(`${newCommentMediaType} uploaded successfully:`, publicUrl);
        } catch (uploadErr: any) {
          console.error('Media upload failed:', uploadErr);
          toast.error(uploadErr.message || 'Failed to upload file. Please try again.');
          setUploadingImage(false);
          return; // Don't proceed with comment if media upload fails
        } finally {
          setUploadingImage(false);
        }
      }

      // Insert comment - preserve user text, store media URL based on type
      const commentData: any = {
        post_id: post.id,
        user_id: user.id,
        content: newComment.trim() || null  // Allow null if only media, preserve text otherwise
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
      setNewCommentMediaType(null);
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
            
            {isAuthenticated && user && post.user_id === user.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Comment button clicked. Current showComments:', showComments);
                  const newShowComments = !showComments;
                  setShowComments(newShowComments);
                  if (newShowComments) {
                    console.log('Loading comments for post:', post.id);
                    loadComments();
                  }
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
                        <input
                          type="file"
                          accept="image/*,video/*,audio/*"
                          onChange={(e) => {
                            console.log('File input onChange triggered for post:', post.id);
                            handleImageSelect(e);
                          }}
                          onClick={(e) => {
                            console.log('File input clicked');
                            e.stopPropagation();
                          }}
                          className="hidden"
                          id={`comment-image-${post.id}`}
                          disabled={uploadingImage}
                          multiple={false}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Media button clicked for post:', post.id);
                            
                            // Try multiple methods to find and trigger the file input
                            let fileInput = document.getElementById(`comment-image-${post.id}`) as HTMLInputElement;
                            
                            if (!fileInput) {
                              // Try querySelector as fallback
                              fileInput = document.querySelector(`#comment-image-${post.id}`) as HTMLInputElement;
                            }
                            
                            if (fileInput) {
                              console.log('File input found, triggering click');
                              // Reset value to allow selecting same file again
                              fileInput.value = '';
                              // Trigger click
                              fileInput.click();
                            } else {
                              console.error('File input not found! ID:', `comment-image-${post.id}`);
                              console.error('Available inputs:', document.querySelectorAll('input[type="file"]'));
                              toast.error('Media upload not available. Please refresh the page.');
                            }
                          }}
                          disabled={uploadingImage}
                          className="h-8"
                        >
                          <ImageIcon className="h-4 w-4 mr-1" />
                          {newCommentImagePreview ? 'Change Media' : 'Add Media'}
                        </Button>
                        {newCommentImagePreview && (
                          <div className="relative inline-block">
                            {newCommentMediaType === 'image' && (
                              <img
                                src={newCommentImagePreview}
                                alt="Preview"
                                className="h-12 w-12 object-cover rounded"
                              />
                            )}
                            {newCommentMediaType === 'video' && (
                              <video
                                src={newCommentImagePreview}
                                className="h-12 w-20 object-cover rounded"
                                muted
                              />
                            )}
                            {newCommentMediaType === 'audio' && (
                              <div className="h-12 w-20 flex items-center justify-center bg-muted rounded">
                                <Music className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Comment button clicked');
                            handleAddComment();
                          }}
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
                                onChange={(e) => {
                                  console.log('File input onChange triggered for comment edit:', comment.id);
                                  handleImageSelect(e);
                                }}
                                onClick={(e) => {
                                  console.log('File input clicked for edit');
                                  e.stopPropagation();
                                }}
                                className="hidden"
                                id={`edit-image-${comment.id}`}
                                disabled={uploadingImage}
                                multiple={false}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Image button clicked for comment edit:', comment.id);
                                  
                                  // Try multiple methods to find and trigger the file input
                                  let fileInput = document.getElementById(`edit-image-${comment.id}`) as HTMLInputElement;
                                  
                                  if (!fileInput) {
                                    // Try querySelector as fallback
                                    fileInput = document.querySelector(`#edit-image-${comment.id}`) as HTMLInputElement;
                                  }
                                  
                                  if (fileInput) {
                                    console.log('File input found for edit, triggering click');
                                    // Reset value to allow selecting same file again
                                    fileInput.value = '';
                                    // Trigger click
                                    fileInput.click();
                                  } else {
                                    console.error('File input not found for edit! ID:', `edit-image-${comment.id}`);
                                    console.error('Available inputs:', document.querySelectorAll('input[type="file"]'));
                                    toast.error('Image upload not available. Please refresh the page.');
                                  }
                                }}
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