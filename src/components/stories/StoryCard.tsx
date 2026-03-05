import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";
import { StoryArticle } from "@/hooks/useStories";
import { useNavigate } from "react-router-dom";
import { slugifyTag } from "@/utils/hashtagUtils";

interface StoryCardProps {
  article: StoryArticle;
  featured?: boolean;
}

const StoryCardComponent = ({ article, featured = false }: StoryCardProps) => {
  const navigate = useNavigate();
  // Use LinkedIn URL if available, otherwise fallback to article detail page
  const linkUrl = article.linkedin_post_url || `/stories/${article.slug}`;
  const isExternalLink = !!article.linkedin_post_url;

  return (
    <a
      href={linkUrl}
      target={isExternalLink ? "_blank" : undefined}
      rel={isExternalLink ? "noopener noreferrer" : undefined}
      className={`block group ${featured ? 'md:col-span-2 lg:col-span-2' : ''}`}
    >
      <Card className="overflow-hidden h-full hover:shadow-md transition-all duration-300 hover:scale-[1.02] border-border bg-card rounded-lg">
        {/* Banner Image Section - Full Width at Top */}
        <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {article.banner_image_url ? (
            <img
              src={article.banner_image_url}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Hash className="w-8 h-8 text-primary/50" />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Card Body - Title, Excerpt, Hashtags */}
        <CardContent className="p-6">
          {/* Title */}
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          
          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {article.excerpt}
            </p>
          )}
          
          {/* Hashtags */}
          {article.hashtags && article.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.hashtags.slice(0, featured ? 4 : 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const tagSlug = slugifyTag(tag);
                    navigate(`/stories/tags/${tagSlug}`);
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
    </a>
  );
};

export const StoryCard = React.memo(StoryCardComponent);
