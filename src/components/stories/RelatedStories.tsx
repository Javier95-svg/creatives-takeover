import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { StoryCard } from "@/components/stories/StoryCard";
import { useStories, StoryArticle } from "@/hooks/useStories";
import { normalizeHashtag } from "@/utils/hashtagUtils";

interface RelatedStoriesProps {
  currentStory: StoryArticle;
  limit?: number;
}

export const RelatedStories = ({ currentStory, limit = 3 }: RelatedStoriesProps) => {
  const navigate = useNavigate();
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

  // Calculate related stories based on shared hashtags
  const relatedStories = useMemo(() => {
    if (!currentStory.hashtags || currentStory.hashtags.length === 0) {
      return [];
    }

    const currentTags = currentStory.hashtags.map(tag => normalizeHashtag(tag).toLowerCase());
    
    const scored = allStories
      .filter(story => story.id !== currentStory.id && story.linkedin_post_url)
      .map(story => {
        if (!story.hashtags || story.hashtags.length === 0) {
          return { story, score: 0, sharedTags: [] };
        }

        const storyTags = story.hashtags.map(tag => normalizeHashtag(tag).toLowerCase());
        const sharedTags = currentTags.filter(tag => storyTags.includes(tag));
        
        // Score based on number of shared tags (more shared tags = higher score)
        const score = sharedTags.length * 10;
        
        return { story, score, sharedTags };
      })
      .filter(item => item.score > 0) // Only stories with at least one shared tag
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(item => item.story);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedStories.map((story) => (
          <StoryCard key={story.id} article={story} />
        ))}
      </div>
    </section>
  );
};

export default RelatedStories;

