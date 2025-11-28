import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Calendar, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StoryArticle } from "@/hooks/useStories";

interface StoryCardProps {
  article: StoryArticle;
}

export const StoryCard = ({ article }: StoryCardProps) => {
  const publishedDate = article.published_at ? new Date(article.published_at) : new Date(article.created_at);
  const timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true });

  return (
    <Link to={`/stories/${article.slug}`} className="block group">
      <Card className="overflow-hidden h-full hover:shadow-lg transition-all duration-300 hover-lift">
        {/* Banner Image */}
        {article.banner_image_url && (
          <div className="aspect-video overflow-hidden bg-muted">
            <img
              src={article.banner_image_url}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        <CardContent className="p-6">
          {/* Title */}
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h3>
          
          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-muted-foreground mb-4 line-clamp-2">
              {article.excerpt}
            </p>
          )}
          
          {/* Metadata */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{timeAgo}</span>
              </div>
            </div>
          </div>
          
          {/* Hashtags */}
          {article.hashtags && article.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {article.hashtags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs flex items-center gap-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/stories?tag=${encodeURIComponent(tag)}`;
                  }}
                >
                  <Hash className="w-3 h-3" />
                  {tag.replace('#', '')}
                </Badge>
              ))}
              {article.hashtags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{article.hashtags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

