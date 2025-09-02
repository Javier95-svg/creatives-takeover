import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Bookmark, MessageSquare, MoreVertical, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import SignInModal from "./SignInModal";

export type Post = {
  id: string;
  title: string;
  content: string;
  image?: string;
  tags: string[];
  createdAt: string; // ISO
  author: { name: string; avatar?: string };
  votes: number;
  commentsCount: number;
  // AI moderator fields (optional, populated behind the scenes)
  aiSummary?: string;
  aiInsights?: string[];
  aiRelatedTopics?: string[];
  aiStructuredIdea?: {
    problem: string;
    solution: string;
    audience: string;
    next_steps: string[];
  };
  aiTrendingAngle?: string;
  aiNextStep?: string;
};

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [score, setScore] = useState(post.votes);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(true); // Open comments by default
  const [comments, setComments] = useState<Array<{id: string, author: string, text: string, avatar?: string}>>([]);
  const [commentInput, setCommentInput] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  const avatarFallback = useMemo(() => post.author.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase(), [post.author.name]);

  // Load user's vote status and bookmark status
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadUserInteractions = async () => {
      try {
        // Check vote status
        const { data: voteData } = await supabase
          .from('user_votes')
          .select('vote_type')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .maybeSingle();

        if (voteData) {
          setVote(voteData.vote_type as "up" | "down");
        }

        // Check bookmark status
        const { data: bookmarkData } = await supabase
          .from('user_bookmarks')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .maybeSingle();

        setIsBookmarked(!!bookmarkData);
      } catch (error) {
        console.error('Error loading user interactions:', error);
      }
    };

    loadUserInteractions();
  }, [post.id, user, isAuthenticated]);

  // Load comments when opened
  useEffect(() => {
    if (!commentsOpen) return;

    const loadComments = async () => {
      setLoadingComments(true);
      try {
        const { data, error } = await supabase
          .from('post_comments')
          .select('*')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error loading comments:', error);
          return;
        }

        // Fetch author information using secure function for each comment
        const authorPromises = (data || []).map(async (comment) => {
          const { data: authorData } = await supabase.rpc('get_post_author_info', {
            author_user_id: comment.user_id
          });
          return {
            commentId: comment.id,
            authorName: authorData?.[0]?.author_name || 'Anonymous',
            authorAvatar: authorData?.[0]?.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent('Anonymous')}`
          };
        });

        const authorResults = await Promise.all(authorPromises);
        const authorMap = new Map(authorResults.map(result => [result.commentId, result]));

        let mappedComments = (data || []).map((comment) => {
          const authorInfo = authorMap.get(comment.id);
          const author = authorInfo?.authorName || 'Anonymous';
          return {
            id: comment.id,
            author,
            text: comment.content,
            avatar: authorInfo?.authorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(author)}`,
          };
        });

        // If no real comments exist, show demo comments from different fictional users
        if (mappedComments.length === 0) {
          console.log('🔍 No real comments found, using demo comments');
          mappedComments = [
            {
              id: 'demo-1',
              author: 'Maya Chen',
              text: 'This is incredible! What was your biggest challenge during implementation?',
              avatar: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400&h=400&fit=crop&crop=face'
            },
            {
              id: 'demo-2', 
              author: 'Carlos Rodriguez',
              text: 'Thanks for sharing! How long did this take you to build?',
              avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'
            },
            {
              id: 'demo-3',
              author: 'Priya Sharma', 
              text: 'Amazing results! Any advice for someone just starting out?',
              avatar: 'https://images.unsplash.com/photo-1544005314-0ceecf7a77ce?w=400&h=400&fit=crop&crop=face'
            },
            {
              id: 'demo-4',
              author: 'Jordan Park',
              text: 'Love the transparency in sharing numbers. What metrics do you track?',
              avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face'
            }
          ];
        } else {
          console.log(`🎉 Found ${mappedComments.length} real comments from database`);
        }

        // Enforce unique authors - if real comments exist, use them; otherwise use demo
        const seenAuthors = new Set<string>();
        const uniqueByAuthor = mappedComments.filter((c) => {
          if (seenAuthors.has(c.author)) return false;
          seenAuthors.add(c.author);
          return true;
        });

        console.log('💬 Final comments with unique authors:', uniqueByAuthor);
        setComments(uniqueByAuthor);
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setLoadingComments(false);
      }
    };

    loadComments();
  }, [commentsOpen, post.id]);

  const handleVote = async (dir: "up" | "down") => {
    if (!isAuthenticated || !user) {
      toast.error('Please sign in to vote');
      navigate('/auth');
      return;
    }

    try {
      if (vote === dir) {
        // Remove vote
        await supabase
          .from('user_votes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
        
        setVote(null);
        setScore(s => s + (dir === "up" ? -1 : 1));
        toast.success('Vote removed');
      } else {
        // Add or update vote
        await supabase
          .from('user_votes')
          .upsert({
            user_id: user.id,
            post_id: post.id,
            vote_type: dir
          });

        const delta = dir === "up" ? 1 : -1;
        setScore(s => s + delta - (vote === "up" ? 1 : vote === "down" ? -1 : 0));
        setVote(dir);
        toast.success(`Post ${dir}voted`);
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Failed to vote');
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please sign in to bookmark posts');
      navigate('/auth');
      return;
    }

    try {
      if (isBookmarked) {
        await supabase
          .from('user_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', post.id);
        
        setIsBookmarked(false);
        toast.success('Bookmark removed');
      } else {
        await supabase
          .from('user_bookmarks')
          .insert({
            user_id: user.id,
            post_id: post.id
          });
        
        setIsBookmarked(true);
        toast.success('Post bookmarked');
      }
    } catch (error) {
      console.error('Error bookmarking:', error);
      toast.error('Failed to bookmark');
    }
  };

  const submitComment = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please sign in to comment');
      navigate('/auth');
      return;
    }

    if (!commentInput.trim()) return;

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: commentInput.trim()
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        toast.error('Failed to add comment');
        return;
      }

      // Get user profile for the comment
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      const newComment = {
        id: data.id,
        author: profile?.full_name || 'You',
        text: data.content,
        avatar: profile?.avatar_url
      };

      setComments(prev => [...prev, newComment]);
      setCommentInput("");
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handlePostClick = (e: React.MouseEvent) => {
    // Don't show modal if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }
    
    if (!isAuthenticated) {
      setShowSignInModal(true);
    }
  };

  const handleSignIn = () => {
    setShowSignInModal(false);
    navigate('/auth');
  };

  const handleSignUp = () => {
    setShowSignInModal(false);
    navigate('/auth');
  };

  return (
    <>
      <Card className="overflow-hidden cursor-pointer" onClick={handlePostClick}>
        <CardHeader className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9">
              {post.author.avatar && (
                <AvatarImage src={post.author.avatar} alt={`${post.author.name} avatar`} />
              )}
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{post.author.name}</span> · {timeAgo(post.createdAt)}
                </div>
                <Button variant="ghost" size="icon" aria-label="More actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="mt-1 text-lg font-semibold leading-tight">{post.title}</h2>
              {post.tags?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.tags.map((t) => (
                    <Badge key={t} variant="secondary">#{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {post.image && (
            <img
              src={post.image}
              alt={`Image for post ${post.title}`}
              className="max-h-[480px] w-full object-cover"
              loading="lazy"
            />
          )}
          <div className="p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {post.content}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center rounded-full border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Upvote"
                  onClick={() => handleVote("up")}
                >
                  <ArrowUp className={`h-4 w-4 ${vote === "up" ? "text-primary" : ""}`} />
                </Button>
                <span className="min-w-[2rem] text-center text-sm">{score}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Downvote"
                  onClick={() => handleVote("down")}
                >
                  <ArrowDown className={`h-4 w-4 ${vote === "down" ? "text-primary" : ""}`} />
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCommentsOpen((o) => !o)}
                aria-expanded={commentsOpen}
              >
                <MessageSquare className="mr-2 h-4 w-4" /> {post.commentsCount || comments.length} comments
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleShare}> 
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={handleBookmark}
                className={isBookmarked ? "text-primary" : ""}
              >
                <Bookmark className={`mr-2 h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} /> 
                {isBookmarked ? "Saved" : "Save"}
              </Button>
            </div>

            {commentsOpen && (
              <div className="mt-4 space-y-3 border-t pt-4">
                {loadingComments ? (
                  <div className="text-sm text-muted-foreground">Loading comments...</div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-7 w-7">
                        {c.avatar && <AvatarImage src={c.avatar} alt={`${c.author} avatar`} />}
                        <AvatarFallback className="text-[10px]">{c.author.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{c.author}</span>
                        </div>
                        <p className="text-sm">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Add a comment"
                    aria-label="Add a comment"
                    onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                  />
                  <Button onClick={submitComment} disabled={!commentInput.trim()}>Comment</Button>
                </div>
              </div>
            )}
          </div>
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
