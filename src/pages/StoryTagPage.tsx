import { useEffect, useState, useRef } from "react";
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
    if (!tagSlug) {
      navigate("/stories", { replace: true });
      return;
    }

    // Create new AbortController for this effect
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadStories = async () => {
      try {
        // Try to reconstruct tag from slug - try multiple variations
        const possibleTags = [
          `#${tagSlug}`,
          `#${tagSlug.replace(/-/g, '')}`,
          tagSlug,
          tagSlug.replace(/-/g, ''),
        ].map(t => normalizeHashtag(t));

        // Fetch unique hashtags list (only fetches hashtags column, not full stories)
        const allTagsData = await fetchUniqueHashtags();
        
        if (signal.aborted) return;

        // Find matching tag from the list
        let matchingTag = possibleTags[0]; // Default fallback
        
        for (const tagData of allTagsData) {
          const normalizedTag = normalizeHashtag(tagData.tag).toLowerCase();
          const normalizedSlug = tagSlug.toLowerCase().replace(/-/g, '');
          
          // Check if tag matches slug
          if (slugifyTag(tagData.tag) === tagSlug || 
              normalizedTag === normalizedSlug ||
              normalizedTag.replace(/^#+/, '') === normalizedSlug) {
            matchingTag = tagData.tag;
            break;
          }
        }

        // Set display name (without #)
        const displayName = matchingTag.replace(/^#+/, '');
        if (!signal.aborted) {
          setTagDisplay(displayName);
        }

        // Fetch stories with this tag directly
        const tagWithoutHash = matchingTag.replace(/^#+/, '');
        const filteredStories = await fetchStories(tagWithoutHash);
        
        if (!signal.aborted) {
          setStories(filteredStories);
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error('Error loading tag stories:', error);
          navigate("/stories", { replace: true });
        }
      }
    };

    loadStories();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [tagSlug, fetchStories, fetchUniqueHashtags, navigate]);

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
