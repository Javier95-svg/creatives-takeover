import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";
import { StorySummary } from "@/hooks/useStories";
import { storageImageUrl, storageImageSrcSet } from "@/lib/storageImage";
import { Link, useNavigate } from "react-router-dom";
import { slugifyTag } from "@/utils/hashtagUtils";

interface StoryCardProps {
  article: StorySummary;
  featured?: boolean;
  showHashtags?: boolean;
}

const StoryCardComponent = ({ article, featured = false, showHashtags = true }: StoryCardProps) => {
  const navigate = useNavigate();
  // Always open the article in-platform (same tab) so reading and SEO stay on CT.
  const linkUrl = `/newspaper/${article.slug}`;
  // Resize without pre-cropping: the existing object-cover layout stays identical.
  // Leave animated/vector assets untouched rather than flattening their content.
  const resizeBanner = !!article.banner_image_url && !/\.(gif|svg)(?:[?#]|$)/i.test(article.banner_image_url);
  const imageOptions = { height: null, quality: 80 } as const;

  return (
    <Link
      to={linkUrl}
      className={`block group ${featured ? 'md:col-span-2 lg:col-span-2' : ''}`}
    >
      <Card className="overflow-hidden h-full hover:shadow-md transition-all duration-300 hover:scale-[1.02] border-border bg-card rounded-lg">
        {/* Banner Image Section - Full Width at Top */}
        <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {article.banner_image_url ? (
            <img
              key={article.banner_image_url}
              src={resizeBanner ? storageImageUrl(article.banner_image_url, { width: 480, ...imageOptions }) : article.banner_image_url}
              srcSet={resizeBanner ? storageImageSrcSet(article.banner_image_url, [160, 320, 480, 640], imageOptions) : undefined}
              sizes={featured ? '(min-width: 1024px) 66vw, (min-width: 768px) 90vw, 100vw' : '(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw'}
              alt={article.title}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // A transformation outage must not turn existing photos into broken cards.
                if (target.currentSrc.includes('/render/image/') && !target.dataset.originalFallback) {
                  target.dataset.originalFallback = 'true';
                  target.removeAttribute('srcset');
                  target.removeAttribute('sizes');
                  target.src = article.banner_image_url!;
                  return;
                }
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
          {showHashtags && article.hashtags && article.hashtags.length > 0 && (
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
                    navigate(`/newspaper/tags/${tagSlug}`);
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

export const StoryCard = React.memo(StoryCardComponent);
