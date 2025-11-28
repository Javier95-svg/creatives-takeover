import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { StoryCard } from "@/components/stories/StoryCard";
import { useStories } from "@/hooks/useStories";
import { StoryArticle } from "@/hooks/useStories";
import { Badge } from "@/components/ui/badge";
import { Hash, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Stories = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get("tag");
  const { fetchStories, loading, isAdmin } = useStories();
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryArticle[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    const loadStories = async () => {
      const data = await fetchStories(selectedTag || undefined);
      setStories(data);
      
      // Extract unique tags from all stories
      const tagsSet = new Set<string>();
      data.forEach((story) => {
        story.hashtags?.forEach((tag) => {
          tagsSet.add(tag);
        });
      });
      setAllTags(Array.from(tagsSet).sort());
    };

    loadStories();
  }, [selectedTag, fetchStories]);

  const clearTagFilter = () => {
    setSearchParams({});
  };

  return (
    <>
      <Helmet>
        <title>Stories | Creatives Takeover</title>
        <meta
          name="description"
          content="Read stories, insights, and articles from Creatives Takeover. Learn about entrepreneurship, startups, marketing, fundraising, and more."
        />
        <meta
          name="keywords"
          content="startups, entrepreneurship, marketing, fundraising, business stories, creative insights"
        />
        <meta property="og:title" content="Stories | Creatives Takeover" />
        <meta
          property="og:description"
          content="Discover stories, insights, and articles about turning ideas into reality."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="/stories" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2">Stories</h1>
                  <p className="text-muted-foreground text-lg">
                    Insights, tips, and stories about building and growing your business
                  </p>
                </div>
                {isAdmin && (
                  <Link to="/stories/admin/new">
                    <Button>Create Story</Button>
                  </Link>
                )}
              </div>

              {/* Tag Filter */}
              {selectedTag && (
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    <Hash className="w-4 h-4 mr-1 inline" />
                    {selectedTag}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearTagFilter}
                    className="h-7 px-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Popular Tags */}
              {allTags.length > 0 && !selectedTag && (
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-sm text-muted-foreground mr-2">Popular tags:</span>
                  {allTags.slice(0, 10).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => setSearchParams({ tag: tag.replace('#', '') })}
                    >
                      <Hash className="w-3 h-3 mr-1" />
                      {tag.replace('#', '')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Stories Grid */}
            {loading ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Loading stories...</p>
              </div>
            ) : stories.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg mb-4">
                  {selectedTag
                    ? `No stories found with tag "${selectedTag}"`
                    : "No stories published yet"}
                </p>
                {selectedTag && (
                  <Button variant="outline" onClick={clearTagFilter}>
                    Clear filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((story, index) => (
                  <StoryCard 
                    key={story.id} 
                    article={story} 
                    featured={index === 0}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Stories;

