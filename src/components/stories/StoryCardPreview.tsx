import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Hash, Clock } from "lucide-react";
import { PromoImageGenerator } from "./PromoImageGenerator";
import { generatePromoImageDataURL } from "@/utils/generatePromoImage";

interface StoryCardPreviewProps {
  title: string;
  excerpt?: string;
  hashtags: string[];
  bodyContent: string;
  bannerImageUrl?: string;
  featured?: boolean;
  status?: 'draft' | 'published';
}

/**
 * Preview version of StoryCard for the admin editor
 * Shows how the article will appear in the Stories listing
 */
export const StoryCardPreview = ({
  title,
  excerpt,
  hashtags,
  bodyContent,
  bannerImageUrl,
  featured = false,
  status = 'draft',
}: StoryCardPreviewProps) => {
  // Create a mock article object for PromoImageGenerator
  const mockArticle = {
    id: 'preview',
    slug: 'preview',
    title: title || 'Untitled Article',
    banner_image_url: bannerImageUrl || null,
    body_content: bodyContent || '',
    excerpt: excerpt || null,
    hashtags: hashtags || [],
    author_id: 'preview',
    status,
    published_at: status === 'published' ? new Date().toISOString() : null,
    meta_title: null,
    meta_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const publishedDate = new Date();
  const fullDate = publishedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate read time
  const wordCount = bodyContent.split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Get primary hashtag for category
  const primaryTag = hashtags && hashtags.length > 0 
    ? hashtags[0].replace('#', '') 
    : null;

  return (
    <div className="w-full">
      <Card className="overflow-hidden h-full border-border bg-card">
        {/* Promotional Preview Image - Always shown */}
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          <PromoImageGenerator 
            article={mockArticle}
            className="w-full h-full object-cover"
          />
          
          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
          
          {/* Status Badge - Top Right */}
          <div className="absolute top-4 right-4 z-10">
            <Badge 
              variant={status === 'published' ? 'default' : 'secondary'}
              className="bg-white/25 backdrop-blur-md text-white border-white/40 shadow-lg"
            >
              {status === 'published' ? 'PUBLISHED' : 'DRAFT'}
            </Badge>
          </div>
          
          {/* Category Badge - Top Left */}
          {primaryTag && (
            <div className="absolute top-4 left-4 z-10">
              <Badge 
                variant="secondary" 
                className="bg-white/25 backdrop-blur-md text-white border-white/40 shadow-lg"
              >
                {primaryTag.toUpperCase()}
              </Badge>
            </div>
          )}
          
          {/* Title Overlay - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <h3 className={`font-bold text-white mb-2 drop-shadow-lg ${
              featured ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl'
            }`}>
              {title || 'Untitled Article'}
            </h3>
          </div>
        </div>
        
        <CardContent className="p-6">
          {/* Excerpt */}
          {excerpt && (
            <p className={`text-muted-foreground mb-4 line-clamp-2 ${
              featured ? 'text-base' : 'text-sm'
            }`}>
              {excerpt}
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
          </div>
          
          {/* Hashtags */}
          {hashtags && hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              {hashtags.slice(0, featured ? 4 : 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs"
                >
                  <Hash className="w-3 h-3 mr-1" />
                  {tag.replace('#', '')}
                </Badge>
              ))}
              {hashtags.length > (featured ? 4 : 3) && (
                <Badge variant="outline" className="text-xs">
                  +{hashtags.length - (featured ? 4 : 3)}
                </Badge>
              )}
            </div>
          )}
          
          {hashtags.length === 0 && !excerpt && (
            <div className="text-xs text-muted-foreground italic pt-4 border-t border-border">
              Add hashtags and excerpt to see them in the preview
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

