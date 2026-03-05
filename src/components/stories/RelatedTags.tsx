import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";
import { useStories, StoryArticle } from "@/hooks/useStories";
import { normalizeHashtag, slugifyTag } from "@/utils/hashtagUtils";

interface RelatedTagsProps {
  currentTag: string;
  limit?: number;
}

export const RelatedTags = ({ currentTag, limit = 5 }: RelatedTagsProps) => {
  const navigate = useNavigate();
  const { fetchStories } = useStories();
  const [relatedTags, setRelatedTags] = useState<Array<{ tag: string; count: number }>>([]);

  useEffect(() => {
    const loadRelatedTags = async () => {
      if (!currentTag) return;

      try {
        // Fetch all stories with the current tag
        const normalizedCurrentTag = normalizeHashtag(currentTag).toLowerCase();
        const stories = await fetchStories(currentTag.replace(/^#+/, ''));

        if (stories.length === 0) {
          setRelatedTags([]);
          return;
        }

        // Count co-occurring hashtags
        const tagCounts = new Map<string, number>();
        
        stories.forEach((story: StoryArticle) => {
          if (story.hashtags && Array.isArray(story.hashtags)) {
            story.hashtags.forEach((tag) => {
              const normalized = normalizeHashtag(tag).toLowerCase();
              
              // Skip the current tag itself
              if (normalized !== normalizedCurrentTag && normalized) {
                const currentCount = tagCounts.get(normalized) || 0;
                tagCounts.set(normalized, currentCount + 1);
              }
            });
          }
        });

        // Convert to array, sort by count, and limit
        const related = Array.from(tagCounts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

        setRelatedTags(related);
      } catch (error) {
        console.error('Error loading related tags:', error);
        setRelatedTags([]);
      }
    };

    loadRelatedTags();
  }, [currentTag, fetchStories, limit]);

  if (relatedTags.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 border rounded-lg bg-muted/30">
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
        Related Topics
      </h3>
      <div className="flex flex-wrap gap-2">
        {relatedTags.map(({ tag, count }) => (
          <Badge
            key={tag}
            variant="outline"
            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => {
              const tagSlug = slugifyTag(tag);
              navigate(`/newspaper/tags/${tagSlug}`);
            }}
          >
            <Hash className="w-3 h-3 mr-1" />
            {tag.replace(/^#+/, '')}
            <span className="ml-1 text-xs opacity-70">({count})</span>
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default RelatedTags;
