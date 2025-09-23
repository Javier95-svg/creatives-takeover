import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Bookmark, MoreVertical, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import SignInModal from "./SignInModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SocialButtons } from "@/components/social/SocialButtons";

export type Post = {
  id: string;
  title: string;
  content: string;
  image?: string;
  tags: string[];
  location?: string;
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const displayLocation = (location: string) => {
    try {
      // Try to parse as JSON first
      const locationData = JSON.parse(location);
      if (locationData.address) {
        return locationData.address;
      }
    } catch {
      // If parsing fails, it's just a plain text location
    }
    return location;
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
      <Card className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 bg-gradient-to-br from-background to-muted/20" onClick={handlePostClick}>
        <CardHeader className="p-6 bg-gradient-to-r from-background/80 to-muted/10 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-lg">
              {post.author.avatar && (
                <AvatarImage src={post.author.avatar} alt={`${post.author.name} avatar`} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {post.author.name}
                  </span>
                  {post.location && (
                    <Badge variant="outline" className="text-xs">
                      📍 {displayLocation(post.location)}
                    </Badge>
                  )}
                  <span className="text-xs">•</span>
                  <time className="text-xs">{timeAgo(post.createdAt)}</time>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-xl font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              {post.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {post.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      #{t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {post.image && (
            <div className="relative overflow-hidden">
              <img
                src={post.image}
                alt={`Image for post ${post.title}`}
                className="max-h-[480px] w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          )}
          <div className="p-6">
            <ReactMarkdown
              className="text-base leading-relaxed text-foreground/90 [&>*]:mb-4 [&>h1]:text-2xl [&>h2]:text-xl [&>h3]:text-lg [&>h1,&>h2,&>h3]:font-bold [&>h1,&>h2,&>h3]:text-foreground [&>p]:text-foreground/80 [&>ul]:list-disc [&>ul]:ml-6 [&>ol]:list-decimal [&>ol]:ml-6"
              remarkPlugins={[remarkGfm]}
            >
              {post.content}
            </ReactMarkdown>
            
            {/* Action Bar */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Vote Buttons */}
                  <div className="flex items-center rounded-full border border-border/50 bg-muted/30 backdrop-blur-sm">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Upvote"
                      onClick={() => handleVote("up")}
                      className={`rounded-l-full px-3 ${vote === "up" ? "bg-green-500/20 text-green-600 hover:bg-green-500/30" : "hover:bg-muted"}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <span className="px-3 text-sm font-medium min-w-[2rem] text-center">{score}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Downvote"
                      onClick={() => handleVote("down")}
                      className={`rounded-r-full px-3 ${vote === "down" ? "bg-red-500/20 text-red-600 hover:bg-red-500/30" : "hover:bg-muted"}`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBookmark}
                    className={`rounded-full ${isBookmarked ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleShare}
                    className="rounded-full hover:bg-muted"
                  > 
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
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