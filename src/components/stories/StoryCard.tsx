import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Calendar, Hash, Linkedin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StoryArticle } from "@/hooks/useStories";
import { LinkedInPostEmbed } from "./LinkedInPostEmbed";

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

  // Get primary hashtag for category
  const primaryTag = article.hashtags && article.hashtags.length > 0 
    ? article.hashtags[0].replace('#', '') 
    : null;

  return (
    <Link 
      to={`/stories/${article.slug}`} 
      className={`block group ${featured ? 'md:col-span-2 lg:col-span-2' : ''}`}
    >
      <Card className="overflow-hidden h-full hover:shadow-xl transition-all duration-300 hover-lift border-border bg-card">
        {/* LinkedIn Embed or Fallback */}
        {article.linkedin_post_url ? (
          <div className="relative">
            <LinkedInPostEmbed
              url={article.linkedin_post_url}
              title={article.title}
              excerpt={article.excerpt || undefined}
              hashtags={article.hashtags}
            />
          </div>
        ) : (
          <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <div className="text-center p-6">
              <Linkedin className="w-12 h-12 mx-auto mb-4 text-[#0077b5]" />
              <h3 className="font-bold text-lg mb-2">{article.title}</h3>
              {article.excerpt && (
                <p className="text-sm text-muted-foreground">{article.excerpt}</p>
              )}
            </div>
          </div>
        )}
        
        <CardContent className="p-6">
          {/* Metadata Row */}
          <div className="flex items-center justify-between flex-wrap gap-3 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{fullDate}</span>
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
