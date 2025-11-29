import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";

interface StoryCardPreviewProps {
  title: string;
  excerpt?: string;
  hashtags: string[];
  bodyContent: string;
  bannerImageUrl?: string;
  linkedinPostUrl?: string;
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
  linkedinPostUrl,
  featured = false,
  status = 'draft',
}: StoryCardPreviewProps) => {
  return (
    <div className="w-full">
      <Card className="overflow-hidden h-full border-border bg-card rounded-lg">
        {/* Banner Image Section - Full Width at Top */}
        <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {bannerImageUrl ? (
            <img
              src={bannerImageUrl}
              alt={title || 'Article preview'}
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
                <p className="text-xs text-muted-foreground">
                  {bannerImageUrl ? 'Banner image will appear here' : 'Upload a banner image'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Card Body - Title, Excerpt, Hashtags */}
        <CardContent className="p-6">
          {/* Status Badge */}
          {status && (
            <Badge variant={status === 'published' ? 'default' : 'secondary'} className="mb-3">
              {status === 'published' ? 'PUBLISHED' : 'DRAFT'}
            </Badge>
          )}
          
          {/* Title */}
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {title || 'Untitled Article'}
          </h3>
          
          {/* Excerpt */}
          {excerpt && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
              {excerpt}
            </p>
          )}
          
          {/* Hashtags */}
          {hashtags && hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
        </CardContent>
      </Card>
    </div>
  );
};

