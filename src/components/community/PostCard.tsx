import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Bookmark, MessageSquare, MoreVertical, Share2 } from "lucide-react";
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
  const [score, setScore] = useState(post.votes);
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(
    Array.from({ length: Math.min(2, post.commentsCount) }).map((_, i) => ({
      id: `${post.id}-c-${i}`,
      author: `Member ${i + 1}`,
      text: "Inspiring story! Thanks for sharing.",
    }))
  );
  const [commentInput, setCommentInput] = useState("");

  const avatarFallback = useMemo(() => post.author.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase(), [post.author.name]);

  const handleVote = (dir: "up" | "down") => {
    if (vote === dir) {
      // undo
      setVote(null);
      setScore((s) => s + (dir === "up" ? -1 : 1));
      return;
    }
    const delta = dir === "up" ? 1 : -1;
    setScore((s) => s + delta - (vote === "up" ? 1 : vote === "down" ? -1 : 0));
    setVote(dir);
  };

  const submitComment = () => {
    if (!commentInput.trim()) return;
    setComments((prev) => [
      ...prev,
      { id: `${post.id}-c-${Date.now()}`, author: "You", text: commentInput.trim() },
    ]);
    setCommentInput("");
    toast.success("Comment added");
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
              <MessageSquare className="mr-2 h-4 w-4" /> {comments.length} comments
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
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">{c.author.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{c.author}</span>
                    </div>
                    <p className="text-sm">{c.text}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <Input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment"
                  aria-label="Add a comment"
                />
                <Button onClick={submitComment} disabled={!commentInput.trim()}>Comment</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;
