import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { StoryCard } from "@/components/stories/StoryCard";
import { useStories, StoryArticle } from "@/hooks/useStories";
import { Badge } from "@/components/ui/badge";
import { Hash, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBreadcrumbSchema } from "@/components/SEO";
import { normalizeHashtag, slugifyTag } from "@/utils/hashtagUtils";

const StoryTagPage = () => {
  const { tagSlug } = useParams<{ tagSlug: string }>();
  const navigate = useNavigate();
  const { fetchStories, loading } = useStories();
  const [stories, setStories] = useState<StoryArticle[]>([]);
  const [tagDisplay, setTagDisplay] = useState<string>("");

  useEffect(() => {
    const loadStories = async () => {
      if (!tagSlug) {
        navigate("/stories", { replace: true });
        return;
      }

      // Try to find the tag by matching slugified versions
      // First, try the tagSlug as-is (without #)
      // We need to find the actual hashtag format used in the database
      let matchingTag = `#${tagSlug}`;
      
      // Fetch all stories to find the actual tag format
      const allStories = await fetchStories();
      const allTags = new Set<string>();
      allStories.forEach((story) => {
        story.hashtags?.forEach((tag) => {
          allTags.add(tag);
        });
      });

      // Find the tag that matches our slug
      const normalizedSlug = tagSlug.toLowerCase().replace(/-/g, '');
      for (const tag of allTags) {
        const tagSlugified = slugifyTag(tag);
        if (tagSlugified === tagSlug || slugifyTag(tag).toLowerCase() === normalizedSlug) {
          matchingTag = tag;
          break;
        }
      }

      // Set display name (without #)
      setTagDisplay(matchingTag.replace(/^#+/, ''));

      // Fetch stories with this tag
      const tagWithoutHash = matchingTag.replace(/^#+/, '');
      const filteredStories = await fetchStories(tagWithoutHash);
      setStories(filteredStories);
    };

    loadStories();
  }, [tagSlug, fetchStories, navigate]);

  if (!tagSlug) {
    return null;
  }

  const tagUrl = `/stories/tags/${tagSlug}`;
  const baseUrl = window.location.origin;
  const fullUrl = `${baseUrl}${tagUrl}`;
  
  // Create description based on stories
  const description = stories.length > 0
    ? `Discover ${stories.length} ${stories.length === 1 ? 'story' : 'stories'} tagged with ${tagDisplay}. Explore insights, articles, and posts about ${tagDisplay} from Creatives Takeover.`
    : `Explore stories and articles tagged with ${tagDisplay} from Creatives Takeover.`;

  // CollectionPage schema for tag archive
  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${tagDisplay} Stories | Creatives Takeover`,
    "description": description,
    "url": `https://creatives-takeover.com${tagUrl}`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": stories.length,
      "itemListElement": stories.map((story, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Article",
          "@id": `https://creatives-takeover.com/stories/${story.slug}`,
          "headline": story.title,
          "description": story.excerpt || story.title,
          "url": `https://creatives-takeover.com/stories/${story.slug}`
        }
      }))
    }
  };

  const structuredData = [
    collectionPageSchema,
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Stories', url: '/stories' },
      { name: `${tagDisplay} Stories`, url: tagUrl }
    ])
  ];

  return (
    <>
      <Helmet>
        <title>{tagDisplay} Stories | Creatives Takeover</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={`${tagDisplay}, stories, articles, insights, creatives takeover`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${tagDisplay} Stories | Creatives Takeover`} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:site_name" content="Creatives Takeover" />
        <meta property="og:locale" content="en_US" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${tagDisplay} Stories | Creatives Takeover`} />
        <meta name="twitter:description" content={description} />
        
        <link rel="canonical" href={fullUrl} />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-7xl">
            {/* Back Button */}
            <div className="mb-6">
              <Button variant="ghost" asChild>
                <Link to="/stories" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Stories
                </Link>
              </Button>
            </div>

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Hash className="w-6 h-6 text-muted-foreground" />
                <h1 className="text-3xl md:text-4xl font-bold">
                  Stories Tagged: {tagDisplay}
                </h1>
              </div>
              {stories.length > 0 && (
                <p className="text-muted-foreground">
                  Found {stories.length} {stories.length === 1 ? 'story' : 'stories'}
                </p>
              )}
            </div>

            {/* Stories Grid */}
            {loading ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Loading stories...</p>
              </div>
            ) : stories.length === 0 ? (
              <div className="text-center py-16">
                <Hash className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-lg mb-4">
                  No stories found with tag "{tagDisplay}"
                </p>
                <Button variant="outline" asChild>
                  <Link to="/stories">Browse All Stories</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((story) => (
                  <StoryCard key={story.id} article={story} />
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

export default StoryTagPage;
