import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin, Heart, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface PinnedPost {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  comment_count: number;
  tags: string[];
  created_at: string;
}

interface PinnedPostsProps {
  posts: PinnedPost[];
  isOwnProfile: boolean;
}

export const PinnedPosts = ({ posts, isOwnProfile }: PinnedPostsProps) => {
  if (posts.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pin className="h-5 w-5 text-primary" />
          Pinned Posts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <Link 
              key={post.id} 
              to={`/mentorship/post/${post.id}`}
              className="block group"
            >
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Pin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                    <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {post.content}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.upvotes}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {post.comment_count}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
