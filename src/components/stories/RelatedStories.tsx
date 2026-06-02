import { useEffect, useState, useMemo } from "react";
import { StoryCard } from "@/components/stories/StoryCard";
import { useStories, StoryArticle } from "@/hooks/useStories";
import { normalizeHashtag } from "@/utils/hashtagUtils";

interface RelatedStoriesProps {
  currentStory: StoryArticle;
  limit?: number;
}

export const RelatedStories = ({ currentStory, limit = 4 }: RelatedStoriesProps) => {
  const { fetchStories, loading } = useStories();
  const [allStories, setAllStories] = useState<StoryArticle[]>([]);

  useEffect(() => {
    const loadStories = async () => {
      try {
        const stories = await fetchStories();
        setAllStories(stories);
      } catch (error) {
        console.error('Error loading stories for related content:', error);
      }
    };

    loadStories();
  }, [fetchStories]);

  // Pick related stories by shared hashtags, then backfill with the most recent
  // other articles so the section always offers at least `limit` options.
  const relatedStories = useMemo(() => {
    const candidates = allStories.filter((story) => story.id !== currentStory.id);
    const currentTags = (currentStory.hashtags ?? []).map((tag) => normalizeHashtag(tag).toLowerCase());

    const byTagRelevance = candidates
      .map((story) => {
        const storyTags = (story.hashtags ?? []).map((tag) => normalizeHashtag(tag).toLowerCase());
        const sharedTags = currentTags.filter((tag) => storyTags.includes(tag));
        return { story, score: sharedTags.length * 10 };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.story);

    // Backfill with the remaining most-recent stories (allStories is already
    // sorted newest-first by fetchStories) until we reach the limit.
    const selected = [...byTagRelevance];
    const selectedIds = new Set(selected.map((story) => story.id));
    for (const story of candidates) {
      if (selected.length >= limit) break;
      if (!selectedIds.has(story.id)) {
        selected.push(story);
        selectedIds.add(story.id);
      }
    }

    return selected.slice(0, limit);
  }, [allStories, currentStory, limit]);

  if (loading || relatedStories.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-12 border-t">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Related Stories</h2>
        <p className="text-muted-foreground">
          Explore more stories on similar topics
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {relatedStories.map((story) => (
          <StoryCard key={story.id} article={story} showHashtags={false} />
        ))}
      </div>
    </section>
  );
};

export default RelatedStories;

