import { Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LinkedInPostEmbedProps {
  url: string;
  title?: string;
  excerpt?: string;
  hashtags?: string[];
  clickable?: boolean; // If true, the entire component is wrapped in a link
}

export const LinkedInPostEmbed = ({ url, title, excerpt, hashtags, clickable = false }: LinkedInPostEmbedProps) => {
  return (
    <div className="w-full border rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header with title and metadata */}
      {(title || excerpt || hashtags) && (
        <div className="p-4 border-b bg-muted/30">
          {title && (
            <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{title}</h3>
          )}
          {excerpt && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{excerpt}</p>
          )}
          {hashtags && hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {hashtags.slice(0, 3).map((tag, index) => (
                <span key={index} className="text-xs text-muted-foreground">
                  {tag.replace('#', '')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="min-h-[400px] flex items-center justify-center bg-muted/10">
        <div className="p-8 text-center">
          <Linkedin className="w-16 h-16 mb-4 text-[#0077b5] mx-auto" />
          <h3 className="text-lg font-semibold mb-2">LinkedIn Post</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md break-all">
            {url}
          </p>
          {!clickable && (
            <Button asChild variant="default" size="lg">
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Linkedin className="w-4 h-4" />
                View on LinkedIn
              </a>
            </Button>
          )}
          {clickable && (
            <p className="text-xs text-muted-foreground">
              Click anywhere to view on LinkedIn
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Preview rendering is handled natively to avoid third-party script errors.
          </p>
        </div>
      </div>
    </div>
  );
};

