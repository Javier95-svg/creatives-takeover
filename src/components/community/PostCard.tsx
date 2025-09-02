import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Bookmark, MessageSquare, MoreVertical, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  onVoteChange?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onVoteChange }) => {
  const { user, isAuthenticated } = useAuth();
  const [score, setScore] = useState(post.votes);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Array<{
    id: string;
    author: string;
    text: string;
    avatar?: string;
  }>>([]);
  const [commentInput, setCommentInput] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // Load comments when opened
  useEffect(() => {
    if (commentsOpen && comments.length === 0) {
      loadComments();
    }
  }, [commentsOpen]);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          content,
          user_id,
          created_at,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (commentsData) {
        const transformedComments = commentsData.map(comment => ({
          id: comment.id,
          author: (comment as any).profiles?.full_name || 'Anonymous User',
          text: comment.content,
          avatar: (comment as any).profiles?.avatar_url
        }));
        setComments(transformedComments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const avatarFallback = useMemo(() => post.author.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase(), [post.author.name]);

  const handleVote = async (dir: "up" | "down") => {
    if (!isAuthenticated) {
      toast.error("Please sign in to vote");
      return;
    }

    // Optimistic update
    if (vote === dir) {
      // undo
      setVote(null);
      setScore((s) => s + (dir === "up" ? -1 : 1));
    } else {
      const delta = dir === "up" ? 1 : -1;
      setScore((s) => s + delta - (vote === "up" ? 1 : vote === "down" ? -1 : 0));
      setVote(dir);
    }

    // Note: In a real implementation, you'd want to track user votes in a separate table
    // For now, we'll just update the post's vote counts
    try {
      const { data: currentPost } = await supabase
        .from('community_posts')
        .select('upvotes, downvotes')
        .eq('id', post.id)
        .single();

      if (currentPost) {
        const updates: any = {};
        if (dir === "up") {
          updates.upvotes = (currentPost.upvotes || 0) + (vote === "up" ? -1 : 1);
          if (vote === "down") {
            updates.downvotes = Math.max(0, (currentPost.downvotes || 0) - 1);
          }
        } else {
          updates.downvotes = (currentPost.downvotes || 0) + (vote === "down" ? -1 : 1);
          if (vote === "up") {
            updates.upvotes = Math.max(0, (currentPost.upvotes || 0) - 1);
          }
        }

        await supabase
          .from('community_posts')
          .update(updates)
          .eq('id', post.id);

        onVoteChange?.();
      }
    } catch (error) {
      console.error('Error updating vote:', error);
      // Revert optimistic update on error
      if (vote === dir) {
        setVote(null);
        setScore((s) => s + (dir === "up" ? 1 : -1));
      } else {
        const delta = dir === "up" ? -1 : 1;
        setScore((s) => s + delta + (vote === "up" ? 1 : vote === "down" ? -1 : 0));
        setVote(null);
      }
      toast.error('Failed to update vote');
    }
  };

  const submitComment = async () => {
    if (!commentInput.trim()) return;
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to comment");
      return;
    }

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          content: commentInput.trim()
        });

      if (error) throw error;

      // Update comment count
      await supabase
        .from('community_posts')
        .update({ 
          comment_count: (post.commentsCount || 0) + 1 
        })
        .eq('id', post.id);

      // Add comment to local state
      setComments((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          author: user.user_metadata?.full_name || 'You',
          text: commentInput.trim()
        },
      ]);
      setCommentInput("");
      toast.success("Comment added");
      onVoteChange?.(); // Refresh to update comment count
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  return (
    <Card className="overflow-hidden">
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
              <MessageSquare className="mr-2 h-4 w-4" /> {post.commentsCount || 0} comments
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => toast.message("Share link copied")}> 
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            <Button type="button" variant="ghost" size="sm">
              <Bookmark className="mr-2 h-4 w-4" /> Save
            </Button>
          </div>

          {commentsOpen && (
            <div className="mt-4 space-y-3 border-t pt-4">
              {loadingComments ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Loading comments...</div>
                </div>
              ) : comments.length > 0 ? (
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
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</div>
                </div>
              )}
              
              {isAuthenticated ? (
                <div className="flex items-center gap-2 pt-2">
                  <Input
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Add a comment"
                    aria-label="Add a comment"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                  />
                  <Button onClick={submitComment} disabled={!commentInput.trim()}>Comment</Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">
                    <a href="/signup" className="text-primary hover:underline">Sign in</a> to join the conversation
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;
