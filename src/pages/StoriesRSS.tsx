import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useStories } from "@/hooks/useStories";
import { generateRSSFeedFromStories } from "@/utils/generateRSSFeed";

/**
 * RSS Feed Page Component
 * Generates and serves RSS feed for stories
 * Note: In production, this should ideally be handled server-side for proper content-type headers
 */
const StoriesRSS = () => {
  const { fetchStories } = useStories();
  const [rssContent, setRssContent] = useState<string>("");

  useEffect(() => {
    const generateFeed = async () => {
      try {
        const stories = await fetchStories();
        const baseUrl = window.location.origin;
        const feed = await generateRSSFeedFromStories(stories, baseUrl);
        setRssContent(feed);
      } catch (error) {
        console.error('Error generating RSS feed:', error);
        setRssContent('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title><description>Failed to generate RSS feed</description></channel></rss>');
      }
    };

    void generateFeed();
  }, [fetchStories]);

  // Return XML content with proper meta tags
  return (
    <>
      <Helmet>
        <meta httpEquiv="Content-Type" content="application/rss+xml; charset=utf-8" />
      </Helmet>
      <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px', margin: 0, padding: '1rem' }}>
        {rssContent || 'Loading RSS feed...'}
      </pre>
    </>
  );
};

export default StoriesRSS;

