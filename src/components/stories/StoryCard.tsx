import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Calendar, Hash, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StoryArticle } from "@/hooks/useStories";
import { PromoImageGenerator } from "./PromoImageGenerator";

interface StoryCardProps {
  article: StoryArticle;
  featured?: boolean;
}

export const StoryCard = ({ article, featured = false }: StoryCardProps) => {
  const publishedDate = article.published_at 
    ? new Date(article.published_at) 
    : new Date(article.created_at);
  const timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true });
  const fullDate = publishedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate read time (rough estimate: 200 words per minute)
  const wordCount = article.body_content.split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Get primary hashtag for category
  const primaryTag = article.hashtags && article.hashtags.length > 0 
    ? article.hashtags[0].replace('#', '') 
    : null;

  return (
    <Link 
      to={`/stories/${article.slug}`} 
      className={`block group ${featured ? 'md:col-span-2' : ''}`}
    >
      <Card className="overflow-hidden h-full hover:shadow-xl transition-all duration-300 hover-lift border-border bg-card">
        {/* Promotional Preview Image - Always shown */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          <PromoImageGenerator 
            article={article}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Category Badge - Top Left */}
          {primaryTag && (
            <div className="absolute top-4 left-4">
              <Badge 
                variant="secondary" 
                className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
              >
                {primaryTag.toUpperCase()}
              </Badge>
            </div>
          )}
          
          {/* Title Overlay - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className={`font-bold text-white mb-2 group-hover:text-primary transition-colors ${
              featured ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'
            }`}>
              {article.title}
            </h3>
          </div>
        </div>
        
        <CardContent className="p-6">
          {/* Excerpt */}
          {article.excerpt && (
            <p className={`text-muted-foreground mb-4 line-clamp-2 ${
              featured ? 'text-base' : 'text-sm'
            }`}>
              {article.excerpt}
            </p>
          )}
          
          {/* Metadata Row */}
          <div className="flex items-center justify-between flex-wrap gap-3 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{fullDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{readTime} min read</span>
              </div>
            </div>
            <span className="text-xs opacity-70">{timeAgo}</span>
          </div>
          
          {/* Hashtags */}
          {article.hashtags && article.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              {article.hashtags.slice(0, featured ? 4 : 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/stories?tag=${encodeURIComponent(tag.replace('#', ''))}`;
                  }}
                >
                  <Hash className="w-3 h-3 mr-1" />
                  {tag.replace('#', '')}
                </Badge>
              ))}
              {article.hashtags.length > (featured ? 4 : 3) && (
                <Badge variant="outline" className="text-xs">
                  +{article.hashtags.length - (featured ? 4 : 3)}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
