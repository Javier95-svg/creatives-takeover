import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Hash, Linkedin } from "lucide-react";
import { LinkedInPostEmbed } from "./LinkedInPostEmbed";

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
  const publishedDate = new Date();
  const fullDate = publishedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="w-full">
      <Card className="overflow-hidden h-full border-border bg-card">
        {/* LinkedIn Embed Preview */}
        {linkedinPostUrl ? (
          <LinkedInPostEmbed
            url={linkedinPostUrl}
            title={title}
            excerpt={excerpt}
            hashtags={hashtags}
          />
        ) : (
          <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <div className="text-center p-6">
              <Linkedin className="w-12 h-12 mx-auto mb-4 text-[#0077b5]" />
              <h3 className="font-bold text-lg mb-2">{title || 'Untitled Article'}</h3>
              {excerpt && (
                <p className="text-sm text-muted-foreground">{excerpt}</p>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                Add a LinkedIn post URL to see the preview
              </p>
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
              {status && (
                <Badge variant={status === 'published' ? 'default' : 'secondary'}>
                  {status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                </Badge>
              )}
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
        </CardContent>
      </Card>
    </div>
  );
};

